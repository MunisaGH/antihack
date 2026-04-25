"""Adaptiv chat-based interview — Google Gemini (google-genai SDK).

Oqim:
1. `start_session(application)` — sessiya yaratadi, birinchi savolni generatsiya qiladi.
2. `stream_next_question(session)` — navbatdagi savolni streaming tarzida qaytaradi.
3. `submit_answer(session, answer)` — javobni saqlaydi, on-topic/off-topic tekshiradi.
4. `finalize(session)` — barcha javoblarni baholaydi, final ball qo'yadi.

Savollar soni: 10 ta (settings.AI_SETTINGS['INTERVIEW_MAX_QUESTIONS']).
Agar arizachi mavzudan chetga chiqsa — sessiya to'xtatiladi.
Savollar vakansiya darajasiga moslashadi (intern/junior/mid/senior).
"""

from __future__ import annotations

import json
import logging
from typing import Iterator, Optional

from django.conf import settings
from django.utils import timezone
from google import genai
from google.genai import types

from ..models import Application, InterviewSession, Vacancy

logger = logging.getLogger(__name__)


TERMINATE_MARKER = "[TERMINATE]"

# Ketma-ket off-topic javoblar soni — shu chegaraga yetganda terminate
OFF_TOPIC_STRIKES_LIMIT = 3


def _translate_interview_async(
    application_id: int, analysis: dict, source_lang: str
) -> None:
    """Intervyu tahlilini boshqa tilga background'da tarjima qiladi."""
    from ..models import Application
    from .ai_analysis_translate import AIAnalysisTranslator

    other_lang = "ru" if source_lang == "uz" else "uz"
    try:
        translator = AIAnalysisTranslator()
        translated = translator.translate_interview(analysis, other_lang)
    except Exception:
        logger.exception(f"Interview async translation failed for {application_id}")
        return

    try:
        app = Application.objects.get(id=application_id)
        translations = app.interview_analysis_translations or {}
        translations[other_lang] = translated
        app.interview_analysis_translations = translations
        app.save(update_fields=["interview_analysis_translations", "updated_at"])
    except Exception:
        logger.exception(
            f"Failed to save translated interview analysis for {application_id}"
        )


FINAL_EVAL_SCHEMA = {
    "type": "object",
    "properties": {
        "total_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "communication": {"type": "integer", "minimum": 0, "maximum": 100},
        "technical_depth": {"type": "integer", "minimum": 0, "maximum": 100},
        "problem_solving": {"type": "integer", "minimum": 0, "maximum": 100},
        "cultural_fit": {"type": "integer", "minimum": 0, "maximum": 100},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "recommendation": {"type": "string", "enum": ["hire", "maybe", "reject"]},
        "summary": {"type": "string"},
    },
    "required": ["total_score", "strengths", "weaknesses", "recommendation", "summary"],
}


ANSWER_CHECK_SCHEMA = {
    "type": "object",
    "properties": {
        "on_topic": {"type": "boolean"},
        "reason": {"type": "string"},
    },
    "required": ["on_topic"],
}


AI_DETECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "ai_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "reason": {"type": "string"},
    },
    "required": ["ai_score"],
}

# Qachon AI classifier'ni chaqiramiz — qisqa javoblarda AI'ga yubormaymiz (noise)
AI_DETECTION_MIN_CHARS = 120


def _lang_text(value, lang: str = "uz") -> str:
    if isinstance(value, dict):
        return value.get(lang) or value.get("uz") or ""
    return value if isinstance(value, str) else ""


def _determine_level(vacancy: Vacancy) -> str:
    """Vakansiyadan darajani aniqlash: intern / junior / mid / senior."""
    title = (
        _lang_text(vacancy.title, "uz").lower()
        + " "
        + _lang_text(vacancy.title, "ru").lower()
    )

    if any(k in title for k in ("intern", "стажер", "stajyor")):
        return "intern"
    if any(k in title for k in ("senior", "lead", "principal", "старший", "ведущий")):
        return "senior"
    if any(k in title for k in ("junior", "младший", "kichik")):
        return "junior"

    years = vacancy.experience_years or 0
    if years == 0:
        return "junior"
    if years <= 2:
        return "junior"
    if years <= 5:
        return "mid"
    return "senior"


LEVEL_LABELS = {
    "uz": {
        "intern": "Stajyor",
        "junior": "Junior",
        "mid": "O‘rta daraja",
        "senior": "Senior",
    },
    "ru": {
        "intern": "Стажёр",
        "junior": "Junior",
        "mid": "Middle",
        "senior": "Senior",
    },
}


class AIInterviewService:
    """Gemini asosida adaptiv chat suhbati."""

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.AI_SETTINGS["MODEL"]
        self.classifier_model = settings.AI_SETTINGS.get(
            "CLASSIFIER_MODEL", "gemini-2.5-flash-lite"
        )
        self.temperature = settings.AI_SETTINGS["TEMPERATURE"]
        self.max_questions = settings.AI_SETTINGS["INTERVIEW_MAX_QUESTIONS"]
        self.min_answer_length = settings.AI_SETTINGS.get(
            "HEURISTIC_MIN_ANSWER_LENGTH", 3
        )
        self.auto_pass_length = settings.AI_SETTINGS.get(
            "HEURISTIC_AUTO_PASS_LENGTH", 300
        )

    # ---------------------- Session lifecycle ----------------------
    def start_session(self, application: Application) -> InterviewSession:
        session, created = InterviewSession.objects.get_or_create(
            application=application
        )
        if not created and session.status == InterviewSession.Status.ACTIVE:
            return session
        session.messages = []
        session.questions_asked = 0
        session.off_topic_strikes = 0
        session.status = InterviewSession.Status.ACTIVE
        session.termination_reason = ""
        session.started_at = timezone.now()
        session.ended_at = None
        session.save()
        return session

    def stream_next_question(self, session: InterviewSession) -> Iterator[str]:
        """Navbatdagi savolni streaming tarzida yield qiladi.

        Agar sessiya tugagan bo'lsa (10 ta savol yoki to'xtatilgan) — hech narsa yield qilmaydi.
        """
        if session.status != InterviewSession.Status.ACTIVE:
            return
        if session.questions_asked >= self.max_questions:
            self._complete(session, reason="max_questions_reached")
            return

        lang = self._lang(session)
        system = self._system_prompt(session.application, lang)
        history = self._gemini_history(session)

        full_text = ""
        stream_failed = False
        try:
            stream = self.client.models.generate_content_stream(
                model=self.model,
                contents=history
                + [
                    types.Content(
                        role="user",
                        parts=[types.Part(text=self._next_turn_prompt(session, lang))],
                    )
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=self.temperature,
                ),
            )
            for chunk in stream:
                text = chunk.text or ""
                if not text:
                    continue
                full_text += text
                yield text
        except Exception:
            logger.exception("Gemini streaming failed")
            stream_failed = True

        if stream_failed:
            # Qisman yoki to'liq xato — saqlamaymiz. View error event yuboradi, user refresh qilib qayta ko'radi.
            raise RuntimeError("gemini_stream_failed")

        question = full_text.strip()
        session.messages.append(
            {
                "role": "assistant",
                "content": question,
                "at": timezone.now().isoformat(),
            }
        )
        session.questions_asked += 1
        session.save(update_fields=["messages", "questions_asked", "updated_at"])

    def submit_answer(
        self,
        session: InterviewSession,
        answer: str,
        typing_metrics: Optional[dict] = None,
    ) -> dict:
        """Arizachi javobini saqlaydi. Javob mavzudan chetda bo'lsa sessiyani to'xtatadi.

        Qaytaradi: {'ok': bool, 'terminated': bool, 'reason': str, 'completed': bool}
        """
        if session.status != InterviewSession.Status.ACTIVE:
            return {
                "ok": False,
                "terminated": True,
                "reason": "session_not_active",
                "completed": True,
            }

        answer = (answer or "").strip()
        if not answer:
            return {
                "ok": False,
                "terminated": False,
                "reason": "empty_answer",
                "completed": False,
            }

        lang = self._lang(session)
        last_question = self._last_assistant_message(session)

        # AI detection — javob faqat shubhali holatda flag qilinadi (ball kamaytirmaydi)
        ai_detection = None
        if typing_metrics is not None and last_question:
            try:
                ai_detection = self.detect_ai_answer(
                    last_question, answer, typing_metrics, lang
                )
            except Exception:
                logger.exception("AI detection failed")

        message_entry = {
            "role": "user",
            "content": answer,
            "at": timezone.now().isoformat(),
        }
        if ai_detection:
            message_entry["ai_detection"] = ai_detection

        session.messages.append(message_entry)
        session.save(update_fields=["messages", "updated_at"])

        # Off-topic tekshirish (oxirgi savol + javob juftligini)
        if last_question:
            check = self._check_on_topic(last_question, answer, lang)
            if check.get("on_topic", True):
                # Yaxshi javob — strikes reset
                if session.off_topic_strikes > 0:
                    session.off_topic_strikes = 0
                    session.save(update_fields=["off_topic_strikes", "updated_at"])
            else:
                # Strike oshiramiz, lekin darhol to'xtamaymiz
                session.off_topic_strikes += 1
                session.save(update_fields=["off_topic_strikes", "updated_at"])
                logger.info(
                    f"Off-topic strike {session.off_topic_strikes}/{OFF_TOPIC_STRIKES_LIMIT} "
                    f"for session {session.id}: {check.get('reason', '')}"
                )
                if session.off_topic_strikes >= OFF_TOPIC_STRIKES_LIMIT:
                    self._terminate(
                        session,
                        reason=check.get("reason", "off_topic_limit_reached"),
                    )
                    return {
                        "ok": True,
                        "terminated": True,
                        "reason": check.get("reason", "off_topic_limit_reached"),
                        "completed": True,
                    }

        # Savollar limiti to'lgan bo'lsa yakunlanadi
        if session.questions_asked >= self.max_questions:
            self._complete(session, reason="max_questions_reached")
            return {
                "ok": True,
                "terminated": False,
                "reason": "max_questions_reached",
                "completed": True,
            }

        return {"ok": True, "terminated": False, "reason": "", "completed": False}

    def finalize(self, session: InterviewSession) -> dict:
        """Barcha javoblarni baholaydi va sessiyaga final ball yozadi.

        Darajaga qarab ikki xil prompt:
        - intern/junior: YUMSHOQ — ko'p yordamchi (default yuqori ball)
        - mid/senior: QATTIQ — texnik chuqurlik va aniqlik talab qilinadi
        """
        if session.final_score and session.final_analysis:
            return session.final_analysis

        lang = self._lang(session)
        application = session.application
        level = _determine_level(application.vacancy)
        tier = "strict" if level in ("mid", "senior") else "soft"

        conversation = "\n\n".join(
            f"{'Interviewer' if m['role'] == 'assistant' else 'Candidate'}: {m['content']}"
            for m in session.messages
        )

        prompt, system = self._build_final_eval_prompt(
            lang=lang,
            tier=tier,
            level=level,
            application=application,
            conversation=conversation,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=self.temperature,
                    response_mime_type="application/json",
                    response_schema=FINAL_EVAL_SCHEMA,
                ),
            )
            analysis = json.loads(response.text)
        except Exception:
            logger.exception("Final evaluation failed")
            analysis = {
                "total_score": 0,
                "strengths": [],
                "weaknesses": ["AI baholash xatolik bilan yakunlandi"],
                "recommendation": "reject",
                "summary": "Avtomatik baholash mavjud emas — qo'lda ko'rib chiqing.",
            }

        session.final_score = analysis.get("total_score", 0)
        session.final_analysis = analysis
        if session.status == InterviewSession.Status.ACTIVE:
            session.status = InterviewSession.Status.COMPLETED
            session.ended_at = timezone.now()
        session.save()

        application.interview_score = session.final_score
        application.interview_analysis = analysis

        # Asl tilni darhol saqlaymiz — user finalize natijasini kutmaydi.
        application.interview_analysis_translations = {lang: analysis}
        application.save(
            update_fields=[
                "interview_score",
                "interview_analysis",
                "interview_analysis_translations",
                "updated_at",
            ]
        )

        # Boshqa tilga tarjimani BACKGROUND thread da bajaramiz — blocking emas.
        import threading

        threading.Thread(
            target=_translate_interview_async,
            args=(application.id, analysis, lang),
            daemon=True,
        ).start()

        return analysis

    # ---------------------- Internals ----------------------
    def _lang(self, session: InterviewSession) -> str:
        lang = getattr(session.application, "user_language", "uz") or "uz"
        return lang if lang in ("uz", "ru") else "uz"

    def _last_assistant_message(self, session: InterviewSession) -> Optional[str]:
        for m in reversed(session.messages[:-1]):
            if m["role"] == "assistant":
                return m["content"]
        return None

    def _gemini_history(self, session: InterviewSession) -> list:
        """Gemini Content formatida konversatsiya tarixi."""
        history = []
        for m in session.messages:
            role = "model" if m["role"] == "assistant" else "user"
            history.append(
                types.Content(role=role, parts=[types.Part(text=m["content"])])
            )
        return history

    def _system_prompt(self, application: Application, lang: str) -> str:
        vacancy = application.vacancy
        level = _determine_level(vacancy)
        level_label = LEVEL_LABELS[lang][level]

        title = _lang_text(vacancy.title, lang)
        description = _lang_text(vacancy.description, lang)
        requirements = _lang_text(vacancy.requirements, lang)
        resume_excerpt = (application.resume_text or "")[:1500]

        if lang == "uz":
            return f"""Siz professional suhbatdorsiz. Vakansiya va arizachining rezyumesi asosida {level_label} darajasidagi adaptiv suhbat o'tkazasiz.

**QOIDALAR:**
1. Har safar FAQAT BITTA savol bering, qisqa va aniq.
2. Savollar darajasi: {level_label} — qiyinlikni shu darajaga moslashtiring.
3. Keyingi savol oldingi javobdan kelib chiqsin — teranlikni tekshiring, bo'shliqlarni to'ldiring.
4. Mavzu doirasida qoling: vakansiya talablari va rezyumega bog'liq.
5. Jami {self.max_questions} ta savol beriladi. Har bir savolda progresni his qiling.
6. Kirish so'zlari, tushuntirishlar va izohlar yozmang — faqat savol matnini qaytaring.

**VAKANSIYA:**
Lavozim: {title}
Tavsif: {description}
Talablar: {requirements}

**REZYUME (qisqartirilgan):**
{resume_excerpt}

Javobingizni faqat O'zbek tilida yozing."""

        return f"""Вы профессиональный интервьюер. Проводите адаптивное собеседование уровня {level_label} на основе вакансии и резюме кандидата.

**ПРАВИЛА:**
1. Задавайте ТОЛЬКО ОДИН вопрос за раз, краткий и конкретный.
2. Уровень сложности: {level_label} — адаптируйте вопросы к этому уровню.
3. Следующий вопрос должен опираться на предыдущий ответ — проверяйте глубину, заполняйте пробелы.
4. Оставайтесь в рамках темы: требования вакансии и резюме.
5. Всего будет задано {self.max_questions} вопросов. Чувствуйте прогресс.
6. Не пишите вступлений, пояснений или комментариев — возвращайте только текст вопроса.

**ВАКАНСИЯ:**
Должность: {title}
Описание: {description}
Требования: {requirements}

**РЕЗЮМЕ (сокращённо):**
{resume_excerpt}

Отвечайте только на русском языке."""

    def _next_turn_prompt(self, session: InterviewSession, lang: str) -> str:
        """Gemini ga navbatdagi harakat uchun ichki ishora."""
        remaining = self.max_questions - session.questions_asked
        if not session.messages:
            return (
                "Suhbatni boshlang. Birinchi savolni bering."
                if lang == "uz"
                else "Начните собеседование. Задайте первый вопрос."
            )
        return (
            f"Keyingi savolni bering. Qolgan savollar soni: {remaining}."
            if lang == "uz"
            else f"Задайте следующий вопрос. Осталось вопросов: {remaining}."
        )

    def _heuristic_on_topic(self, answer: str) -> Optional[dict]:
        """AI chaqirmasdan tez qaror. None qaytarsa AI tekshiruv kerak."""
        stripped = (answer or "").strip()
        if len(stripped) < self.min_answer_length:
            return {"on_topic": False, "reason": "empty_or_too_short"}
        # Takrorlanuvchi belgilar (asdfgh, ........, ...) — noma'noviy
        unique_chars = len(set(stripped.lower()))
        if unique_chars < 3 and len(stripped) > 4:
            return {"on_topic": False, "reason": "repeated_characters"}
        words = stripped.split()
        # Yumshoq auto-pass: 6+ so'z bo'lsa ko'pincha mavzu doirasida
        if len(words) >= 6 and len(stripped) >= 30:
            return {"on_topic": True, "reason": "heuristic_short_substantive"}
        # Uzun va ma'nodor — AI ga yubormaymiz, qabul qilamiz
        if len(stripped) >= self.auto_pass_length and len(words) >= 10:
            return {"on_topic": True, "reason": "heuristic_long_substantive"}
        return None

    def _check_on_topic(self, question: str, answer: str, lang: str) -> dict:
        """Avvalo heuristik, keyin AI orqali tekshirish — faqat aniq buzilishlarda to'xtatadi."""
        # Heuristik qaror — AI chaqirmaymiz
        heuristic = self._heuristic_on_topic(answer)
        if heuristic is not None:
            return heuristic
        # AI tekshiruv kerak — tezkor flash-lite model
        if lang == "uz":
            prompt = f"""Savol: {question}

Javob: {answer}

Siz juda liberal suhbat moderatorisiz. FAQAT quyidagi uch holatda on_topic=false qaytaring:

1. **Bo'sh yoki tasodifiy matn** — misol: "asdfgh", "........", bitta harfdan iborat javob, yoki umuman ma'nosiz belgilar to'plami.
2. **So'kinish, haqorat, spam yoki reklama** — yomon so'zlar, takrorlanuvchi belgilar, reklama matnlari.
3. **Mavzuga butunlay aloqasi yo'q** — misol: texnik savolga "Men ovqatni yaxshi ko'raman" deb javob berish, yoki nomzod siyosat haqida gapira boshlashi.

QUYIDAGILARNING HAMMASI **on_topic=true** (MUVOFIQ):
- Nomzod savolda aytilgandan **boshqa texnologiya, usul, yondashuv, til, freymvork yoki vosita** ishlatganini aytsa. Har qanday alternativa — bu ham javob.
- Nomzod "bilmayman", "ishlatmaganman", "tajribam yo'q" deb aytsa — bu halol va tushunchali javob.
- Qisqa, lekin mavzuga aloqador javob.
- Grammatik xatolar, jargon, sodda til, aralash til (kiril+lotin).
- Bir qismiga javob bersa (to'liq bo'lmasa) — bu ham mos.
- Nomzod o'z tajribasini aytadi, lekin savoldagi aynan texnologiyaga mos kelmasa.

Umumiy qoida: **AGAR JAVOB SUHBAT KONTEKSTIDA MAZMUNLI bo'lsa — on_topic=true.** Shubhali barcha holatlarda on_topic=true qo'ying."""
            system = (
                "Siz juda liberal suhbat moderatorisiz. Vazifangiz faqat aniq buzuvchilarni "
                "(spam, gibberish, haqorat, butunlay boshqa mavzu) to'sib qolish. Nomzodning "
                "texnik yondashuvi, tanlovi, yoki tajriba darajasi noto'g'ri javob sababi BO'LA OLMAYDI."
            )
        else:
            prompt = f"""Вопрос: {question}

Ответ: {answer}

Вы очень либеральный модератор собеседования. Ставьте on_topic=false ТОЛЬКО в трёх случаях:

1. **Пустой или случайный текст** — например: "asdfgh", "........", один символ, бессмысленный набор знаков.
2. **Оскорбления, спам, реклама** — грубые слова, повторяющиеся символы, рекламный текст.
3. **Совершенно не по теме** — например: на технический вопрос "я люблю еду", или разговор о политике.

ВСЁ СЛЕДУЮЩЕЕ — **on_topic=true** (подходит):
- Кандидат использовал **другую технологию, метод, подход, язык, фреймворк или инструмент**, чем в вопросе. Любая альтернатива — это тоже ответ.
- Кандидат сказал "не знаю", "не использовал", "нет опыта" — это честный и содержательный ответ.
- Короткий, но по теме ответ.
- Грамматические ошибки, жаргон, простой язык, смешанная лексика.
- Частичный ответ (не полный) — тоже подходит.
- Кандидат рассказывает свой опыт, даже если он не совпадает с конкретной технологией в вопросе.

Общее правило: **ЕСЛИ ОТВЕТ ИМЕЕТ СМЫСЛ В КОНТЕКСТЕ ДИАЛОГА — on_topic=true.** При любых сомнениях ставьте true."""
            system = (
                "Вы очень либеральный модератор. Ваша задача — блокировать только явные нарушения "
                "(спам, бессмыслица, оскорбления, совершенно другая тема). Технический выбор "
                "кандидата, его подход или уровень опыта НЕ являются основанием для блокировки."
            )

        try:
            # Tezkor tasniflash modeli — alohida quota pool
            response = self.client.models.generate_content(
                model=self.classifier_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=ANSWER_CHECK_SCHEMA,
                ),
            )
            return json.loads(response.text)
        except Exception:
            logger.exception("On-topic check failed")
            return {"on_topic": True}

    # ---------------------- AI-generated answer detection ----------------------
    def detect_ai_answer(
        self, question: str, answer: str, typing_metrics: dict, lang: str
    ) -> dict:
        """Javob AI tomonidan yozilganmi aniqlash.

        Heuristic (client metrics) + Gemini Flash-Lite classifier.
        Score 0-100: 0=inson yozgan, 100=aniq AI.
        """
        answer = (answer or "").strip()
        factors: list[str] = []
        heuristic_score = 0

        paste_count = int(typing_metrics.get("paste_count") or 0)
        total_time_ms = int(typing_metrics.get("total_time_ms") or 0)
        chars_per_sec = float(typing_metrics.get("chars_per_sec") or 0.0)

        answer_len = len(answer)

        if paste_count > 0 and answer_len > 80:
            heuristic_score += 40
            factors.append("pasted")

        # Odatiy yozish tezligi — 3-7 char/sec. 20+ juda tez (AI paste)
        if chars_per_sec >= 25:
            heuristic_score += 35
            factors.append("typing_too_fast")
        elif chars_per_sec >= 15 and answer_len > 150:
            heuristic_score += 20
            factors.append("typing_fast")

        # 3 sek'da 200+ belgi
        if total_time_ms > 0 and total_time_ms < 3000 and answer_len > 200:
            heuristic_score += 25
            if "typing_too_fast" not in factors:
                factors.append("suspicious_instant")

        # AI classifier — faqat yetarlicha uzun javoblarda
        ai_score = 0
        ai_reason = ""
        if answer_len >= AI_DETECTION_MIN_CHARS:
            ai_score, ai_reason = self._classify_ai_content(question, answer, lang)
            if ai_score >= 70:
                factors.append("ai_classifier")

        combined = max(heuristic_score, ai_score)
        if heuristic_score and ai_score >= 60:
            combined = min(100, combined + 10)

        return {
            "suspicion_score": int(max(0, min(100, combined))),
            "factors": factors,
            "ai_classifier_score": int(ai_score),
            "ai_classifier_reason": ai_reason[:200],
            "typing_metrics": {
                "paste_count": paste_count,
                "total_time_ms": total_time_ms,
                "chars_per_sec": round(chars_per_sec, 1),
            },
        }

    def _classify_ai_content(
        self, question: str, answer: str, lang: str
    ) -> tuple[int, str]:
        """Gemini Flash-Lite bilan javob AI-generated yoki yo'qligini baholaydi."""
        if lang == "uz":
            prompt = f"""Savol: {question[:300]}

Javob: {answer[:1200]}

Bu javob ChatGPT/Claude kabi AI yordamida yozilganmi? Quyidagi belgilarni tekshiring:
- Juda rasmiy, sovuq, "uslubli" til
- Idealga yaqin tuzilish (1-2-3 nomerlangan, markdown-ga o'xshash formatting)
- Shaxsiy tajribasiz umumiy ensiklopedik javoblar
- Ingliz tili so'zlari yoki tuzilmalari (agar javob UZ bo'lsa)
- "Men" so'zlari juda kam — shaxsiy tajriba yo'q
- O'zbek tilida odatda bo'lmaydigan iboralar (tarjima qilingan kabi)

Lekin bu EMAS:
- Oddiy uzun javob
- Grammatik to'g'ri yozish
- Mavzuga chuqur javob

Faqat aniq belgilar bo'lsa yuqori ball. Shubha — past ball.

ai_score: 0-100 (0=aniq inson, 100=aniq AI)."""
            system = (
                "Siz javob AI tomonidan yozilganmi baholovchi mutaxassissiz. "
                "Ehtiyotkor bo'ling — noto'g'ri shubha solmang."
            )
        else:
            prompt = f"""Вопрос: {question[:300]}

Ответ: {answer[:1200]}

Был ли этот ответ написан с помощью AI (ChatGPT/Claude)? Признаки:
- Слишком формальный, "стилизованный" язык
- Идеальная структура (нумерация 1-2-3, markdown)
- Общие энциклопедические ответы без личного опыта
- Слишком мало "я" — нет личного опыта
- Переведённые конструкции

НЕ признаки:
- Просто длинный ответ
- Грамотное письмо
- Глубокий ответ

Высокий балл только при явных признаках.

ai_score: 0-100."""
            system = (
                "Вы оцениваете, был ли ответ написан AI. Будьте осторожны."
            )

        try:
            response = self.client.models.generate_content(
                model=self.classifier_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=AI_DETECTION_SCHEMA,
                ),
            )
            data = json.loads(response.text)
            return int(data.get("ai_score", 0)), data.get("reason", "")
        except Exception:
            logger.exception("AI detection classifier failed")
            return 0, ""

    # ---------------------- Finalize prompt tiers ----------------------
    @staticmethod
    def _build_final_eval_prompt(
        lang: str,
        tier: str,
        level: str,
        application: Application,
        conversation: str,
    ) -> tuple[str, str]:
        """Darajaga qarab soft yoki strict baholash prompt'ini qaytaradi."""
        title = _lang_text(application.vacancy.title, lang)
        resume = (application.resume_text or "")[:1500]
        level_label = LEVEL_LABELS[lang][level]

        if lang == "uz":
            header = f"""Quyidagi suhbat transkriptini baholang.

**Vakansiya:** {title}
**Daraja:** {level_label}
**Rezyume (qisqartirilgan):** {resume}

**Transkript:**
{conversation}
"""
            if tier == "strict":
                rubric = """
**Baholash yo'riqnomasi (QAT'IY VA PROFESSIONAL — Mid/Senior uchun):**
Bu vakansiya katta tajriba va chuqur bilim talab qiladi. Nomzod aynan shu darajada bo'lishini tekshiring.

- **Texnik chuqurlik MUHIM.** Yuzaki javoblar past ball olishi kerak.
- **Konkret misol va raqamlar** — tajriba haqida aniq misollar kutilgan (loyiha nomi, natija, muammo-yechim).
- **Muammolarni tushunish** — yuzaki yondashuv emas, sabab-oqibatni tushunishi kerak.
- "Bilmayman" — bu darajada tez-tez ishlatilmasligi kerak; junior uchun OK, lekin senior uchun ball kamaytirish sababi.
- **Qisman javob** — qisman ball, to'liq 80+ ball faqat to'liq va aniq javob uchun.
- **Mavhum gaplar** ("biz hamkorlikda ishladik", "muvaffaqiyatli qildim") — konkret bo'lmasa, ball kamaytirish.
- **Agar nomzod o'zi boshqa texnologiya ishlatgan bo'lsa** — o'sha texnologiyada mukammal bilish kutiladi.

**Ball diapazoni (QAT'IY):**
- 85-100: A'lo — barcha savollarga chuqur, aniq, misollar bilan javob bergan
- 70-84: Yaxshi — asosiy savollarga yetarli chuqurlikda javob bergan
- 55-69: O'rtacha — yuzaki javoblar, ba'zi bilim bor lekin chuqurlik yetmaydi
- 35-54: Zaif — ko'p savollar javobsiz yoki noaniq
- 20-34: Juda zaif — minimal darajada javob
- 0-19: Javob yo'q, spam, haqorat

**Recommendation:**
- `hire` — bali 75+ va texnik chuqurligi aniq ko'rinadi
- `maybe` — bali 60-74 (qo'shimcha live interview foydali)
- `reject` — bali 60 dan past yoki texnik chuqurlik ko'rinmaydi

Barcha matnli javoblarni O'zbek tilida qaytaring.
"""
                system = (
                    "Siz tajribali texnik suhbatchisiz, middle/senior darajadagi nomzodlarni baholaysiz. "
                    "Yuzaki javoblarni qabul qilmang — konkret misol, sabab, natija so'rang. "
                    "Bu pozitsiya chuqur bilim va tajriba talab qiladi — moslik ballini shunga qarab qo'ying."
                )
            else:
                rubric = """
**Baholash yo'riqnomasi (YUMSHOQ VA ADOLATLI — Intern/Junior uchun):**
- Nomzodlar — real odamlar, har xil tajriba va so'zlash uslubiga ega. Ularga imkon bering.
- Qisqa javob = past ball EMAS. Agar javob mavzuga mos va ma'noli bo'lsa — yaxshi ball qo'ying.
- Qisman javob (to'liq emas) — qisman bali beriladi, to'liq rad qilmang.
- Grammatik xato, jargon, aralash til (uz/ru), sodda lug'at — ball kamaymasligi kerak.
- "Bilmayman", "tajribam yo'q" — halol javob, bu ham qiymatli.
- Nomzod boshqa texnologiya/yondashuv aytsa — bu ham muvofiq javob, past ball qo'ymang.
- Intern/Junior uchun — o'rganishga tayyorlik va asosiy tushunish yetarli.

**Ball diapazoni:**
- 80-100: Yaxshi/a'lo — aniq javob bergan, kerakli darajada tajriba yoki o'rganishga tayyor
- 60-79: O'rtacha — asosiy savollarga javob berdi, ba'zi bo'shliqlar bor
- 40-59: Zaif — ko'p savollar bo'sh, lekin urinish bor
- 20-39: Juda zaif — javoblar yuzaki yoki noto'g'ri
- 0-19: Faqat bunday holatlarda — javob bermaslik, so'kinish, haqorat, spam, butunlay mavzudan chetda

**Recommendation:**
- `hire` — bali 70+
- `maybe` — bali 50-69 (qo'shimcha suhbat foydali bo'lishi mumkin)
- `reject` — bali 50 dan past VA nomzod aynan bu vakansiyaga mos kelmaydi

Barcha matnli javoblarni O'zbek tilida qaytaring.
"""
                system = (
                    "Siz mehribon lekin professional HR mutaxassisisiz. "
                    "Nomzodlarga yumshoqlik bilan yondashing, past ball qo'yishda ehtiyot bo'ling. "
                    "Maqsad — haqiqiy potentsialni topish, shafqatsizlik emas."
                )
            return header + rubric, system

        # Russian
        header = f"""Оцените следующий транскрипт собеседования.

**Вакансия:** {title}
**Уровень:** {level_label}
**Резюме (сокращённо):** {resume}

**Транскрипт:**
{conversation}
"""
        if tier == "strict":
            rubric = """
**Принципы оценки (СТРОГО И ПРОФЕССИОНАЛЬНО — для Mid/Senior):**
Эта вакансия требует большого опыта и глубоких знаний. Проверьте, соответствует ли кандидат уровню.

- **Техническая глубина ВАЖНА.** Поверхностные ответы должны получать низкий балл.
- **Конкретные примеры и цифры** — ожидайте конкретных примеров (название проекта, результат, проблема-решение).
- **Понимание причин** — не поверхностный подход, а понимание причинно-следственных связей.
- "Не знаю" — для этого уровня не должно быть часто; для junior ОК, но для senior — повод снизить балл.
- **Частичный ответ** — частичный балл; 80+ только для полного и точного ответа.
- **Абстрактные фразы** ("работали вместе", "успешно сделал") — если нет конкретики, снижайте балл.
- **Если кандидат использовал другую технологию** — ожидайте глубокого знания этой технологии.

**Диапазон баллов (СТРОГИЙ):**
- 85-100: Отлично — глубокие, точные ответы с примерами на все вопросы
- 70-84: Хорошо — достаточная глубина по основным вопросам
- 55-69: Средне — поверхностно, знания есть, но глубины не хватает
- 35-54: Слабо — многие вопросы без ответа или неясны
- 20-34: Очень слабо — минимальные ответы
- 0-19: Нет ответа, спам, оскорбления

**Recommendation:**
- `hire` — балл 75+ и техническая глубина видна
- `maybe` — балл 60-74 (доп. live интервью полезно)
- `reject` — балл ниже 60 или глубины нет

Все текстовые ответы — на русском языке.
"""
            system = (
                "Вы опытный технический интервьюер, оцениваете кандидатов уровня middle/senior. "
                "Не принимайте поверхностные ответы — требуйте конкретных примеров, причин, результатов. "
                "Позиция требует глубоких знаний и опыта — оценивайте соответственно."
            )
        else:
            rubric = """
**Принципы оценки (МЯГКО И СПРАВЕДЛИВО — для Intern/Junior):**
- Кандидаты — реальные люди с разным опытом и стилем общения. Дайте им шанс.
- Краткий ответ ≠ низкий балл. Если ответ по теме и осмысленный — ставьте хороший балл.
- Частичный ответ — частичный балл, не отвергайте полностью.
- Грамматические ошибки, жаргон, смешанный язык (uz/ru), простой словарь — не снижают балл.
- "Не знаю", "нет опыта" — честный ответ, тоже ценно.
- Кандидат использовал другую технологию/подход — это тоже подходящий ответ.
- Для intern/junior — готовность учиться и базовое понимание достаточно.

**Диапазон баллов:**
- 80-100: Хорошо/отлично — четкие ответы, нужный опыт или готовность учиться
- 60-79: Средне — ответил на основное, есть пробелы
- 40-59: Слабо — многие вопросы пустые, но попытка есть
- 20-39: Очень слабо — ответы поверхностные или неправильные
- 0-19: Только в таких случаях — отказ отвечать, оскорбления, спам, совершенно не по теме

**Recommendation:**
- `hire` — балл 70+
- `maybe` — балл 50-69 (дополнительное собеседование полезно)
- `reject` — балл ниже 50 И кандидат явно не подходит

Все текстовые ответы — на русском языке.
"""
            system = (
                "Вы доброжелательный, но профессиональный HR-специалист. "
                "Относитесь к кандидатам мягко, будьте осторожны с низкими баллами. "
                "Цель — найти реальный потенциал, а не быть жестоким."
            )
        return header + rubric, system

    def _terminate(self, session: InterviewSession, reason: str) -> None:
        session.status = InterviewSession.Status.TERMINATED
        session.termination_reason = reason
        session.ended_at = timezone.now()
        session.save(
            update_fields=["status", "termination_reason", "ended_at", "updated_at"]
        )
        # Application statusini ham yangilaymiz — admin ko'rsin
        application = session.application
        if application.status == Application.ApplicationStatus.INTERVIEW_STAGE:
            application.status = Application.ApplicationStatus.INTERVIEW_ABANDONED
            application.save(update_fields=["status", "updated_at"])

    def _complete(self, session: InterviewSession, reason: str) -> None:
        session.status = InterviewSession.Status.COMPLETED
        session.termination_reason = reason
        session.ended_at = timezone.now()
        session.save(
            update_fields=["status", "termination_reason", "ended_at", "updated_at"]
        )

    @staticmethod
    def _error_text(lang: str) -> str:
        return (
            "Kechirasiz, texnik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
            if lang == "uz"
            else "Извините, произошла техническая ошибка. Пожалуйста, повторите позже."
        )

"""Resume tahlili — Google Gemini (google-genai SDK)."""

from __future__ import annotations

import json
import logging
from typing import Optional

from django.conf import settings
from google import genai
from google.genai import types

from ..models import Application, Vacancy
from .file_processor import FileProcessor

logger = logging.getLogger(__name__)


RESUME_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "overall_compatibility": {"type": "integer", "minimum": 0, "maximum": 100},
        "technical_skills_match": {"type": "integer", "minimum": 0, "maximum": 100},
        "experience_match": {"type": "integer", "minimum": 0, "maximum": 100},
        "education_relevance": {"type": "integer", "minimum": 0, "maximum": 100},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "missing_skills": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "detailed_feedback": {"type": "string"},
        "hiring_recommendation": {
            "type": "string",
            "enum": ["hire", "interview", "reject"],
        },
        "confidence_level": {"type": "integer", "minimum": 0, "maximum": 100},
    },
    "required": [
        "overall_compatibility",
        "technical_skills_match",
        "experience_match",
        "education_relevance",
        "strengths",
        "weaknesses",
        "recommendations",
        "detailed_feedback",
        "hiring_recommendation",
    ],
}


STRUCTURED_RESUME_SCHEMA = {
    "type": "object",
    "properties": {
        "email": {"type": "string"},
        "linkedin_url": {"type": "string"},
        "portfolio_url": {"type": "string"},
        "summary": {"type": "string"},
        "experience_data": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "position": {"type": "string"},
                    "company": {"type": "string"},
                    "duration": {"type": "string"},
                    "description": {"type": "string"},
                },
            },
        },
        "education_data": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string"},
                    "degree": {"type": "string"},
                    "field": {"type": "string"},
                    "year": {"type": "string"},
                },
            },
        },
        "technical_skills": {"type": "array", "items": {"type": "string"}},
        "soft_skills": {"type": "array", "items": {"type": "string"}},
        "languages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "level": {"type": "string"},
                },
            },
        },
        "certifications": {"type": "array", "items": {"type": "string"}},
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                },
            },
        },
    },
}


SYSTEM_INSTRUCTIONS = {
    "uz": (
        "Siz professional HR mutaxassisi va rezyume tahlilchisisiz. "
        "Rezyumelarni vakansiya talablariga qarab obyektiv tahlil qiling. "
        "Barcha javoblarni O'zbek tilida yozing."
    ),
    "ru": (
        "Вы профессиональный HR-специалист и аналитик резюме. "
        "Объективно анализируйте резюме на соответствие требованиям вакансии. "
        "Все ответы пишите на русском языке."
    ),
}


def _get_lang_text(value, lang: str = "uz") -> str:
    """Ko'p tilli JSON maydondan matn olish."""
    if isinstance(value, dict):
        return value.get(lang) or value.get("uz") or ""
    return value if isinstance(value, str) else ""


class AIResumeAnalyzer:
    """Rezyumeni Gemini orqali tahlil qiladi."""

    def __init__(self):
        self.model = settings.AI_SETTINGS["MODEL"]
        self.temperature = settings.AI_SETTINGS["TEMPERATURE"]
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.file_processor = FileProcessor()

    # ---------------------- Public API ----------------------
    def analyze_resume(self, application: Application) -> dict:
        try:
            resume_text = self._get_resume_text(application)
            if not resume_text:
                return self._error("Resume matni topilmadi")

            lang = getattr(application, "user_language", "uz") or "uz"
            if lang not in ("uz", "ru"):
                lang = "uz"

            vacancy = application.vacancy
            prompt = self._build_prompt(resume_text, vacancy, lang)

            analysis = self._call_gemini(prompt, lang)
            score = self._weighted_score(analysis)

            return {
                "success": True,
                "compatibility_score": score,
                "analysis_result": analysis,
                "strengths": analysis.get("strengths", []),
                "weaknesses": analysis.get("weaknesses", []),
                "recommendations": analysis.get("recommendations", []),
                "decision": "proceed" if score >= vacancy.min_match_score else "reject",
            }
        except Exception as e:
            logger.exception("Resume analysis failed")
            return self._error(f"Tahlil muvaffaqiyatsiz: {e}")

    # ---------------------- Resume text extraction ----------------------
    def _get_resume_text(self, application: Application) -> Optional[str]:
        if application.resume_text:
            return application.resume_text

        if application.resume_file:
            try:
                # FieldFile'ni uzatamiz — S3 remote storage bilan ham ishlaydi
                text = self.file_processor.extract_text_from_file(
                    application.resume_file
                )
                application.resume_text = text
                application.save(update_fields=["resume_text"])
                return text
            except Exception:
                logger.exception("File processing failed")

        if hasattr(application, "resume_form_data"):
            try:
                text = application.resume_form_data.generate_resume_text()
                application.resume_text = text
                application.resume_generated = True
                application.save(update_fields=["resume_text", "resume_generated"])
                return text
            except Exception:
                logger.exception("Form data processing failed")

        return self._minimal_resume(application)

    def _minimal_resume(self, application: Application) -> str:
        parts = [
            f"Name: {application.full_name or 'N/A'}",
            f"Phone: {application.phone or 'N/A'}",
        ]
        if application.age:
            parts.append(f"Age: {application.age}")
        if application.address:
            parts.append(f"Address: {application.address}")
        parts.append("\nNote: Minimal resume — full details not provided.")
        text = "\n".join(parts)
        application.resume_text = text
        application.resume_generated = True
        application.save(update_fields=["resume_text", "resume_generated"])
        return text

    # ---------------------- Prompt construction ----------------------
    def _build_prompt(self, resume_text: str, vacancy: Vacancy, lang: str) -> str:
        title = _get_lang_text(vacancy.title, lang)
        description = _get_lang_text(vacancy.description, lang)
        requirements = _get_lang_text(vacancy.requirements, lang)
        responsibilities = _get_lang_text(vacancy.responsibilities, lang)

        exp_parts = []
        if vacancy.experience_years:
            exp_parts.append(
                f"{vacancy.experience_years} yil"
                if lang == "uz"
                else f"{vacancy.experience_years} лет"
            )
        if vacancy.experience_months:
            exp_parts.append(
                f"{vacancy.experience_months} oy"
                if lang == "uz"
                else f"{vacancy.experience_months} месяцев"
            )
        experience = (
            ", ".join(exp_parts)
            if exp_parts
            else ("Tajriba talab qilinmaydi" if lang == "uz" else "Опыт не требуется")
        )

        custom = vacancy.ai_prompt or ""

        if lang == "uz":
            return f"""**VAKANSIYA:**
Lavozim: {title}
Tavsif: {description}
Talablar: {requirements}
Mas'uliyatlar: {responsibilities}
Tajriba: {experience}
Ish turi: {vacancy.work_type}
Joylashuv: {vacancy.location}
Minimal mos kelish bali: {vacancy.min_match_score}%

**REZYUME:**
{resume_text}

{f"**QO'SHIMCHA KO'RSATMALAR:**\n{custom}" if custom else ""}

Rezyumeni vakansiyaga mosligi bo'yicha batafsil tahlil qiling. Texnik ko'nikmalar, tajriba, ta'lim va umumiy mosligini obyektiv baholang.
"""
        return f"""**ВАКАНСИЯ:**
Должность: {title}
Описание: {description}
Требования: {requirements}
Обязанности: {responsibilities}
Опыт: {experience}
Тип работы: {vacancy.work_type}
Местоположение: {vacancy.location}
Минимальный балл соответствия: {vacancy.min_match_score}%

**РЕЗЮМЕ:**
{resume_text}

{f"**ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:**\n{custom}" if custom else ""}

Проанализируйте соответствие резюме вакансии. Объективно оцените технические навыки, опыт, образование и общее соответствие.
"""

    # ---------------------- Gemini call ----------------------
    def _call_gemini(self, prompt: str, lang: str) -> dict:
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTIONS[lang],
                    temperature=self.temperature,
                    response_mime_type="application/json",
                    response_schema=RESUME_ANALYSIS_SCHEMA,
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            logger.exception(f"Gemini API call failed: {e}")
            return self._fallback_analysis()

    # ---------------------- Scoring ----------------------
    @staticmethod
    def _weighted_score(analysis: dict) -> int:
        weights = {
            "overall_compatibility": 0.4,
            "technical_skills_match": 0.3,
            "experience_match": 0.2,
            "education_relevance": 0.1,
        }
        total = sum(analysis.get(k, 0) * w for k, w in weights.items())
        return int(max(0, min(100, total)))

    # ---------------------- Structured data extraction ----------------------
    def extract_structured_data(self, resume_text: str, lang: str = "uz") -> dict:
        """Rezyume matnidan tuzilgan ma'lumot ajratadi: ism, email, tajriba, ta'lim, skills.

        Flash modelni ishlatadi — tez va arzon. Xato bo'lsa bo'sh dict qaytaradi.
        """
        if not resume_text or len(resume_text.strip()) < 20:
            return {}

        fast_model = settings.AI_SETTINGS.get("FAST_MODEL", "gemini-2.5-flash")
        if lang == "uz":
            system = (
                "Siz rezyume matnidan tuzilgan ma'lumot ajratuvchi yordamchisiz. "
                "Matnda mavjud bo'lmagan ma'lumotlarni ishlab chiqarmang — bo'sh qoldiring. "
                "Javobni faqat JSON formatda qaytaring."
            )
            prompt = f"""Quyidagi rezyume matnidan tuzilgan ma'lumotni ajrating.

**Rezyume matni:**
{resume_text[:4000]}

**Yo'riqnoma:**
- email: matnda email topsangiz, bo'lmasa bo'sh qoldiring
- linkedin_url, portfolio_url: havolalar (agar bor bo'lsa)
- summary: 1-2 gap — nomzod qisqacha kim (matnning "About me" yoki "Summary" bo'limidan)
- experience_data: har bir ish joyi — lavozim, kompaniya, davr (masalan "Jan 2023 - Jun 2024"), tavsif
- education_data: har bir ta'lim — muassasa, daraja, yo'nalish, yili
- technical_skills: kasbiy/texnik ko'nikmalar ro'yxati (masalan ["Python", "Savdo", "1C"])
- soft_skills: shaxsiy sifatlar (masalan ["Kommunikatsiya", "Liderlik"])
- languages: [{{"name": "O'zbek", "level": "Ona tili"}}, ...]
- certifications: sertifikatlar ro'yxati
- projects: loyihalar — nomi va qisqa tavsif

Matnda aniq ko'rsatilmagan narsalarni qo'shmang. Bo'sh array yoki bo'sh string yuboring.
"""
        else:
            system = (
                "Вы помощник, извлекающий структурированные данные из резюме. "
                "Не придумывайте данные, которых нет в тексте — оставляйте пустыми. "
                "Отвечайте только в JSON формате."
            )
            prompt = f"""Извлеките структурированные данные из резюме.

**Текст резюме:**
{resume_text[:4000]}

**Инструкции:**
- email: email из текста (если есть)
- linkedin_url, portfolio_url: ссылки (если есть)
- summary: 1-2 предложения — краткое представление
- experience_data: каждое место работы — должность, компания, период, описание
- education_data: образование — учреждение, степень, специальность, год
- technical_skills: профессиональные/технические навыки
- soft_skills: личные качества
- languages: [{{"name": "Русский", "level": "Родной"}}, ...]
- certifications: сертификаты
- projects: проекты — название и краткое описание

Не добавляйте то, чего нет в тексте.
"""

        try:
            response = self.client.models.generate_content(
                model=fast_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=STRUCTURED_RESUME_SCHEMA,
                ),
            )
            data = json.loads(response.text)
            # Tozalab qaytaramiz — bo'sh string'lar None qilinmasin
            return {k: v for k, v in data.items() if v not in (None, "", [])}
        except Exception:
            logger.exception("Structured data extraction failed")
            return {}

    # ---------------------- Error helpers ----------------------
    @staticmethod
    def _error(msg: str) -> dict:
        return {
            "success": False,
            "error": msg,
            "compatibility_score": 0,
            "analysis_result": {},
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
        }

    @staticmethod
    def _fallback_analysis() -> dict:
        return {
            "overall_compatibility": 0,
            "technical_skills_match": 0,
            "experience_match": 0,
            "education_relevance": 0,
            "strengths": [],
            "weaknesses": ["AI tahlil vaqtincha ishlamayapti"],
            "recommendations": ["Qo'lda ko'rib chiqish talab qilinadi"],
            "detailed_feedback": "AI tahlil xizmati xatolik bilan yakunlandi.",
            "hiring_recommendation": "reject",
            "confidence_level": 0,
        }

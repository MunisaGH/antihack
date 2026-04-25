"""Arizani AI orqali tahlil qilish — background thread orqali sync chaqiruv.

MUHIM: transaction.atomic() ichida Gemini chaqiruvlarini BAJARMASLIK — ular 20-30s,
bu vaqt ichida butun DB lock bo'ladi va boshqa yozuvchilar bloklanadi.
Shuning uchun AI chaqiruvlari tranzaksiya tashqarisida, faqat qisqa yozishlar tranzaksiya ichida.
"""

import logging
import threading

from django.db import close_old_connections

from ..models import Application, ResumeFormData
from .ai_analysis_translate import AIAnalysisTranslator
from .ai_service import AIResumeAnalyzer
from .notifications import notify_ai_analysis_complete

logger = logging.getLogger(__name__)


def process_application_ai_analysis(application_id: int) -> None:
    """Uzoq AI chaqiruvlar tranzaksiyasiz bajariladi. DB yozuvlar — qisqa, atomic."""
    try:
        logger.info(f"AI analysis start: application {application_id}")

        # 1-qadam: application'ni oddiy o'qish (tranzaksiyasiz, tez)
        try:
            application = Application.objects.select_related("vacancy").get(id=application_id)
        except Application.DoesNotExist:
            logger.error(f"Application {application_id} not found")
            return

        # 2-qadam: AI Gemini chaqiruvi (uzun, tranzaksiyasiz)
        analyzer = AIResumeAnalyzer()
        result = analyzer.analyze_resume(application)

        # 3-qadam: natijalarni yozish (qisqa, atomic emas — faqat 1 row update)
        if not result.get("success"):
            Application.bulk_update_with_history(
                application_id,
                new_status=Application.ApplicationStatus.PENDING,
            )
            logger.error(
                f"AI analysis failed for {application_id}: {result.get('error')}"
            )
            return

        passed = result["decision"] == "proceed"
        new_status = (
            Application.ApplicationStatus.INTERVIEW_STAGE
            if passed
            else Application.ApplicationStatus.REJECTED_RESUME
        )

        Application.bulk_update_with_history(
            application_id,
            new_status=new_status,
            compatibility_score=result["compatibility_score"],
            ai_analysis_result=result["analysis_result"],
            ai_strengths=result["strengths"],
            ai_weaknesses=result["weaknesses"],
            ai_recommendations=result["recommendations"],
        )

        # Notification uchun application qayta oliq
        application.refresh_from_db()
        notify_ai_analysis_complete(application, passed=passed)
        logger.info(
            f"AI analysis done: {application_id}, score={application.compatibility_score}"
        )

        # 4-qadam: boshqa tilga tarjima (uzun, tranzaksiyasiz)
        _store_analysis_translations(application_id)

        # 5-qadam: rezyume matnidan structured ma'lumot ajratish (Flash model, tez)
        _extract_structured_resume_data(application_id)

    except Exception:
        logger.exception(f"Unexpected error processing application {application_id}")
        try:
            Application.bulk_update_with_history(
                application_id,
                new_status=Application.ApplicationStatus.PENDING,
            )
        except Exception:
            logger.exception(f"Failed to update status for {application_id}")
    finally:
        # Thread tugagach DB ulanishini yopish — thread pool'da ulanish oqib ketmasligi uchun
        close_old_connections()


def _store_analysis_translations(application_id: int) -> None:
    """Tahlilni UZ va RU tillariga saqlaydi."""
    try:
        app = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        logger.error(f"Application {application_id} not found for translation")
        return

    source_lang = app.user_language or "uz"
    other_lang = "ru" if source_lang == "uz" else "uz"
    translations = {source_lang: app.ai_analysis_result}

    try:
        translator = AIAnalysisTranslator()
        translations[other_lang] = translator.translate(app.ai_analysis_result, other_lang)
    except Exception:
        logger.exception(f"Failed to translate analysis for {application_id}")

    # Qisqa yozish
    Application.objects.filter(id=application_id).update(
        ai_analysis_translations=translations,
    )
    logger.info(
        f"Stored analysis translations for {application_id}: {list(translations.keys())}"
    )


def _extract_structured_resume_data(application_id: int) -> None:
    """Rezyume matnidan AI orqali structured ma'lumot ajratib ResumeFormData'ga saqlaydi.

    Faqat rezyume fayli bilan yuborilgan arizalar uchun. Qo'lda forma bilan yuborilgan
    (resume_generated=True, ResumeFormData allaqachon bor) arizalar bu bosqichni o'tkazib yuboradi.
    """
    try:
        app = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return

    # Qo'lda forma bilan yuborilgan — allaqachon tuzilgan ma'lumot bor
    if hasattr(app, "resume_form_data"):
        return

    resume_text = app.resume_text or ""
    if len(resume_text.strip()) < 50:
        return

    lang = app.user_language or "uz"
    try:
        analyzer = AIResumeAnalyzer()
        data = analyzer.extract_structured_data(resume_text, lang)
    except Exception:
        logger.exception(f"Structured extraction failed for {application_id}")
        return

    if not data:
        logger.info(f"No structured data extracted for {application_id}")
        return

    try:
        ResumeFormData.objects.create(
            application=app,
            email=data.get("email", "") or "",
            linkedin_url=data.get("linkedin_url") or None,
            portfolio_url=data.get("portfolio_url") or None,
            summary=data.get("summary", "") or "",
            experience_data=data.get("experience_data", []) or [],
            education_data=data.get("education_data", []) or [],
            technical_skills=data.get("technical_skills", []) or [],
            soft_skills=data.get("soft_skills", []) or [],
            languages=data.get("languages", []) or [],
            certifications=data.get("certifications", []) or [],
            projects_data=data.get("projects", []) or [],
        )
        logger.info(f"Structured data saved for {application_id}")
    except Exception:
        logger.exception(f"Failed to save structured data for {application_id}")


def run_ai_analysis_async(application_id: int) -> None:
    def _wrapped():
        try:
            process_application_ai_analysis(application_id)
        finally:
            close_old_connections()

    thread = threading.Thread(target=_wrapped, args=(), daemon=True)
    thread.start()
    logger.info(f"Background AI analysis queued for application {application_id}")

from django.conf import settings
from django.core.mail import send_mail

from ..models import Application, Notification


def _vacancy_title(application: Application, lang: str = "uz") -> str:
    title = application.vacancy.title
    if isinstance(title, dict):
        return title.get(lang) or title.get("uz") or ""
    return str(title)


def _safe_send_mail(subject: str, message: str, recipient_list: list[str]) -> None:
    if not recipient_list:
        return
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=recipient_list,
            fail_silently=True,
        )
    except Exception:
        pass


def create_application_notification(
    application: Application,
    status_type: str,
    message: str,
    title: str | None = None,
) -> None:
    Notification.objects.create(
        user=application.vacancy.employer,
        title=title or f"Application Update: {application.full_name}",
        body=message,
        type=status_type,
    )


def notify_new_application(application: Application) -> None:
    vacancy_title = _vacancy_title(application)
    create_application_notification(
        application=application,
        status_type="info",
        title=f"Yangi ariza: {application.full_name}",
        message=f"{application.full_name} vakansiyaga ariza berdi: {vacancy_title}",
    )


def notify_ai_analysis_complete(application: Application, passed: bool) -> None:
    if passed:
        create_application_notification(
            application=application,
            status_type="success",
            title=f"AI Analiz: {application.full_name} o'tdi",
            message=(
                f"{application.full_name} ning rezyumesi AI tahlilidan o'tdi "
                f"(Ball: {application.compatibility_score}%). Intervyu bosqichiga o'tdi."
            ),
        )
    else:
        create_application_notification(
            application=application,
            status_type="warning",
            title=f"AI Analiz: {application.full_name} o'tmadi",
            message=(
                f"{application.full_name} ning rezyumesi AI tahlilidan o'tmadi "
                f"(Ball: {application.compatibility_score}%)."
            ),
        )


def notify_interview_complete(application: Application, passed: bool) -> None:
    if passed:
        create_application_notification(
            application=application,
            status_type="success",
            title=f"Intervyu: {application.full_name} qabul qilindi",
            message=(
                f"{application.full_name} intervyudan muvaffaqiyatli o'tdi "
                f"(Ball: {application.interview_score}%)."
            ),
        )
    else:
        create_application_notification(
            application=application,
            status_type="warning",
            title=f"Intervyu: {application.full_name} rad etildi",
            message=(
                f"{application.full_name} intervyudan o'tmadi "
                f"(Ball: {application.interview_score}%)."
            ),
        )


def notify_final_decision(application: Application, hired: bool) -> None:
    vacancy_title = _vacancy_title(application)
    if hired:
        create_application_notification(
            application=application,
            status_type="success",
            title=f"Qabul qilindi: {application.full_name}",
            message=f"{application.full_name} ishga qabul qilindi: {vacancy_title}",
        )
    else:
        create_application_notification(
            application=application,
            status_type="info",
            title=f"Rad etildi: {application.full_name}",
            message=f"{application.full_name} ning arizasi rad etildi: {vacancy_title}",
        )

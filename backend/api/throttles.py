"""Rate limiting uchun DRF throttle classlari."""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginThrottle(AnonRateThrottle):
    """Login brute-force himoyasi: IP uchun 10/min."""

    scope = "login"


class SubmitApplicationThrottle(AnonRateThrottle):
    """Ariza yuborish: IP uchun 5/soat (spam va Gemini cost himoyasi)."""

    scope = "submit_application"


class ContactMessageThrottle(AnonRateThrottle):
    """Contact form spam himoyasi: IP uchun 5/soat."""

    scope = "contact_message"


class ApplicationStatusThrottle(AnonRateThrottle):
    """Ariza status polling: IP uchun 60/min (2.5s oraliq)."""

    scope = "application_status"


class PublicVacancyThrottle(AnonRateThrottle):
    """Public vakansiya sahifasi (detail): IP uchun 240/min."""

    scope = "public_vacancy"


class PublicVacancyListThrottle(AnonRateThrottle):
    """Public vakansiyalar ro'yxati: IP uchun 300/min."""

    scope = "public_vacancies_list"


class InterviewActionThrottle(UserRateThrottle):
    """Intervyu javob/finalize — Gemini chaqiruv cost himoyasi: user uchun 30/min."""

    scope = "interview_action"


class InterviewStreamThrottle(UserRateThrottle):
    """Intervyu streaming — Gemini pro quota himoyasi: user uchun 20/min."""

    scope = "interview_stream"


class AITranslateThrottle(UserRateThrottle):
    """AI vakansiya tarjima/generatsiya: admin uchun 30/min."""

    scope = "ai_translate"

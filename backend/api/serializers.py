from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User,
    Vacancy,
    Application,
    ResumeFormData,
    ContactMessage,
    Notification,
    InterviewSession,
)
from .services.storage import file_url


class UserProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    telegram_username = serializers.CharField(
        max_length=64, required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "phone",
            "telegram_username",
            "avatar",
            "is_active",
            "company_name",
            "company_location",
            "role",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Avatar URL'ni Bunny signed URL bilan almashtiramiz
        data["avatar"] = file_url(instance.avatar)
        return data

    def validate_telegram_username(self, value):
        if not value:
            return ""
        cleaned = value.strip().lstrip("@")
        if not cleaned:
            return ""
        import re

        if not re.match(r"^[A-Za-z0-9_]{5,32}$", cleaned):
            raise serializers.ValidationError(
                "Telegram username 5-32 belgi, faqat harf/raqam/_ bo'lishi kerak"
            )
        return cleaned

    def validate_username(self, value):
        request = self.context.get("request")
        current_user_id = None
        if request and request.user and request.user.is_authenticated:
            current_user_id = request.user.id
        if value:
            exists = (
                User.objects.filter(username=value).exclude(id=current_user_id).exists()
            )
            if exists:
                raise serializers.ValidationError("Bu username band")
        return value


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        if not username or not password:
            raise serializers.ValidationError("Username va password talab qilinadi")

        from django.contrib.auth import get_user_model

        User = get_user_model()

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"non_field_errors": ["Bunday username mavjud emas"]}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": ["Foydalanuvchi hisobi o'chirilgan"]}
            )

        if not user.check_password(password):
            raise serializers.ValidationError({"non_field_errors": ["Parol noto'g'ri"]})

        authenticated_user = authenticate(username=username, password=password)
        if not authenticated_user:
            raise serializers.ValidationError(
                {"non_field_errors": ["Autentifikatsiya muvaffaqiyatsiz"]}
            )

        attrs["user"] = authenticated_user
        return attrs


SUPPORTED_LANGUAGES = ("uz", "ru")


def _resolve_language(request):
    if not request:
        return "uz"
    lang = request.query_params.get("lang", None)
    if lang and lang in SUPPORTED_LANGUAGES:
        return lang
    accept_lang = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    if accept_lang:
        lang = accept_lang.split(",")[0].split(";")[0].strip()[:2]
        if lang in SUPPORTED_LANGUAGES:
            return lang
    return "uz"


def _localized(value, lang):
    if isinstance(value, dict):
        return value.get(lang, value.get("uz", ""))
    return value if isinstance(value, str) else ""


class VacancySerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source="employer.username", read_only=True)
    company_name = serializers.CharField(source="employer.company_name", read_only=True)
    applications_count = serializers.IntegerField(read_only=True)
    status = serializers.ChoiceField(choices=Vacancy.STATUS_CHOICES)

    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    requirements = serializers.SerializerMethodField()
    responsibilities = serializers.SerializerMethodField()

    class Meta:
        model = Vacancy
        fields = [
            "id",
            "employer",
            "employer_name",
            "company_name",
            "title",
            "description",
            "requirements",
            "responsibilities",
            "work_type",
            "work_schedule",
            "salary_min",
            "salary_max",
            "location",
            "experience_years",
            "experience_months",
            "min_match_score",
            "unique_link",
            "status",
            "views_count",
            "applications_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "unique_link",
            "views_count",
            "applications_count",
            "created_at",
            "updated_at",
        ]

    def get_language(self):
        return _resolve_language(self.context.get("request"))

    def get_title(self, obj):
        return _localized(obj.title, self.get_language())

    def get_description(self, obj):
        return _localized(obj.description, self.get_language())

    def get_requirements(self, obj):
        return _localized(obj.requirements, self.get_language())

    def get_responsibilities(self, obj):
        return _localized(obj.responsibilities, self.get_language())


class VacancyCreateSerializer(serializers.ModelSerializer):
    """Vacancy yaratish uchun serializer - 2 tilda qabul qiladi: {uz: "...", ru: "..."}"""

    title = serializers.JSONField(required=True)
    description = serializers.JSONField(required=True)
    requirements = serializers.JSONField(required=True)
    responsibilities = serializers.JSONField(required=True)

    class Meta:
        model = Vacancy
        fields = [
            "title",
            "description",
            "requirements",
            "responsibilities",
            "work_type",
            "work_schedule",
            "salary_min",
            "salary_max",
            "location",
            "experience_years",
            "experience_months",
            "min_match_score",
            "status",
        ]
        extra_kwargs = {
            "min_match_score": {"required": False},
            "salary_min": {"required": False, "allow_null": True},
            "salary_max": {"required": False, "allow_null": True},
            "experience_years": {"required": False},
            "experience_months": {"required": False},
            "status": {"required": False},
        }

    @staticmethod
    def _validate_bilingual(value, field_label):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                f"{field_label} must be a dictionary with uz and ru keys"
            )
        if not all(key in value for key in ("uz", "ru")):
            raise serializers.ValidationError(
                f"{field_label} must contain uz and ru keys"
            )
        return value

    def validate_title(self, value):
        return self._validate_bilingual(value, "Title")

    def validate_description(self, value):
        return self._validate_bilingual(value, "Description")

    def validate_requirements(self, value):
        return self._validate_bilingual(value, "Requirements")

    def validate_responsibilities(self, value):
        return self._validate_bilingual(value, "Responsibilities")

    def to_internal_value(self, data):
        if hasattr(data, "get"):
            work_type = data.get("work_type")
            if work_type == "offline":
                if hasattr(data, "_mutable"):
                    data._mutable = True
                    data["work_type"] = "office"
                    data._mutable = False
                else:
                    mutable_data = dict(data)
                    mutable_data["work_type"] = "office"
                    data = mutable_data
        return super().to_internal_value(data)


class PublicVacancySerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="employer.company_name", read_only=True)

    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    requirements = serializers.SerializerMethodField()
    responsibilities = serializers.SerializerMethodField()

    class Meta:
        model = Vacancy
        fields = [
            "id",
            "title",
            "description",
            "requirements",
            "responsibilities",
            "work_type",
            "work_schedule",
            "salary_min",
            "salary_max",
            "location",
            "experience_years",
            "experience_months",
            "company_name",
            "views_count",
            "applications_count",
            "created_at",
        ]

    def get_language(self):
        return _resolve_language(self.context.get("request"))

    def get_title(self, obj):
        return _localized(obj.title, self.get_language())

    def get_description(self, obj):
        return _localized(obj.description, self.get_language())

    def get_requirements(self, obj):
        return _localized(obj.requirements, self.get_language())

    def get_responsibilities(self, obj):
        return _localized(obj.responsibilities, self.get_language())


class ApplicationSerializer(serializers.ModelSerializer):
    vacancy_title = serializers.SerializerMethodField()
    company_name = serializers.CharField(
        source="vacancy.employer.company_name", read_only=True
    )
    status = serializers.ChoiceField(choices=Application.STATUS_CHOICES)
    user_language = serializers.ChoiceField(
        choices=[("uz", "Uzbek"), ("ru", "Russian")], required=False
    )

    ai_analysis_result = serializers.SerializerMethodField()
    ai_strengths = serializers.SerializerMethodField()
    ai_weaknesses = serializers.SerializerMethodField()
    ai_recommendations = serializers.SerializerMethodField()
    interview_analysis = serializers.SerializerMethodField()
    interview_messages = serializers.SerializerMethodField()
    interview_status = serializers.SerializerMethodField()
    resume_form_data = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "vacancy",
            "vacancy_title",
            "company_name",
            "full_name",
            "phone",
            "age",
            "address",
            "telegram_username",
            "resume_file",
            "resume_text",
            "resume_form_data",
            "resume_generated",
            "ai_analysis_result",
            "compatibility_score",
            "ai_strengths",
            "ai_weaknesses",
            "ai_recommendations",
            "interview_analysis",
            "interview_messages",
            "interview_status",
            "interview_score",
            "status",
            "status_history",
            "final_score",
            "notes",
            "user_language",
            "psychological_test_results",
            "applied_at",
            "updated_at",
            "reviewed_at",
        ]
        read_only_fields = ["id", "applied_at", "updated_at", "reviewed_at"]

    def get_vacancy_title(self, obj):
        lang = _resolve_language(self.context.get("request"))
        return _localized(obj.vacancy.title, lang)

    def _analysis_for_view(self, obj):
        """Request tiliga mos tahlilni qaytaradi, yo'q bo'lsa asl tahlilga qaytadi."""
        lang = _resolve_language(self.context.get("request"))
        translations = obj.ai_analysis_translations or {}
        if lang in translations and translations[lang]:
            return translations[lang]
        return obj.ai_analysis_result or {}

    def get_ai_analysis_result(self, obj):
        return self._analysis_for_view(obj)

    def get_ai_strengths(self, obj):
        analysis = self._analysis_for_view(obj)
        return analysis.get("strengths", obj.ai_strengths) or []

    def get_ai_weaknesses(self, obj):
        analysis = self._analysis_for_view(obj)
        return analysis.get("weaknesses", obj.ai_weaknesses) or []

    def get_ai_recommendations(self, obj):
        analysis = self._analysis_for_view(obj)
        return analysis.get("recommendations", obj.ai_recommendations) or []

    def get_interview_analysis(self, obj):
        lang = _resolve_language(self.context.get("request"))
        translations = obj.interview_analysis_translations or {}
        if lang in translations and translations[lang]:
            return translations[lang]
        return obj.interview_analysis or {}

    def get_interview_messages(self, obj):
        """Intervyu suhbati (savol-javoblar) transkripti."""
        session = getattr(obj, "interview_session", None)
        if not session or not session.messages:
            return []
        return [
            {
                "role": m.get("role"),
                "content": m.get("content", ""),
                "at": m.get("at"),
            }
            for m in session.messages
        ]

    def get_interview_status(self, obj):
        session = getattr(obj, "interview_session", None)
        if not session:
            return None
        return {
            "status": session.status,
            "questions_asked": session.questions_asked,
            "termination_reason": session.termination_reason,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        }

    def get_resume_form_data(self, obj):
        """Rezyumeda ajratilgan tuzilgan ma'lumot (AI yoki qo'lda formadan)."""
        data = getattr(obj, "resume_form_data", None)
        if not data:
            return None
        return {
            "email": data.email or "",
            "linkedin_url": data.linkedin_url or "",
            "portfolio_url": data.portfolio_url or "",
            "summary": data.summary or "",
            "experience_data": data.experience_data or [],
            "education_data": data.education_data or [],
            "technical_skills": data.technical_skills or [],
            "soft_skills": data.soft_skills or [],
            "languages": data.languages or [],
            "certifications": data.certifications or [],
            "projects_data": data.projects_data or [],
            "hobbies": data.hobbies or "",
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # resume_file — Bunny signed URL (private bucket)
        data["resume_file"] = file_url(instance.resume_file)
        return data


class ApplicantApplicationSerializer(serializers.ModelSerializer):
    """Applicant o'z arizalarini ko'rishi uchun — admin maydonlarsiz (notes yo'q)."""

    vacancy_title = serializers.SerializerMethodField()
    company_name = serializers.CharField(
        source="vacancy.employer.company_name", read_only=True
    )
    ai_analysis_result = serializers.SerializerMethodField()
    ai_strengths = serializers.SerializerMethodField()
    ai_weaknesses = serializers.SerializerMethodField()
    ai_recommendations = serializers.SerializerMethodField()
    interview_analysis = serializers.SerializerMethodField()
    interview_messages = serializers.SerializerMethodField()
    interview_status = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "vacancy",
            "vacancy_title",
            "company_name",
            "full_name",
            "phone",
            "age",
            "address",
            "telegram_username",
            "compatibility_score",
            "ai_analysis_result",
            "ai_strengths",
            "ai_weaknesses",
            "ai_recommendations",
            "interview_score",
            "interview_analysis",
            "interview_messages",
            "interview_status",
            "status",
            "status_history",
            "user_language",
            "psychological_test_results",
            "applied_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_vacancy_title(self, obj):
        lang = _resolve_language(self.context.get("request"))
        return _localized(obj.vacancy.title, lang)

    def _analysis(self, obj):
        lang = _resolve_language(self.context.get("request"))
        translations = obj.ai_analysis_translations or {}
        if lang in translations and translations[lang]:
            return translations[lang]
        return obj.ai_analysis_result or {}

    def get_ai_analysis_result(self, obj):
        return self._analysis(obj)

    def get_ai_strengths(self, obj):
        return self._analysis(obj).get("strengths", obj.ai_strengths) or []

    def get_ai_weaknesses(self, obj):
        return self._analysis(obj).get("weaknesses", obj.ai_weaknesses) or []

    def get_ai_recommendations(self, obj):
        return self._analysis(obj).get("recommendations", obj.ai_recommendations) or []

    def get_interview_analysis(self, obj):
        lang = _resolve_language(self.context.get("request"))
        translations = obj.interview_analysis_translations or {}
        if lang in translations and translations[lang]:
            return translations[lang]
        return obj.interview_analysis or {}

    def get_interview_messages(self, obj):
        session = getattr(obj, "interview_session", None)
        if not session or not session.messages:
            return []
        return [
            {
                "role": m.get("role"),
                "content": m.get("content", ""),
                "at": m.get("at"),
            }
            for m in session.messages
        ]

    def get_interview_status(self, obj):
        session = getattr(obj, "interview_session", None)
        if not session:
            return None
        return {
            "status": session.status,
            "questions_asked": session.questions_asked,
            "termination_reason": session.termination_reason,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["resume_file"] = file_url(instance.resume_file)
        return data


class PublicApplicationSerializer(serializers.Serializer):
    """Ariza yuborish uchun — ModelSerializer o'rniga oddiy Serializer.
    Vacancy UUID alohida tekshiriladi; view qo'lda Application yaratadi.
    """

    vacancy = serializers.UUIDField()
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    age = serializers.IntegerField(required=False, allow_null=True)
    address = serializers.CharField(
        max_length=300, required=False, allow_blank=True, default=""
    )
    telegram_username = serializers.CharField(
        max_length=64, required=False, allow_blank=True, default=""
    )
    resume_file = serializers.FileField(required=False, allow_null=True)
    user_language = serializers.ChoiceField(
        choices=[("uz", "Uzbek"), ("ru", "Russian")], required=False, default="uz"
    )

    def validate_vacancy(self, value):
        if not Vacancy.objects.filter(pk=value, status="active").exists():
            raise serializers.ValidationError("Vakansiya topilmadi yoki faol emas")
        return value

    def validate_telegram_username(self, value):
        if not value:
            return ""
        cleaned = value.strip().lstrip("@")
        if not cleaned:
            return ""
        import re

        if not re.match(r"^[A-Za-z0-9_]{5,32}$", cleaned):
            raise serializers.ValidationError(
                "Telegram username 5-32 belgi bo'lishi, faqat harf/raqam/_ dan iborat bo'lishi kerak"
            )
        return cleaned


class ResumeFormDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeFormData
        fields = [
            "email",
            "linkedin_url",
            "portfolio_url",
            "education_data",
            "experience_data",
            "technical_skills",
            "soft_skills",
            "languages",
            "projects_data",
            "certifications",
            "summary",
            "hobbies",
            "references",
        ]


class ResumePreviewSerializer(serializers.Serializer):
    form_data = ResumeFormDataSerializer()
    vacancy_id = serializers.UUIDField()

    def validate_vacancy_id(self, value):
        try:
            Vacancy.objects.get(id=value, status="active")
            return value
        except Vacancy.DoesNotExist:
            raise serializers.ValidationError("Vacancy not found or inactive")


class InterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = [
            "id",
            "application",
            "messages",
            "status",
            "questions_asked",
            "termination_reason",
            "final_score",
            "final_analysis",
            "started_at",
            "ended_at",
        ]
        read_only_fields = fields


class InterviewAnswerInputSerializer(serializers.Serializer):
    answer = serializers.CharField(min_length=1, max_length=5000)


class AnalyticsSerializer(serializers.Serializer):
    total_applications = serializers.IntegerField()
    applications_by_status = serializers.DictField()
    applications_by_month = serializers.ListField()
    top_vacancies = serializers.ListField()
    average_compatibility_score = serializers.FloatField()
    interview_success_rate = serializers.FloatField()


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "name", "phone", "message", "created_at"]
        read_only_fields = ["id", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "title", "body", "type", "is_read", "created_at", "read_at"]
        read_only_fields = ["id", "is_read", "created_at"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Eski parol noto'g'ri")
        return value

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        validate_password(value)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save(update_fields=["password"])


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True)


class UploadAvatarSerializer(serializers.Serializer):
    avatar = serializers.ImageField(required=True)


class SubmitResumeFormSerializer(serializers.Serializer):
    vacancy_id = serializers.UUIDField(required=True)
    form_data = serializers.JSONField(required=True)

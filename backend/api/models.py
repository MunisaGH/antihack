from typing import Optional
import secrets
import uuid

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """Maxsus User modeli. Bitta admin + arizachilar (registration-free)."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        APPLICANT = "applicant", "Applicant"

    full_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    telegram_username = models.CharField(max_length=64, blank=True, default="")
    avatar = models.ImageField(upload_to="files/avatars/", null=True, blank=True)

    company_name = models.CharField(max_length=200, blank=True)
    company_location = models.CharField(max_length=200, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.APPLICANT)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "auth_user"

    def save(self, *args, **kwargs):
        # Superuser har doim admin roliga ega bo'lishi kerak.
        if self.is_superuser and self.role != self.Role.ADMIN:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN or self.is_superuser


class Notification(models.Model):
    TYPE_CHOICES = [
        ("info", "Info"),
        ("success", "Success"),
        ("warning", "Warning"),
        ("error", "Error"),
    ]
    user = models.ForeignKey(
        "api.User", on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, default="info")
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.title}"


class Vacancy(models.Model):
    class VacancyStatus(models.TextChoices):
        ACTIVE = "active", "Faol"
        ARCHIVED = "archived", "Arxivlangan"

    STATUS_CHOICES = VacancyStatus.choices

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="vacancies",
    )

    # Ko'p tilli matn maydonlar: {"uz": "...", "ru": "..."}
    title = models.JSONField(default=dict)
    description = models.JSONField(default=dict)
    requirements = models.JSONField(default=dict)
    responsibilities = models.JSONField(default=dict)

    work_type = models.CharField(
        max_length=20,
        choices=[
            ("remote", "Masofaviy"),
            ("office", "Ofisda"),
            ("hybrid", "Aralash"),
        ],
        default="office",
    )
    work_schedule = models.CharField(
        max_length=20,
        choices=[
            ("full-time", "To'liq kunlik"),
            ("part-time", "Yarim kunlik"),
            ("contract", "Shartnoma"),
        ],
        default="full-time",
    )

    salary_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    location = models.CharField(max_length=200)
    experience_years = models.IntegerField(default=0)
    experience_months = models.IntegerField(default=0)

    ai_criteria = models.JSONField(default=dict, blank=True, null=True)
    ai_prompt = models.TextField(blank=True, null=True)
    min_match_score = models.IntegerField(default=70)

    unique_link = models.CharField(max_length=32, unique=True, editable=False)
    status = models.CharField(
        max_length=20, choices=VacancyStatus.choices, default=VacancyStatus.ACTIVE
    )
    views_count = models.IntegerField(default=0)
    applications_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.unique_link:
            self.unique_link = secrets.token_urlsafe(12)
        super().save(*args, **kwargs)

    def __str__(self):
        title = self.title.get("uz") or self.title.get("ru") or "Vacancy"
        return f"{title} @ {self.employer.username}"

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "-created_at"], name="vac_status_created_idx"
            ),
            models.Index(fields=["employer", "status"], name="vac_employer_status_idx"),
        ]


class Application(models.Model):
    class ApplicationStatus(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        AI_ANALYZING = "ai_analyzing", "AI tahlil qilinmoqda"
        REJECTED_RESUME = "rejected_resume", "Resume rad qilindi"
        INTERVIEW_STAGE = "interview_stage", "Suhbat bosqichida"
        INTERVIEW_ABANDONED = "interview_abandoned", "Intervyudan chiqib ketdi"
        REJECTED_INTERVIEW = "rejected_interview", "Suhbat rad qilindi"
        TALENT_POOL = "talent_pool", "Baza sifatida saqlandi"
        ACCEPTED = "accepted", "Qabul qilindi"
        IN_CONTACT = "in_contact", "Aloqada"
        HIRED = "hired", "Ishga qabul qilindi"
        ADMIN_CANCELLED = "admin_cancelled", "Admin tomonidan bekor qilindi"

    STATUS_CHOICES = ApplicationStatus.choices

    vacancy = models.ForeignKey(
        Vacancy, on_delete=models.CASCADE, related_name="applications"
    )

    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    age = models.IntegerField(null=True, blank=True)
    address = models.CharField(max_length=300, blank=True)
    telegram_username = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Telegram username (@ bilan yoki belgisiz)",
    )

    resume_file = models.FileField(upload_to="files/resumes/", null=True, blank=True)
    resume_text = models.TextField(blank=True)
    resume_generated = models.BooleanField(default=False)

    ai_analysis_result = models.JSONField(default=dict)
    # Tahlil 2 tilda saqlanadi: {"uz": {...}, "ru": {...}}
    ai_analysis_translations = models.JSONField(default=dict, blank=True)
    compatibility_score = models.IntegerField(default=0)
    ai_strengths = models.JSONField(default=list)
    ai_weaknesses = models.JSONField(default=list)
    ai_recommendations = models.JSONField(default=list)

    interview_analysis = models.JSONField(default=dict)
    # Intervyu tahlili 2 tilda: {"uz": {...}, "ru": {...}}
    interview_analysis_translations = models.JSONField(default=dict, blank=True)
    interview_score = models.IntegerField(default=0)

    # Psixologik test natijalari (Big Five)
    psychological_test_results = models.JSONField(default=dict, blank=True)

    # Status o'zgarishlar tarixi: [{"status": "pending", "at": "ISO", "by": "admin|system"}]
    status_history = models.JSONField(default=list, blank=True)

    user_language = models.CharField(
        max_length=10,
        default="uz",
        choices=[("uz", "O'zbek"), ("ru", "Русский")],
    )

    status = models.CharField(
        max_length=25,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
    )
    final_score = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

    # Credentials faqat rezyume AI tahlilidan o'tgandan keyin bir marta beriladi.
    credentials_issued_at = models.DateTimeField(null=True, blank=True)

    # Polling va credential recovery uchun token — submit vaqti generatsiya qilinadi,
    # frontend localStorage'da saqlaydi va application_status'ga har polling'da yuboradi.
    poll_token = models.CharField(max_length=64, blank=True, default="")

    # Interview stage'da credentials plaintext saqlab qo'yamiz — brauzer yopilib qaytib
    # kelsa, token to'g'ri bo'lsa, qayta ko'rsatiladi. {"username": "...", "password": "..."}
    demo_credentials = models.JSONField(default=dict, blank=True)

    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-applied_at"]
        unique_together = ["vacancy", "phone"]
        indexes = [
            models.Index(
                fields=["status", "-applied_at"], name="app_status_applied_idx"
            ),
            models.Index(fields=["vacancy", "status"], name="app_vacancy_status_idx"),
            models.Index(fields=["phone"], name="app_phone_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} -> {self.vacancy}"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Eski statusni cache qilib olamiz — save() da qo'shimcha DB query kerak bo'lmaydi
        self._previous_status = None if self._state.adding else self.status

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        # DB'dan o'qilganda _previous_status avtomatik joylab olinadi
        instance._previous_status = instance.status
        return instance

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        previous_status = self._previous_status if not is_new else None

        super().save(*args, **kwargs)

        # Status o'zgargan bo'lsa yoki yangi yozuv bo'lsa — tarixga qo'shamiz
        changed = is_new or (previous_status is not None and previous_status != self.status)
        if not changed:
            return

        entry = {
            "status": self.status,
            "at": timezone.now().isoformat(),
        }
        history = list(self.status_history or [])
        history.append(entry)
        type(self).objects.filter(pk=self.pk).update(status_history=history)
        self.status_history = history
        self._previous_status = self.status

    @classmethod
    def bulk_update_with_history(cls, application_id: int, new_status: str | None = None, **extra_fields) -> None:
        """save() ni chaqirmasdan bir qator maydonlarni yangilaydi, lekin
        status o'zgargan bo'lsa status_history ga avtomatik yozib qo'yadi.

        tasks.py kabi background jobs uchun — bitta SQL UPDATE bilan atomar.
        """
        qs = cls.objects.filter(id=application_id)
        current = qs.values("status", "status_history").first()
        if current is None:
            return

        updates = dict(extra_fields)
        if new_status is not None:
            updates["status"] = new_status
            if current["status"] != new_status:
                history = list(current["status_history"] or [])
                history.append(
                    {"status": new_status, "at": timezone.now().isoformat()}
                )
                updates["status_history"] = history

        if updates:
            qs.update(**updates)

    def clean(self):
        from .validators import validate_resume_file, validate_uz_phone

        if self.phone:
            try:
                validate_uz_phone(self.phone)
            except ValidationError as e:
                raise ValidationError({"phone": str(e)})

        if self.resume_file and hasattr(self.resume_file, "name"):
            try:
                validate_resume_file(self.resume_file)
            except ValidationError as e:
                raise ValidationError({"resume_file": str(e)})

    @property
    def employer(self):
        return self.vacancy.employer


class InterviewSession(models.Model):
    """Adaptiv chat suhbati sessiyasi."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Aktiv"
        COMPLETED = "completed", "Yakunlandi"
        TERMINATED = "terminated", "To'xtatildi"

    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name="interview_session",
    )
    # [{role: 'assistant'|'user', content: '...', at: ISO8601}]
    messages = models.JSONField(default=list)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    questions_asked = models.IntegerField(default=0)
    # Ketma-ket off-topic javoblar soni — yumshoqlik uchun 3 martaga yetganda terminate
    off_topic_strikes = models.IntegerField(default=0)
    termination_reason = models.CharField(max_length=255, blank=True)

    final_score = models.IntegerField(default=0)
    final_analysis = models.JSONField(default=dict)

    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"Interview[{self.status}] for {self.application.full_name}"


class ResumeFormData(models.Model):
    """Rezyume yo'q bo'lganda to'ldiriladigan forma ma'lumotlari."""

    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name="resume_form_data",
    )

    email = models.EmailField(blank=True, default="")
    linkedin_url = models.URLField(blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)

    education_data = models.JSONField(default=list)
    experience_data = models.JSONField(default=list)
    technical_skills = models.JSONField(default=list)
    soft_skills = models.JSONField(default=list)
    languages = models.JSONField(default=list)
    projects_data = models.JSONField(default=list)
    certifications = models.JSONField(default=list)
    summary = models.TextField(blank=True)
    hobbies = models.TextField(blank=True)
    references = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resume Data for {self.application.full_name}"

    def generate_resume_text(self) -> str:
        parts = [
            f"Name: {self.application.full_name}",
            f"Phone: {self.application.phone}",
            f"Email: {self.email}",
        ]
        if self.linkedin_url:
            parts.append(f"LinkedIn: {self.linkedin_url}")
        if self.summary:
            parts.append(f"\nSummary:\n{self.summary}")

        if self.education_data:
            parts.append("\nEducation:")
            for edu in self.education_data:
                parts.append(
                    f"- {edu.get('degree', '')} in {edu.get('field', '')} "
                    f"from {edu.get('institution', '')} ({edu.get('year', '')})"
                )

        if self.experience_data:
            parts.append("\nExperience:")
            for exp in self.experience_data:
                parts.append(
                    f"- {exp.get('position', '')} at {exp.get('company', '')} ({exp.get('duration', '')})"
                )
                if exp.get("description"):
                    parts.append(f"  {exp.get('description')}")

        if self.technical_skills:
            parts.append(f"\nTechnical Skills: {', '.join(self.technical_skills)}")
        if self.soft_skills:
            parts.append(f"Soft Skills: {', '.join(self.soft_skills)}")

        if self.projects_data:
            parts.append("\nProjects:")
            for project in self.projects_data:
                parts.append(
                    f"- {project.get('name', '')}: {project.get('description', '')}"
                )

        return "\n".join(parts)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.application.resume_text:
            self.application.resume_text = self.generate_resume_text()
            self.application.resume_generated = True
            # update_fields — faqat shu maydonlarni yozamiz, status_history o'zgarmaydi
            self.application.save(update_fields=["resume_text", "resume_generated", "updated_at"])


class ApplicantProfile(models.Model):
    """Public ariza topshiruvchilar uchun demo login credential'lari."""

    phone = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=200, blank=True)
    demo_username = models.CharField(max_length=64, unique=True, blank=True)
    demo_password_hash = models.CharField(max_length=128, blank=True)
    session_token = models.CharField(max_length=64, blank=True)
    last_application = models.ForeignKey(
        Application,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applicant_profiles",
    )
    last_issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.phone} ({self.demo_username or 'pending'})"

    def _generate_password(self) -> str:
        return secrets.token_urlsafe(6)

    def _generate_username(self) -> str:
        digits = "".join(filter(str.isdigit, self.phone))
        return f"applicant_{digits}" if digits else f"applicant_{secrets.token_hex(4)}"

    def issue_credentials(self, application: Optional["Application"] = None) -> dict:
        from django.contrib.auth import get_user_model

        UserModel = get_user_model()

        if not self.demo_username:
            self.demo_username = self._generate_username()

        user, created = UserModel.objects.get_or_create(
            username=self.demo_username,
            defaults={
                "email": f"{self.demo_username}@applicant.local",
                "full_name": self.full_name or "",
                "phone": self.phone,
                "is_active": True,
                "role": UserModel.Role.APPLICANT,
            },
        )
        if not created and user.role != UserModel.Role.APPLICANT:
            user.role = UserModel.Role.APPLICANT
            user.save(update_fields=["role"])

        plain_password = self._generate_password()
        user.set_password(plain_password)
        user.save()
        self.demo_password_hash = make_password(plain_password)

        self.session_token = secrets.token_hex(16)
        if application:
            self.last_application = application
            self.full_name = application.full_name
        self.last_issued_at = timezone.now()
        self.save(
            update_fields=[
                "demo_username",
                "demo_password_hash",
                "session_token",
                "last_application",
                "full_name",
                "last_issued_at",
                "updated_at",
            ]
        )

        return {
            "username": self.demo_username,
            "password": plain_password,
            "token": self.session_token,
            "phone": self.phone,
        }


class ContactMessage(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.phone})"

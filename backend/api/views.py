import json
import logging
import secrets

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


class EventStreamRenderer(BaseRenderer):
    """SSE uchun renderer — DRF content negotiation 406 qaytarmasligi uchun."""

    media_type = "text/event-stream"
    format = "event-stream"
    charset = None
    render_style = "binary"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.db.models import Count, Avg, Sum, Q
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.core.paginator import Paginator
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import (
    User,
    Vacancy,
    Application,
    ResumeFormData,
    Notification,
    ApplicantProfile,
    InterviewSession,
)
from .serializers import (
    LoginSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    VacancySerializer,
    VacancyCreateSerializer,
    PublicVacancySerializer,
    ApplicantApplicationSerializer,
    ApplicationSerializer,
    PublicApplicationSerializer,
    NotificationSerializer,
    ContactMessageSerializer,
    LogoutSerializer,
    UploadAvatarSerializer,
    SubmitResumeFormSerializer,
    InterviewSessionSerializer,
    InterviewAnswerInputSerializer,
)
from .services.ai_interview_service import AIInterviewService
from .services.tasks import run_ai_analysis_async
from .services.notifications import (
    notify_new_application,
    notify_interview_complete,
    notify_final_decision,
)
from .throttles import (
    AITranslateThrottle,
    ApplicationStatusThrottle,
    ContactMessageThrottle,
    InterviewActionThrottle,
    InterviewStreamThrottle,
    LoginThrottle,
    PublicVacancyListThrottle,
    SubmitApplicationThrottle,
)
from .permissions import IsAdmin


# ============ Authentication ViewSet ============
@extend_schema_view(
    login=extend_schema(
        summary="Admin login",
        description="JWT token bilan autentifikatsiya qilish",
        request=LoginSerializer,
        responses={200: {"description": "Login successful"}},
        tags=["Authentication"],
    ),
    logout=extend_schema(
        summary="User logout",
        description="Token blacklist qilish",
        request=LogoutSerializer,
        responses={200: {"description": "Logout successful"}},
        tags=["Authentication"],
    ),
    refresh=extend_schema(
        summary="Refresh token",
        description="JWT token yangilash",
        tags=["Authentication"],
    ),
)
class AuthenticationViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    schema_tags = ["Authentication"]

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        throttle_classes=[LoginThrottle],
    )
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]

            # Superuser'ning roli har doim admin bo'lishi kerak — eski userlarni avtomatik tuzatish.
            if user.is_superuser and user.role != User.Role.ADMIN:
                user.role = User.Role.ADMIN
                user.save(update_fields=["role"])

            refresh = RefreshToken.for_user(user)
            effective_role = "admin" if user.is_superuser else user.role

            return Response(
                {
                    "success": True,
                    "message": "Login successful",
                    "token": str(refresh.access_token),
                    "refresh_token": str(refresh),
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "full_name": user.full_name,
                        "phone": user.phone,
                        "role": effective_role,
                        "avatar": request.build_absolute_uri(user.avatar.url)
                        if getattr(user, "avatar", None) and user.avatar
                        else None,
                    },
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": False,
                "message": "Login failed",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def logout(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"success": True, "message": "Logout successful"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Logout failed",
                    "error": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["post"], url_path="refresh", url_name="refresh")
    def refresh(self, request):
        from rest_framework_simplejwt.serializers import TokenRefreshSerializer

        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = serializer.validated_data["refresh"]
        token = RefreshToken(refresh)
        return Response(
            {
                "success": True,
                "access": str(token.access_token),
                "refresh": str(token),
            }
        )


# ============ User Profile ViewSet ============
@extend_schema_view(
    list=extend_schema(
        summary="List user profiles",
        description="Userlar ro'yxati (admin uchun hamma, applicant uchun faqat o'zi)",
        responses={200: UserProfileSerializer(many=True)},
        tags=["Profile"],
    ),
    retrieve=extend_schema(
        summary="Get user profile",
        description="User profilini olish (admin hamma, applicant faqat o'zi)",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="User ID",
            ),
        ],
        responses={200: UserProfileSerializer},
        tags=["Profile"],
    ),
    create=extend_schema(exclude=True),
    update=extend_schema(
        summary="Update user profile",
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer},
        tags=["Profile"],
    ),
    partial_update=extend_schema(
        summary="Partial update user profile",
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer},
        tags=["Profile"],
    ),
    destroy=extend_schema(exclude=True),
    upload_avatar=extend_schema(
        summary="Upload avatar",
        request=UploadAvatarSerializer,
        responses={200: UserProfileSerializer},
        tags=["Profile"],
    ),
    change_password=extend_schema(
        summary="Change password",
        request=ChangePasswordSerializer,
        responses={200: {"description": "Password changed successfully"}},
        tags=["Profile"],
    ),
)
class UserProfileViewSet(viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    schema_tags = ["Profile"]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return User.objects.all().order_by("-date_joined")
        return User.objects.filter(id=user.id)

    def get_object(self):
        user = self.request.user
        obj = super().get_object()
        if user.role == User.Role.APPLICANT and obj.id != user.id:
            raise PermissionDenied("Siz faqat o'z profilingizni ko'rishingiz mumkin")
        return obj

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "data": serializer.data,
                "count": len(serializer.data),
            }
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Profile updated", "data": serializer.data}
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Profile updated", "data": serializer.data}
        )

    @action(detail=False, methods=["get", "patch", "put"])
    def me(self, request):
        user = request.user
        if request.method == "GET":
            data = UserProfileSerializer(user, context={"request": request}).data
            return Response({"success": True, "data": data})
        partial = request.method == "PATCH"
        serializer = UserProfileSerializer(
            user, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Profile updated", "data": serializer.data}
        )

    @action(
        detail=False, methods=["post"], parser_classes=[MultiPartParser, FormParser]
    )
    def upload_avatar(self, request):
        user = request.user
        file_obj = request.data.get("avatar")
        if not file_obj:
            return Response(
                {"success": False, "message": "avatar file is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.avatar = file_obj
        user.save(update_fields=["avatar"])
        data = UserProfileSerializer(user).data
        if data.get("avatar"):
            data["avatar"] = request.build_absolute_uri(data["avatar"])
        return Response({"success": True, "message": "Avatar uploaded", "data": data})

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "message": "Parol muvaffaqiyatli yangilandi"}
            )
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============ Notification ViewSet ============
@extend_schema_view(
    list=extend_schema(
        summary="List notifications",
        responses={200: NotificationSerializer(many=True)},
        tags=["Notifications"],
    ),
    retrieve=extend_schema(
        summary="Get notification",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Notification ID",
            ),
        ],
        responses={200: NotificationSerializer},
        tags=["Notifications"],
    ),
    mark_read=extend_schema(
        summary="Mark notification as read",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Notification ID",
            ),
        ],
        responses={200: {"description": "Notification marked as read"}},
        tags=["Notifications"],
    ),
    mark_all_read=extend_schema(
        summary="Mark all notifications as read",
        responses={200: {"description": "All notifications marked as read"}},
        tags=["Notifications"],
    ),
)
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    schema_tags = ["Notifications"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        unread_count = Notification.objects.filter(
            user=request.user, read_at__isnull=True
        ).count()
        return Response(
            {"success": True, "data": serializer.data, "unread": unread_count}
        )

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.read_at:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response({"success": True})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({"success": True})


# ============ Vacancy ViewSet ============
@extend_schema_view(
    list=extend_schema(
        summary="List vacancies",
        responses={200: VacancySerializer(many=True)},
        tags=["Vacancies"],
    ),
    retrieve=extend_schema(
        summary="Get vacancy",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description="Vacancy UUID",
            ),
        ],
        responses={200: VacancySerializer},
        tags=["Vacancies"],
    ),
    create=extend_schema(
        summary="Create vacancy",
        request=VacancyCreateSerializer,
        responses={201: VacancySerializer},
        tags=["Vacancies"],
    ),
    update=extend_schema(
        summary="Update vacancy",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description="Vacancy UUID",
            ),
        ],
        request=VacancyCreateSerializer,
        responses={200: VacancySerializer},
        tags=["Vacancies"],
    ),
    partial_update=extend_schema(
        summary="Partial update vacancy",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description="Vacancy UUID",
            ),
        ],
        request=VacancyCreateSerializer,
        responses={200: VacancySerializer},
        tags=["Vacancies"],
    ),
    destroy=extend_schema(
        summary="Delete vacancy",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description="Vacancy UUID",
            ),
        ],
        responses={204: {"description": "Vacancy deleted"}},
        tags=["Vacancies"],
    ),
)
class VacancyViewSet(viewsets.ModelViewSet):
    queryset = Vacancy.objects.select_related("employer").all()
    permission_classes = [IsAuthenticated, IsAdmin]
    schema_tags = ["Vacancies"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return VacancyCreateSerializer
        return VacancySerializer

    def perform_create(self, serializer):
        serializer.save(employer=self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(VacancySerializer(serializer.instance).data)

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            vacancy_data = VacancySerializer(serializer.instance).data
            return Response(
                {
                    "success": True,
                    "message": "Vacancy created successfully",
                    "data": vacancy_data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Vacancy creation failed",
                    "error": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=False,
        methods=["post"],
        url_path="ai_generate",
        permission_classes=[IsAuthenticated, IsAdmin],
        throttle_classes=[AITranslateThrottle],
    )
    def ai_generate(self, request):
        """Admin qisqa tavsifidan to'liq UZ vakansiya ma'lumotlarini yaratadi."""
        from .services.ai_vacancy_generator import AIVacancyGenerator

        brief = (request.data.get("brief") or "").strip()
        if len(brief) < 5:
            return Response(
                {"success": False, "message": "Tavsif juda qisqa (kamida 5 ta belgi)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            generator = AIVacancyGenerator()
            result = generator.generate_from_brief(brief)
            return Response({"success": True, "data": result})
        except Exception as e:
            return Response(
                {"success": False, "message": f"Generation failed: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=False,
        methods=["post"],
        url_path="ai_translate",
        permission_classes=[IsAuthenticated, IsAdmin],
        throttle_classes=[AITranslateThrottle],
    )
    def ai_translate(self, request):
        """UZ vakansiya matnlarini Gemini orqali RU ga tarjima qiladi."""
        from .services.ai_translate import AIVacancyTranslator

        title = (request.data.get("title") or "").strip()
        description = (request.data.get("description") or "").strip()
        requirements = (request.data.get("requirements") or "").strip()
        responsibilities = (request.data.get("responsibilities") or "").strip()

        if not title:
            return Response(
                {"success": False, "message": "title maydoni majburiy"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            translator = AIVacancyTranslator()
            result = translator.translate_uz_to_ru(
                {
                    "title": title,
                    "description": description,
                    "requirements": requirements,
                    "responsibilities": responsibilities,
                }
            )
            return Response({"success": True, "data": result})
        except Exception as e:
            return Response(
                {"success": False, "message": f"Translation failed: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============ Application ViewSet ============
@extend_schema_view(
    list=extend_schema(
        summary="List applications",
        responses={200: ApplicationSerializer(many=True)},
        tags=["Applications"],
    ),
    retrieve=extend_schema(
        summary="Get application",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Application ID",
            ),
        ],
        responses={200: ApplicationSerializer},
        tags=["Applications"],
    ),
    create=extend_schema(exclude=True),
    update=extend_schema(
        summary="Update application",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Application ID",
            ),
        ],
        request=ApplicationSerializer,
        responses={200: ApplicationSerializer},
        tags=["Applications"],
    ),
    partial_update=extend_schema(
        summary="Partial update application",
        parameters=[
            OpenApiParameter(
                "id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Application ID",
            ),
        ],
        request=ApplicationSerializer,
        responses={200: ApplicationSerializer},
        tags=["Applications"],
    ),
    destroy=extend_schema(exclude=True),
)
class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    queryset = (
        Application.objects.select_related("vacancy", "vacancy__employer")
        .all()
        .order_by("-applied_at")
    )
    permission_classes = [IsAuthenticated, IsAdmin]
    schema_tags = ["Applications"]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        vacancy_id = params.get("vacancy")
        status_filter = params.get("status")
        phone = params.get("phone")
        search = params.get("search")
        if vacancy_id:
            qs = qs.filter(vacancy_id=vacancy_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if phone:
            qs = qs.filter(phone__icontains=phone)
        if search:
            qs = qs.filter(full_name__icontains=search)
        return qs

    def create(self, request, *args, **kwargs):
        return Response(
            {
                "success": False,
                "message": "Application yaratish uchun /api/public/submit_application/ endpointidan foydalaning",
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_status = instance.status

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        new_status = instance.status
        if old_status != new_status:
            if new_status == Application.ApplicationStatus.HIRED:
                notify_final_decision(instance, hired=True)
            elif new_status == Application.ApplicationStatus.ACCEPTED:
                notify_interview_complete(instance, passed=True)
            elif new_status == Application.ApplicationStatus.REJECTED_INTERVIEW:
                notify_interview_complete(instance, passed=False)

        return Response(
            {"success": True, "message": "Application updated", "data": serializer.data}
        )

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs, partial=True)


# ============ Applicants ViewSet (phone bo'yicha odamlar) ============
class ApplicantsViewSet(viewsets.ViewSet):
    """Unique odamlar (phone bo'yicha) + ularning barcha arizalari."""

    permission_classes = [IsAuthenticated, IsAdmin]
    schema_tags = ["Applicants"]

    def list(self, request):
        """Har bir phone uchun — eng so'nggi ma'lumot + arizalari soni."""
        lang = request.query_params.get("lang", "uz")
        search = (request.query_params.get("search") or "").strip()

        apps = (
            Application.objects.select_related("vacancy", "vacancy__employer")
            .order_by("phone", "-applied_at")
        )
        if search:
            apps = apps.filter(
                Q(full_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(telegram_username__icontains=search)
            )

        profiles: dict = {}
        for app in apps:
            key = app.phone
            if key not in profiles:
                title_val = app.vacancy.title if app.vacancy else None
                if isinstance(title_val, dict):
                    title = title_val.get(lang) or title_val.get("uz") or ""
                else:
                    title = title_val or ""
                profiles[key] = {
                    "phone": app.phone,
                    "full_name": app.full_name,
                    "age": app.age,
                    "address": app.address,
                    "telegram_username": app.telegram_username or "",
                    "last_applied_at": app.applied_at.isoformat(),
                    "last_status": app.status,
                    "last_vacancy_title": title,
                    "last_vacancy_id": str(app.vacancy_id) if app.vacancy_id else None,
                    "applications_count": 1,
                }
            else:
                profiles[key]["applications_count"] += 1

        data = sorted(
            profiles.values(), key=lambda p: p["last_applied_at"], reverse=True
        )
        return Response({"success": True, "data": data, "count": len(data)})

    @action(
        detail=False,
        methods=["get"],
        url_path=r"by_phone/(?P<phone>[+0-9]+)",
    )
    def by_phone(self, request, phone=None):
        """Bitta phone bo'yicha — shaxsiy ma'lumot + barcha arizalari."""
        apps = (
            Application.objects.filter(phone=phone)
            .select_related("vacancy", "vacancy__employer", "interview_session")
            .order_by("-applied_at")
        )
        if not apps.exists():
            return Response(
                {"success": False, "message": "Nomzod topilmadi"},
                status=status.HTTP_404_NOT_FOUND,
            )

        first = apps.first()
        serializer = ApplicationSerializer(
            apps, many=True, context={"request": request}
        )
        data = {
            "phone": first.phone,
            "full_name": first.full_name,
            "age": first.age,
            "address": first.address,
            "telegram_username": first.telegram_username or "",
            "applications_count": apps.count(),
            "first_applied_at": apps.last().applied_at.isoformat(),
            "last_applied_at": first.applied_at.isoformat(),
            "applications": serializer.data,
        }
        return Response({"success": True, "data": data})


# ============ Analytics ViewSet ============
@extend_schema_view(
    stats=extend_schema(
        summary="Get analytics stats",
        description="Admin analytics va dashboard statistikasi (birlashtirilgan)",
        responses={200: {"description": "Analytics statistics"}},
        tags=["Analytics"],
    ),
)
class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]
    schema_tags = ["Analytics"]

    @action(detail=False, methods=["get"])
    def stats(self, request):
        from datetime import timedelta
        from django.core.cache import cache

        cache_key = f"analytics:stats:{request.user.id}:{request.query_params.get('lang', 'uz')}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        vacancies = Vacancy.objects.all()
        total_vacancies = vacancies.count()
        active_vacancies = vacancies.filter(status="active").count()
        total_applications = Application.objects.count()
        now = timezone.now()
        prev_month = now.replace(day=1) - timezone.timedelta(days=1)
        current_month_apps = Application.objects.filter(
            applied_at__year=now.year,
            applied_at__month=now.month,
        ).count()
        prev_month_apps = Application.objects.filter(
            applied_at__year=prev_month.year,
            applied_at__month=prev_month.month,
        ).count()
        total_views = vacancies.aggregate(total=Sum("views_count"))["total"] or 0
        if prev_month_apps == 0:
            applications_trend_percent = 100 if current_month_apps > 0 else 0
        else:
            applications_trend_percent = round(
                (current_month_apps - prev_month_apps) / prev_month_apps * 100, 2
            )
        recent_applications = Application.objects.select_related(
            "vacancy", "vacancy__employer"
        ).order_by("-applied_at")[:10]

        applications_by_status = Application.objects.values("status").annotate(
            count=Count("id")
        )
        monthly_data = []
        for i in range(6):
            date = timezone.now() - timedelta(days=30 * i)
            month_applications = Application.objects.filter(
                applied_at__month=date.month,
                applied_at__year=date.year,
            ).count()
            monthly_data.append(
                {"month": date.strftime("%Y-%m"), "count": month_applications}
            )
        top_vacancies = Vacancy.objects.annotate(
            application_count=Count("applications"),
        ).order_by("-application_count")[:5]
        avg_score = (
            Application.objects.filter(
                compatibility_score__gt=0,
            ).aggregate(avg_score=Avg("compatibility_score"))["avg_score"]
            or 0
        )
        total_interviews = Application.objects.filter(
            status__in=["accepted", "rejected_interview"],
        ).count()
        successful_interviews = Application.objects.filter(status="accepted").count()
        interview_success_rate = (
            (successful_interviews / total_interviews * 100)
            if total_interviews > 0
            else 0
        )

        active_users = User.objects.filter(is_active=True).count()
        top_locations = (
            Vacancy.objects.filter(status="active")
            .values("location")
            .annotate(
                count=Count("id"),
            )
            .order_by("-count")[:5]
        )

        payload = {
            "success": True,
            "data": {
                "vacancies": total_vacancies,
                "activeVacancies": active_vacancies,
                "applications": total_applications,
                "currentMonthApplications": current_month_apps,
                "previousMonthApplications": prev_month_apps,
                "applicationsTrendPercent": applications_trend_percent,
                "totalViews": total_views,
                "recentApplications": ApplicationSerializer(
                    recent_applications, many=True, context={"request": request}
                ).data,
                "applications_by_status": list(applications_by_status),
                "applications_by_month": monthly_data,
                "top_vacancies": VacancySerializer(
                    top_vacancies, many=True, context={"request": request}
                ).data,
                "average_compatibility_score": round(avg_score, 2),
                "interview_success_rate": round(interview_success_rate, 2),
                "active_users": active_users,
                "top_locations": list(top_locations),
            },
        }
        cache.set(cache_key, payload, timeout=60)  # 1 min cache
        return Response(payload)


# ============ Public ViewSet ============
@extend_schema_view(
    vacancies=extend_schema(
        summary="List public vacancies",
        parameters=[
            OpenApiParameter(
                "location", OpenApiTypes.STR, description="Location filter"
            ),
            OpenApiParameter(
                "work_type", OpenApiTypes.STR, description="Work type filter"
            ),
            OpenApiParameter(
                "experience_min", OpenApiTypes.INT, description="Minimum experience"
            ),
            OpenApiParameter(
                "salary_min", OpenApiTypes.DECIMAL, description="Minimum salary"
            ),
            OpenApiParameter("page", OpenApiTypes.INT, description="Page number"),
        ],
        responses={200: {"description": "Public vacancies list"}},
        tags=["Public"],
    ),
    submit_application=extend_schema(
        summary="Submit application",
        request=PublicApplicationSerializer,
        responses={201: {"description": "Application submitted"}},
        tags=["Public"],
    ),
    submit_contact_message=extend_schema(
        summary="Submit contact message",
        request=ContactMessageSerializer,
        responses={201: ContactMessageSerializer},
        tags=["Public"],
    ),
    submit_resume_form=extend_schema(
        summary="Submit resume form",
        request=SubmitResumeFormSerializer,
        responses={201: {"description": "Application submitted"}},
        tags=["Public"],
    ),
    my_applications=extend_schema(
        summary="Get my applications",
        responses={200: ApplicationSerializer(many=True)},
        tags=["Public"],
    ),
    start_interview=extend_schema(
        summary="Start interview session",
        description="Interview sessiyasini boshlash (chat-based adaptiv suhbat).",
        responses={200: InterviewSessionSerializer},
        tags=["Public"],
    ),
    stream_interview_question=extend_schema(
        summary="Stream next interview question",
        description="Keyingi suhbat savolini SSE orqali streaming qilish.",
        parameters=[
            OpenApiParameter(
                "application_id",
                OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Application ID",
            ),
        ],
        responses={200: {"description": "Server-sent events stream"}},
        tags=["Public"],
    ),
    submit_interview_answer=extend_schema(
        summary="Submit interview answer",
        description="Joriy savolga javob yuborish. Mavzudan chetga chiqsa, sessiya to'xtatiladi.",
        request=InterviewAnswerInputSerializer,
        responses={200: {"description": "Answer accepted"}},
        tags=["Public"],
    ),
    finalize_interview=extend_schema(
        summary="Finalize interview",
        description="Suhbatni yakunlash va yakuniy baholashni hisoblash.",
        responses={200: {"description": "Interview finalized"}},
        tags=["Public"],
    ),
)
class PublicViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    schema_tags = ["Public"]

    def _issue_demo_credentials(self, application):
        profile, _ = ApplicantProfile.objects.get_or_create(
            phone=application.phone,
            defaults={"full_name": application.full_name or ""},
        )
        return profile.issue_credentials(application=application)

    def _get_user_language(self, request):
        lang = request.query_params.get("lang", None)
        if lang and lang in ("uz", "ru"):
            return lang
        accept_lang = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
        if accept_lang:
            lang = accept_lang.split(",")[0].split(";")[0].strip()[:2]
            if lang in ("uz", "ru"):
                return lang
        return "uz"

    def _check_interview_ownership(self, request, application) -> bool:
        """Faqat ariza egasi (login qilgan applicant) yoki admin intervyuga kirishi mumkin."""
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if (
            getattr(user, "is_superuser", False)
            or getattr(user, "role", None) == User.Role.ADMIN
        ):
            return True
        return bool(user.phone) and user.phone == application.phone

    @action(detail=False, methods=["get"], throttle_classes=[PublicVacancyListThrottle])
    def vacancies(self, request):
        vacancies = (
            Vacancy.objects.filter(
                status="active",
                employer__is_active=True,
            )
            .select_related("employer")
            .order_by("-created_at")
        )
        location = request.GET.get("location")
        work_type = request.GET.get("work_type")
        experience_min = request.GET.get("experience_min")
        salary_min = request.GET.get("salary_min")
        if location:
            vacancies = vacancies.filter(location__icontains=location)
        if work_type:
            vacancies = vacancies.filter(work_type=work_type)
        if experience_min:
            vacancies = vacancies.filter(experience_years__gte=experience_min)
        if salary_min:
            vacancies = vacancies.filter(salary_min__gte=salary_min)
        page = request.GET.get("page", 1)
        paginator = Paginator(vacancies, 20)
        page_obj = paginator.get_page(page)
        return Response(
            {
                "success": True,
                "data": {
                    "vacancies": PublicVacancySerializer(
                        page_obj, many=True, context={"request": request}
                    ).data,
                    "total_pages": paginator.num_pages,
                    "current_page": page_obj.number,
                    "total_count": paginator.count,
                },
            }
        )

    @action(
        detail=False,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        throttle_classes=[SubmitApplicationThrottle],
    )
    def submit_application(self, request):
        serializer = PublicApplicationSerializer(data=request.data)
        if not serializer.is_valid():
            # Xatolarni batafsil log qilamiz — Telegram browser, eski mobile va boshqa edge case'larni oldini olish uchun
            ua = request.META.get("HTTP_USER_AGENT", "")[:200]
            uploaded = request.FILES.get("resume_file")
            file_info = {}
            if uploaded:
                file_info = {
                    "name": getattr(uploaded, "name", None),
                    "size": getattr(uploaded, "size", None),
                    "content_type": getattr(uploaded, "content_type", None),
                }
            logger.warning(
                "submit_application validation failed: errors=%s | UA=%s | file=%s",
                dict(serializer.errors),
                ua,
                file_info,
            )

            # Foydalanuvchiga tushunarli xabar — qaysi maydonlar noto'g'ri
            field_errors = {}
            for field, msgs in serializer.errors.items():
                if isinstance(msgs, list):
                    field_errors[field] = [str(m) for m in msgs]
                else:
                    field_errors[field] = [str(msgs)]

            first_error_msg = None
            for msgs in field_errors.values():
                if msgs:
                    first_error_msg = msgs[0]
                    break

            return Response(
                {
                    "success": False,
                    "message": first_error_msg or "Ma'lumotlar noto'g'ri",
                    "errors": field_errors,
                    "detail": first_error_msg,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validated = serializer.validated_data
            vacancy_uuid = validated["vacancy"]
            phone = validated["phone"]

            try:
                vacancy = Vacancy.objects.select_related("employer").get(
                    pk=vacancy_uuid, status="active"
                )
            except Vacancy.DoesNotExist:
                return Response(
                    {"success": False, "message": "Vakansiya topilmadi"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Formadan kelsa foydalanuvchi tiliga, bo'lmasa request'dan
            user_language = validated.get("user_language") or self._get_user_language(request)

            existing_application = Application.objects.filter(
                vacancy=vacancy,
                phone=phone,
            ).first()

            if existing_application:
                return Response(
                    {
                        "success": False,
                        "message": "Siz allaqachon bu vakansiyaga ariza topshirgansiz",
                        "application_id": str(existing_application.id),
                        "status": existing_application.status,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            application = Application.objects.create(
                vacancy=vacancy,
                full_name=validated["full_name"],
                phone=phone,
                age=validated.get("age"),
                address=validated.get("address", ""),
                telegram_username=validated.get("telegram_username", ""),
                resume_file=validated.get("resume_file"),
                user_language=user_language,
                status="ai_analyzing",
                poll_token=secrets.token_urlsafe(32),
            )

            vacancy.applications_count += 1
            vacancy.save(update_fields=["applications_count"])

            notify_new_application(application)
            run_ai_analysis_async(application.id)

            return Response(
                {
                    "success": True,
                    "message": "Application submitted. AI analysis in progress.",
                    "application_id": application.id,
                    "status": application.status,
                    "poll_token": application.poll_token,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.exception(
                "submit_application processing failed: UA=%s",
                request.META.get("HTTP_USER_AGENT", "")[:200],
            )
            return Response(
                {
                    "success": False,
                    "message": "Application processing failed",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"application_status/(?P<application_id>\d+)",
        permission_classes=[AllowAny],
        throttle_classes=[ApplicationStatusThrottle],
    )
    def application_status(self, request, application_id=None):
        """Ariza holatini olish. Credentials faqat to'g'ri poll_token bilan qaytariladi.

        Token tekshiruvi:
        - Header: X-Poll-Token, yoki
        - Query param: token

        Token mos kelsa — credentials (agar interview_stage'da bo'lsa) qaytariladi.
        Brauzerni yopib qaytib kelgan user ham xuddi shu credentialsni oladi (localStorage'dan token bilan).
        """
        try:
            application = Application.objects.select_related("vacancy").get(
                id=application_id
            )
        except Application.DoesNotExist:
            return Response(
                {"success": False, "message": "Application not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Token — header yoki query param
        provided_token = (
            request.headers.get("X-Poll-Token")
            or request.query_params.get("token")
            or ""
        )
        token_valid = bool(
            provided_token
            and application.poll_token
            and secrets.compare_digest(provided_token, application.poll_token)
        )

        result = {
            "application_id": application.id,
            "status": application.status,
            "compatibility_score": application.compatibility_score,
            "psychological_test_done": bool(application.psychological_test_results),
            "psychological_test_results": application.psychological_test_results,
        }

        if application.status == Application.ApplicationStatus.REJECTED_RESUME:
            result["reason"] = "resume_not_matched"
            result["feedback"] = application.ai_analysis_result.get(
                "detailed_feedback", ""
            )

        elif application.status == Application.ApplicationStatus.INTERVIEW_STAGE:
            # Credentials faqat to'g'ri token bilan ko'rsatiladi
            if token_valid:
                if not application.demo_credentials:
                    credentials = self._issue_demo_credentials(application)
                    application.demo_credentials = credentials
                    application.credentials_issued_at = timezone.now()
                    application.save(
                        update_fields=[
                            "demo_credentials",
                            "credentials_issued_at",
                            "updated_at",
                        ]
                    )
                result["credentials"] = application.demo_credentials

        return Response({"success": True, "data": result})

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[ContactMessageThrottle],
    )
    def submit_contact_message(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            msg = serializer.save()
            return Response(
                {
                    "success": True,
                    "message": "Contact message received",
                    "data": ContactMessageSerializer(msg).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["post"])
    def submit_resume_form(self, request):
        vacancy_id = request.data.get("vacancy_id")
        form_data = request.data.get("form_data")
        if not vacancy_id or not form_data:
            return Response(
                {
                    "success": False,
                    "message": "vacancy_id and form_data required",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            vacancy = Vacancy.objects.get(id=vacancy_id, status="active")
            phone = form_data.get("phone")

            existing_application = Application.objects.filter(
                vacancy=vacancy_id,
                phone=phone,
            ).first()

            if existing_application:
                return Response(
                    {
                        "success": False,
                        "message": "Siz allaqachon bu vakansiyaga ariza topshirgansiz",
                        "application_id": str(existing_application.id),
                        "status": existing_application.status,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user_language = form_data.get("user_language") or self._get_user_language(request)

            application = Application.objects.create(
                vacancy=vacancy,
                full_name=form_data.get("full_name"),
                phone=phone,
                age=form_data.get("age"),
                address=form_data.get("address", ""),
                telegram_username=form_data.get("telegram_username", ""),
                resume_generated=True,
                status="ai_analyzing",
                user_language=user_language,
                poll_token=secrets.token_urlsafe(32),
            )
            ResumeFormData.objects.create(
                application=application,
                email=form_data.get("email", "") or "",
                linkedin_url=form_data.get("linkedin_url"),
                portfolio_url=form_data.get("portfolio_url"),
                education_data=form_data.get("education_data", []),
                experience_data=form_data.get("experience_data", []),
                technical_skills=form_data.get("technical_skills", []),
                soft_skills=form_data.get("soft_skills", []),
                languages=form_data.get("languages", []),
                projects_data=form_data.get("projects_data", []),
                certifications=form_data.get("certifications", []),
                summary=form_data.get("summary", ""),
                hobbies=form_data.get("hobbies", ""),
                references=form_data.get("references", []),
            )
            vacancy.applications_count += 1
            vacancy.save(update_fields=["applications_count"])

            notify_new_application(application)
            run_ai_analysis_async(application.id)

            # Credentials fayl yuklash oqimi bilan bir xil — polling orqali keyin
            return Response(
                {
                    "success": True,
                    "message": "Application submitted. AI analysis in progress.",
                    "application_id": application.id,
                    "status": application.status,
                    "poll_token": application.poll_token,
                },
                status=status.HTTP_201_CREATED,
            )
        except Vacancy.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Vacancy not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Application submission failed",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_applications(self, request):
        user = request.user

        if user.role != User.Role.APPLICANT:
            return Response(
                {
                    "success": False,
                    "message": "Bu endpoint faqat applicant userlar uchun",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.phone:
            # Bo'sh phone bo'lsa barcha empty phone'li arizalar ko'rinib qolmaydi
            return Response({"success": True, "data": [], "count": 0})

        applications = (
            Application.objects.filter(phone=user.phone)
            .select_related("vacancy", "vacancy__employer", "interview_session")
            .order_by("-applied_at")
        )

        serializer = ApplicantApplicationSerializer(
            applications, many=True, context={"request": request}
        )
        return Response(
            {
                "success": True,
                "data": serializer.data,
                "count": len(serializer.data),
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"my_application/(?P<application_id>\d+)",
        permission_classes=[IsAuthenticated],
    )
    def my_application(self, request, application_id=None):
        """Applicant o'z bitta arizasini detal bilan ko'radi."""
        user = request.user
        if user.role != User.Role.APPLICANT:
            return Response(
                {"success": False, "message": "Faqat applicant uchun"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.phone:
            return Response(
                {"success": False, "message": "Ariza topilmadi"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            application = (
                Application.objects.select_related(
                    "vacancy", "vacancy__employer", "interview_session"
                )
                .filter(phone=user.phone)
                .get(id=application_id)
            )
        except Application.DoesNotExist:
            return Response(
                {"success": False, "message": "Ariza topilmadi"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ApplicantApplicationSerializer(
            application, context={"request": request}
        )
        return Response({"success": True, "data": serializer.data})

    @action(
        detail=False,
        methods=["get"],
        url_path="contact_info",
        permission_classes=[AllowAny],
    )
    def contact_info(self, request):
        """Nomzodga ko'rsatish uchun — admin bilan bog'lanish ma'lumotlari."""
        admin = (
            User.objects.filter(role=User.Role.ADMIN, is_active=True)
            .order_by("id")
            .first()
        )
        if not admin:
            return Response(
                {"success": True, "data": None, "message": "Admin topilmadi"}
            )

        data = {
            "full_name": admin.full_name or admin.username,
            "company_name": admin.company_name,
            "phone": admin.phone,
            "email": admin.email,
            "telegram_username": (admin.telegram_username or "").lstrip("@"),
        }
        return Response({"success": True, "data": data})

    # ==================== Interview chat endpoints ====================
    @action(
        detail=False,
        methods=["post"],
        url_path="interview/start",
        permission_classes=[IsAuthenticated],
        throttle_classes=[InterviewActionThrottle],
    )
    def start_interview(self, request):
        application_id = request.data.get("application_id")
        if not application_id:
            return Response(
                {"success": False, "message": "application_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            application = Application.objects.select_related(
                "vacancy", "vacancy__employer"
            ).get(id=application_id)
        except Application.DoesNotExist:
            return Response(
                {"success": False, "message": "Application not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._check_interview_ownership(request, application):
            return Response(
                {"success": False, "message": "Forbidden"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if application.status != Application.ApplicationStatus.INTERVIEW_STAGE:
            return Response(
                {
                    "success": False,
                    "message": "Application is not at interview stage",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        service = AIInterviewService()
        session = service.start_session(application)
        return Response(
            {
                "success": True,
                "data": {
                    "session_id": session.id,
                    "status": session.status,
                    "questions_asked": session.questions_asked,
                    "max_questions": service.max_questions,
                    "messages": session.messages,
                },
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"interview/stream/(?P<application_id>[^/.]+)",
        permission_classes=[IsAuthenticated],
        renderer_classes=[EventStreamRenderer],
        throttle_classes=[InterviewStreamThrottle],
    )
    def stream_interview_question(self, request, application_id=None):
        try:
            application = Application.objects.select_related(
                "vacancy", "vacancy__employer"
            ).get(id=application_id)
        except Application.DoesNotExist:
            return Response(
                {"success": False, "message": "Application not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._check_interview_ownership(request, application):
            return Response(
                {"success": False, "message": "Forbidden"},
                status=status.HTTP_403_FORBIDDEN,
            )
        service = AIInterviewService()
        session = service.start_session(application)

        def event_stream():
            try:
                for chunk in service.stream_next_question(session):
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                session.refresh_from_db()
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "done",
                            "questions_asked": session.questions_asked,
                            "status": session.status,
                        }
                    )
                    + "\n\n"
                )
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    @action(
        detail=False,
        methods=["post"],
        url_path="interview/answer",
        permission_classes=[IsAuthenticated],
        throttle_classes=[InterviewActionThrottle],
    )
    def submit_interview_answer(self, request):
        application_id = request.data.get("application_id")
        answer = (request.data.get("answer") or "").strip()
        typing_metrics = request.data.get("typing_metrics") or {}
        if not isinstance(typing_metrics, dict):
            typing_metrics = {}
        if not application_id or not answer:
            return Response(
                {
                    "success": False,
                    "message": "application_id and answer required",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            application = Application.objects.select_related(
                "vacancy", "interview_session"
            ).get(id=application_id)
            session = application.interview_session
        except (Application.DoesNotExist, InterviewSession.DoesNotExist):
            return Response(
                {"success": False, "message": "Session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._check_interview_ownership(request, application):
            return Response(
                {"success": False, "message": "Forbidden"},
                status=status.HTTP_403_FORBIDDEN,
            )
        service = AIInterviewService()
        result = service.submit_answer(session, answer, typing_metrics=typing_metrics)
        return Response({"success": result["ok"], "data": result})

    @action(
        detail=False,
        methods=["post"],
        url_path="interview/abandon",
        permission_classes=[AllowAny],  # sendBeacon auth header yubormaydi
        throttle_classes=[InterviewActionThrottle],
    )
    def abandon_interview(self, request):
        """Foydalanuvchi 3 daqiqa harakatsiz yoki tab yopilganda chaqiriladi.

        sendBeacon yordamida chaqiriladi — shuning uchun permission AllowAny.
        Sessiya egaligini token yoki applicant user'ga qarab tekshiramiz.
        """
        application_id = request.data.get("application_id")
        if not application_id:
            return Response(
                {"success": False, "message": "application_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            application = Application.objects.select_related(
                "interview_session"
            ).get(id=application_id)
            session = application.interview_session
        except (Application.DoesNotExist, InterviewSession.DoesNotExist):
            return Response(
                {"success": False, "message": "Session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if session.status != InterviewSession.Status.ACTIVE:
            # Allaqachon tugagan — OK, idempotent
            return Response({"success": True, "message": "already_ended"})

        session.status = InterviewSession.Status.TERMINATED
        session.termination_reason = "user_abandoned"
        session.ended_at = timezone.now()
        session.save(
            update_fields=["status", "termination_reason", "ended_at", "updated_at"]
        )

        # Application statusini ham "Intervyudan chiqib ketdi" ga o'zgartiramiz
        if application.status == Application.ApplicationStatus.INTERVIEW_STAGE:
            application.status = Application.ApplicationStatus.INTERVIEW_ABANDONED
            application.save(update_fields=["status", "updated_at"])

        return Response({"success": True, "message": "session_abandoned"})

    @action(
        detail=False,
        methods=["post"],
        url_path="interview/finalize",
        permission_classes=[IsAuthenticated],
        throttle_classes=[InterviewActionThrottle],
    )
    def finalize_interview(self, request):
        application_id = request.data.get("application_id")
        if not application_id:
            return Response(
                {"success": False, "message": "application_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            application = Application.objects.select_related(
                "vacancy", "interview_session"
            ).get(id=application_id)
            session = application.interview_session
        except (Application.DoesNotExist, InterviewSession.DoesNotExist):
            return Response(
                {"success": False, "message": "Session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._check_interview_ownership(request, application):
            return Response(
                {"success": False, "message": "Forbidden"},
                status=status.HTTP_403_FORBIDDEN,
            )
        service = AIInterviewService()
        analysis = service.finalize(session)

        threshold = settings.AI_SETTINGS.get("MIN_COMPATIBILITY_SCORE", 60)
        if session.status == InterviewSession.Status.TERMINATED:
            application.status = Application.ApplicationStatus.REJECTED_INTERVIEW
            notify_interview_complete(application, passed=False)
        elif analysis.get("total_score", 0) >= threshold:
            application.status = Application.ApplicationStatus.ACCEPTED
            notify_interview_complete(application, passed=True)
        else:
            application.status = Application.ApplicationStatus.REJECTED_INTERVIEW
            notify_interview_complete(application, passed=False)
        application.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "success": True,
                "data": {
                    "session_id": session.id,
                    "status": session.status,
                    "final_score": session.final_score,
                    "analysis": analysis,
                },
            }
        )

    @extend_schema(
        summary="Get psychological test questions",
        description="Psixologik test (Big Five) uchun 20 ta savolni qaytaradi.",
        responses={200: {"description": "List of questions"}},
        tags=["Public"]
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="interview/psychological-test",
        permission_classes=[IsAuthenticated]
    )
    def psychological_test(self, request):
        from .services.psychology import BFI_20_QUESTIONS
        return Response({
            "success": True,
            "data": BFI_20_QUESTIONS
        })

    @extend_schema(
        summary="Submit psychological test",
        description="Psixologik test natijalarini yuborish va baholash.",
        request=OpenApiTypes.OBJECT,
        responses={200: {"description": "Test results"}},
        tags=["Public"]
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="interview/psychological-test/submit",
        permission_classes=[IsAuthenticated]
    )
    def submit_psychological_test(self, request):
        application_id = request.data.get("application_id")
        answers = request.data.get("answers")
        
        if not application_id or not isinstance(answers, dict):
            return Response(
                {"success": False, "message": "application_id and answers (dict) required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            application = Application.objects.select_related("vacancy").get(id=application_id)
        except Application.DoesNotExist:
            return Response(
                {"success": False, "message": "Application not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        if not self._check_interview_ownership(request, application):
            return Response(
                {"success": False, "message": "Forbidden"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from .services.psychology import evaluate_psychological_test
        result = evaluate_psychological_test(answers)
        
        application.psychological_test_results = result
        application.save(update_fields=["psychological_test_results", "updated_at"])
        
        return Response({
            "success": True,
            "data": result
        })

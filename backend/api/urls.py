from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny

from .throttles import PublicVacancyThrottle
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from . import views
from .models import Vacancy
from .serializers import PublicVacancySerializer

router = DefaultRouter()
# Profile (tepaga chiqarildi)
router.register(r"profile", views.UserProfileViewSet, basename="profile")
# Authentication
router.register(r"auth", views.AuthenticationViewSet, basename="auth")
# Notifications
router.register(r"notifications", views.NotificationViewSet, basename="notification")
# CRUD Operations
router.register(r"vacancies", views.VacancyViewSet, basename="vacancy")
# Applications (with AI agent)
router.register(r"applications", views.ApplicationViewSet, basename="application")
# Applicants (aggregated by phone)
router.register(r"applicants", views.ApplicantsViewSet, basename="applicants")
# Analytics
router.register(r"analytics", views.AnalyticsViewSet, basename="analytics")
# Public endpoints
router.register(r"public", views.PublicViewSet, basename="public")


@extend_schema(
    summary="Get public vacancy detail",
    description="Unique link orqali vakansiya ma'lumotlarini olish",
    responses={200: PublicVacancySerializer},
    tags=["Public"],
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PublicVacancyThrottle])
def public_vacancy_detail(request, unique_link):
    """Public vacancy view - unique link orqali"""
    try:
        vacancy = Vacancy.objects.select_related("employer").get(
            unique_link=unique_link, status="active"
        )
        vacancy.views_count += 1
        vacancy.save(update_fields=["views_count"])
        serializer = PublicVacancySerializer(vacancy, context={"request": request})
        return Response({"success": True, "data": serializer.data})
    except Vacancy.DoesNotExist:
        return Response(
            {"success": False, "message": "Vacancy not found or inactive"},
            status=status.HTTP_404_NOT_FOUND,
        )


urlpatterns = [
    # Router URLs (auth/refresh/ endpoint AuthenticationViewSet ichida)
    path("", include(router.urls)),
    # Public vacancy detail (custom URL pattern)
    path(
        "public/vacancy/<str:unique_link>/",
        public_vacancy_detail,
        name="public_vacancy_detail",
    ),
]

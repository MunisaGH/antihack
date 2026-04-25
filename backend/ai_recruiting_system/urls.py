from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def root(request):
    return JsonResponse(
        {
            "service": "CAREER AI API",
            "status": "ok",
            "endpoints": {
                "api": "/api/",
                "docs": "/api/docs/",
                "schema": "/api/schema/",
                "admin": "/admin/",
            },
        }
    )


def not_found(request, exception=None):
    return JsonResponse({"success": False, "message": "Not found"}, status=404)


def server_error(request):
    return JsonResponse(
        {"success": False, "message": "Internal server error"}, status=500
    )


urlpatterns = [
    path("", root, name="root"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

handler404 = "ai_recruiting_system.urls.not_found"
handler500 = "ai_recruiting_system.urls.server_error"

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

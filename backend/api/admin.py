import secrets

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import (
    Application,
    ContactMessage,
    InterviewSession,
    Notification,
    ResumeFormData,
    User,
    Vacancy,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "email",
        "full_name",
        "phone",
        "company_name",
        "company_location",
        "role",
        "is_active",
        "date_joined",
    )
    search_fields = (
        "username",
        "email",
        "full_name",
        "phone",
        "company_name",
        "company_location",
    )
    list_filter = ("is_active", "role", "date_joined")
    readonly_fields = ("date_joined", "last_login", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Shaxsiy ma'lumotlar", {"fields": ("full_name", "email", "phone", "avatar")}),
        (
            "Kompaniya ma'lumotlari",
            {"fields": ("company_name", "company_location", "role")},
        ),
        (
            "Ruxsatlar",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Vaqt", {"fields": ("date_joined", "last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "password1",
                    "password2",
                    "email",
                    "full_name",
                    "phone",
                    "company_name",
                    "company_location",
                    "role",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        password = None
        if hasattr(form, "cleaned_data") and form.cleaned_data:
            password = form.cleaned_data.get("password1")

        if not change:
            if not password:
                password = secrets.token_urlsafe(12)
                obj.set_password(password)
            if password:
                request.session["new_user_password"] = password
                request.session["new_user_username"] = obj.username
        else:
            if password:
                request.session["changed_password"] = password

        super().save_model(request, obj, form, change)

    def response_add(self, request, obj, post_url_continue=None):
        response = super().response_add(request, obj, post_url_continue)
        password = request.session.pop("new_user_password", None)
        username = request.session.pop("new_user_username", None)
        if password and username:
            messages.success(
                request,
                format_html(
                    "<strong>User yaratildi!</strong><br>"
                    "Username: <code>{}</code><br>"
                    "Parol: <code>{}</code>",
                    username,
                    password,
                ),
            )
        return response

    def response_change(self, request, obj):
        response = super().response_change(request, obj)
        password = request.session.pop("changed_password", None)
        if password:
            messages.success(
                request,
                format_html("<strong>Yangi parol:</strong> <code>{}</code>", password),
            )
        return response


admin.site.register(Vacancy)
admin.site.register(Application)
admin.site.register(ResumeFormData)
admin.site.register(InterviewSession)


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "created_at")
    search_fields = ("name", "phone", "message")
    list_filter = ("created_at",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "type", "created_at")
    search_fields = ("user__username", "title", "type")
    list_filter = ("type", "created_at")

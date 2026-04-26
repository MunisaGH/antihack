from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

dotenv = load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "SECRET_KEY", "django-insecure-change-this-to-a-random-secret-key-in-production"
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = (
    os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if not DEBUG else ["*"]
)


# Application definition
AUTH_USER_MODEL = "api.User"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # Token blacklist uchun
    "drf_spectacular",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "ai_recruiting_system.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "ai_recruiting_system.wsgi.application"

# CORS Configuration - SECURE
CORS_ALLOWED_ORIGINS_ENV = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:5174,https://quickhire.uz",
)
CORS_ALLOWED_ORIGINS = (
    [origin.strip() for origin in CORS_ALLOWED_ORIGINS_ENV.split(",")]
    if CORS_ALLOWED_ORIGINS_ENV
    else []
)

# CSRF trusted origins — HTTPS proxy orqali ishlaydigan frontend manzillari
CSRF_TRUSTED_ORIGINS_ENV = os.getenv("CSRF_TRUSTED_ORIGINS", "")
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in CSRF_TRUSTED_ORIGINS_ENV.split(",")
    if origin.strip()
]

# .env.txt da CORS_ALLOW_ALL_ORIGINS yo'q, shuning uchun default False
CORS_ALLOW_ALL_ORIGINS = bool(
    os.getenv("CORS_ALLOW_ALL_ORIGINS", "False").lower() == "true" or DEBUG
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-poll-token",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Nginx/proxy orqasida IP aniqlash uchun (X-Forwarded-For ni ishonadi)
    "NUM_PROXIES": int(os.getenv("NUM_PROXIES", "0")),
    # Rate limiting (suiiste'mol va Gemini cost himoyasi) — per-endpoint belgilanadi
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        # Umumiy default — ko'pchilik endpoint uchun keng limit
        "anon": "600/min",
        "user": "1800/min",
        # Aniq endpointlar
        "login": "20/min",  # brute-force himoyasi (lekin real login uchun yetarli)
        # Ariza yuborish: ofis/maktab/Wi-Fi'da bir IP'dan ko'p kishi topshirishi mumkin.
        # 60/hour — ko'pchilik real holatlarni qoplaydi. Env bilan sozlash mumkin.
        "submit_application": os.getenv("THROTTLE_SUBMIT_APPLICATION", "60/hour"),
        "contact_message": os.getenv("THROTTLE_CONTACT_MESSAGE", "30/hour"),
        "application_status": "120/min",  # polling uchun
        "public_vacancy": "240/min",  # vacancy detail — views_count bilan
        "public_vacancies_list": "300/min",  # vacancy listing
        "interview_action": "60/min",  # javob yuborish
        "interview_stream": "30/min",  # Gemini pro quota
        "ai_translate": "60/min",
    },
}
# OpenAPI/Swagger - .env.txt da yo'q, shuning uchun default qiymatlar ishlatiladi
SPECTACULAR_SETTINGS = {
    "TITLE": os.getenv("API_TITLE", "AI Recruiting Platform API"),
    "DESCRIPTION": """
    # AI Recruiting Platform API
    
    Bu platforma ish beruvchilar va ish qidiruvchilar o'rtasida AI yordamida vakansiyalar va arizalarni boshqarish uchun yaratilgan.
    
    ## Asosiy funksiyalar:
    - **Authentication**: JWT token orqali autentifikatsiya
    - **Profile Management**: User profil boshqaruvi
    - **Vacancy Management**: Vakansiyalar boshqaruvi
    - **Application Management**: Arizalar boshqaruvi
    - **AI Analysis**: AI yordamida resume va interview tahlili
    - **Notifications**: Bildirishnomalar
    - **Analytics**: Statistikalar va hisobotlar
    
    ## Autentifikatsiya:
    Barcha endpointlar (public endpointlar bundan mustasno) JWT token talab qiladi.
    Token olish uchun `/api/auth/login/` endpointidan foydalaning.
    
    ## Public Endpoints:
    - `/api/public/vacancies/` - Vakansiyalar ro'yxati
    - `/api/public/vacancy/{unique_link}/` - Vakansiya ma'lumotlari
    - `/api/public/stats/` - Platform statistikasi
    - `/api/public/submit_application/` - Ariza yuborish
    """,
    "VERSION": os.getenv("API_VERSION", "1.0.0"),
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PUBLIC": True,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
    "SERVE_AUTHENTICATION": [],
    "COMPONENT_SPLIT_REQUEST": True,
    "COMPONENT_NO_READ_ONLY_REQUIRED": True,
    "SCHEMA_PATH_PREFIX": "/api/",
    "TAGS": [
        {"name": "Authentication", "description": "Autentifikatsiya endpointlari"},
        {"name": "Profile", "description": "User profil boshqaruvi"},
        {"name": "Notifications", "description": "Bildirishnomalar"},
        {"name": "Vacancies", "description": "Vakansiyalar boshqaruvi"},
        {"name": "Applications", "description": "Arizalar boshqaruvi"},
        {"name": "Analytics", "description": "Statistikalar va hisobotlar"},
        {
            "name": "Public",
            "description": "Public endpointlar (autentifikatsiya talab qilmaydi)",
        },
    ],
    "SERVERS": [
        {
            "url": os.getenv("API_SERVER_URL", "http://localhost:8000"),
            "description": "Development server" if DEBUG else "Production server",
        },
    ],
    "SECURITY": [{"Bearer": []}],
    "AUTHENTICATION_WHITELIST": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "Bearer": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
    },
}


# Cache Configuration - .env.txt da yo'q, shuning uchun default LocMemCache ishlatiladi
CACHE_BACKEND = os.getenv(
    "CACHE_BACKEND", "django.core.cache.backends.locmem.LocMemCache"
)
if CACHE_BACKEND == "django.core.cache.backends.redis.RedisCache":
    CACHES = {
        "default": {
            "BACKEND": CACHE_BACKEND,
            "LOCATION": os.getenv("CACHE_LOCATION", "redis://127.0.0.1:6379/1"),
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": CACHE_BACKEND,
            "LOCATION": "ai_recruiting_locmem",
        }
    }


# AI Configuration — Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

AI_SETTINGS = {
    # Asosiy model — sifat muhim: savol generatsiyasi, rezyume/intervyu tahlili
    "MODEL": os.getenv("AI_MODEL", "gemini-2.5-pro"),
    # Tezkor model — tarjima uchun (yetarli sifat, ~2x tez, alohida quota)
    "FAST_MODEL": os.getenv("AI_FAST_MODEL", "gemini-2.5-flash"),
    # Eng tez model — on-topic/spam klassifikatsiyasi (kichik, arzon, alohida quota)
    "CLASSIFIER_MODEL": os.getenv("AI_CLASSIFIER_MODEL", "gemini-2.5-flash-lite"),
    "TEMPERATURE": float(os.getenv("AI_TEMPERATURE", "0.3")),
    "INTERVIEW_MAX_QUESTIONS": int(os.getenv("AI_INTERVIEW_MAX_QUESTIONS", "10")),
    "MIN_COMPATIBILITY_SCORE": int(os.getenv("AI_MIN_COMPATIBILITY_SCORE", "60")),
    "DEFAULT_THRESHOLD": int(os.getenv("AI_DEFAULT_THRESHOLD", "70")),
    # Heuristik chegaralar — AI chaqiruvsiz tezkor qarorlar
    "HEURISTIC_MIN_ANSWER_LENGTH": int(
        os.getenv("AI_HEURISTIC_MIN_ANSWER_LENGTH", "3")
    ),
    "HEURISTIC_AUTO_PASS_LENGTH": int(
        os.getenv("AI_HEURISTIC_AUTO_PASS_LENGTH", "300")
    ),
}

# File Processing - .env.txt da yo'q, shuning uchun default qiymatlar ishlatiladi
ALLOWED_RESUME_EXTENSIONS_ENV = os.getenv("ALLOWED_RESUME_EXTENSIONS", "pdf,docx,txt")
ALLOWED_RESUME_EXTENSIONS = [
    ext.strip() for ext in ALLOWED_RESUME_EXTENSIONS_ENV.split(",")
]

MAX_RESUME_FILE_SIZE = int(
    os.getenv("MAX_RESUME_FILE_SIZE", str(10 * 1024 * 1024))
)  # Default: 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = int(
    os.getenv("FILE_UPLOAD_MAX_MEMORY_SIZE", str(10 * 1024 * 1024))
)
DATA_UPLOAD_MAX_MEMORY_SIZE = int(
    os.getenv("DATA_UPLOAD_MAX_MEMORY_SIZE", str(10 * 1024 * 1024))
)


# JWT Settings - .env.txt da yo'q, shuning uchun default qiymatlar ishlatiladi
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_DAYS", "1"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "10"))
    ),
    "ROTATE_REFRESH_TOKENS": os.getenv("JWT_ROTATE_REFRESH_TOKENS", "True").lower()
    == "true",
    "BLACKLIST_AFTER_ROTATION": os.getenv(
        "JWT_BLACKLIST_AFTER_ROTATION", "True"
    ).lower()
    == "true",
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Database Configuration
DATABASE_ENGINE = os.getenv("DATABASE_ENGINE", "django.db.backends.sqlite3")

if DATABASE_ENGINE == "django.db.backends.sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": DATABASE_ENGINE,
            "NAME": BASE_DIR / os.getenv("DATABASE_NAME", "test.sqlite3"),
            # Konkurrent yozuvlar uchun lock timeout (default 5s → 30s)
            # WAL mode + boshqa PRAGMA'lar apps.py'dagi connection_created signal'da qo'llaniladi.
            "OPTIONS": {
                "timeout": 30,
            },
        }
    }
else:
    # PostgreSQL: production'da SSL majburiy (DB server hostssl bilan sozlangan)
    DATABASES = {
        "default": {
            "ENGINE": DATABASE_ENGINE,
            "NAME": os.getenv("DATABASE_NAME", "ai_recruiting_db"),
            "USER": os.getenv("DATABASE_USER", "your_db_user"),
            "PASSWORD": os.getenv("DATABASE_PASSWORD", "your_secure_db_password"),
            "HOST": os.getenv("DATABASE_HOST", "localhost"),
            "PORT": os.getenv("DATABASE_PORT", "5432"),
            "OPTIONS": {
                "sslmode": os.getenv("DATABASE_SSLMODE", "require"),
                "connect_timeout": int(os.getenv("DATABASE_CONNECT_TIMEOUT", "10")),
            },
            "CONN_MAX_AGE": int(os.getenv("DATABASE_CONN_MAX_AGE", "60")),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


USE_I18N = True
USE_TZ = True


# File upload settings - .env.txt da yo'q, shuning uchun default qiymat ishlatiladi
MEDIA_URL = os.getenv("MEDIA_URL", "/files/media/")
MEDIA_ROOT = BASE_DIR / "media"

# ---- Object storage (DigitalOcean Spaces) + Bunny CDN (token-signed URLs) ----
# Arxitektura: Spaces PRIVATE bucket, Bunny Pull Zone S3 auth orqali pull qiladi.
# Backend boto3 orqali yozadi; frontend/mobile'ga Bunny token-signed URL beriladi.
DO_SPACES_KEY = os.getenv("DO_SPACES_KEY", "")
DO_SPACES_SECRET = os.getenv("DO_SPACES_SECRET", "")
DO_SPACES_BUCKET = os.getenv("DO_SPACES_BUCKET", "")
DO_SPACES_REGION = os.getenv("DO_SPACES_REGION", "sgp1")
DO_SPACES_ENDPOINT = os.getenv(
    "DO_SPACES_ENDPOINT",
    f"https://{DO_SPACES_REGION}.digitaloceanspaces.com",
)
# Shared Space prefiksi — har app o'z papkasida (hiring/, doctors/, ...).
DO_SPACES_LOCATION = os.getenv("DO_SPACES_LOCATION", "hiring")

# Bunny CDN — scheme bilan to'liq URL (masalan: "https://career-ai.b-cdn.net" yoki "https://cdn.career-ai.uz")
BUNNY_CDN_URL = os.getenv("BUNNY_CDN_URL", "")
# Bunny Pull Zone Security → Token Authentication Key
BUNNY_TOKEN_KEY = os.getenv("BUNNY_TOKEN_KEY", "")
BUNNY_TOKEN_EXPIRY_SECONDS = int(os.getenv("BUNNY_TOKEN_EXPIRY_SECONDS", "3600"))

if DO_SPACES_KEY and DO_SPACES_SECRET and DO_SPACES_BUCKET:
    # S3-compatible remote storage — private bucket
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": DO_SPACES_KEY,
                "secret_key": DO_SPACES_SECRET,
                "bucket_name": DO_SPACES_BUCKET,
                "region_name": DO_SPACES_REGION,
                "endpoint_url": DO_SPACES_ENDPOINT,
                "location": DO_SPACES_LOCATION,
                # Private bucket — URL'lar Bunny signed token orqali beriladi (services/storage.py)
                "default_acl": "private",
                "querystring_auth": False,
                "file_overwrite": False,
                "object_parameters": {"CacheControl": "max-age=86400"},
            },
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# Production xavfsizlik parametrlari
if not DEBUG:
    # Ishonchli SECRET_KEY bo'lishi shart
    if SECRET_KEY.startswith("django-insecure-"):
        import warnings
        warnings.warn(
            "SECRET_KEY production'da yangi qiymat bilan almashtirilishi shart!",
            RuntimeWarning,
        )
    # ALLOWED_HOSTS qat'iy bo'lishi kerak
    if "*" in ALLOWED_HOSTS:
        import warnings
        warnings.warn("ALLOWED_HOSTS production'da '*' bo'lmasligi kerak", RuntimeWarning)

    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() == "true"
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = False  # CSRF token JS orqali o'qish mumkin bo'lsin
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"

    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS = "DENY"

    # HSTS — 1 yil, subdomainlar uchun ham, preload
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # CORS — strictroq: hech qanday "*"
    CORS_ALLOW_ALL_ORIGINS = False

    # File upload limits (production'da qattiqroq)
    DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DATA_UPLOAD_MAX_MEMORY_SIZE", str(5 * 1024 * 1024)))
else:
    # Development
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True


STATIC_URL = os.getenv("STATIC_URL", "/static/")
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

# Timezone and Language - .env.txt da yo'q, shuning uchun default qiymatlar ishlatiladi
TIME_ZONE = os.getenv("TIME_ZONE", "Asia/Tashkent")
LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "en-us")

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Logging — maxfiy ma'lumotlarni log qilmaymiz
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "level": "INFO" if not DEBUG else "DEBUG",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        # Faqat ERROR+ darajasida log — 404 va throttle warninglarini ko'rsatmaslik
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.server": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

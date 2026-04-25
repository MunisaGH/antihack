"""
DigitalOcean Spaces + Bunny CDN integratsiya.

Upload: Presigned URL → client to'g'ridan-to'g'ri DO Spaces ga yuklaydi (ACL=private)
Download: Bunny CDN token URL → vaqt cheklangan, xavfsiz
Delete: boto3 orqali DO Spaces dan o'chirish

Shared bucket — har app o'z prefiksi ostida saqlaydi: hiring/, doctors/, app/, ...
Barcha key'lar settings.DO_SPACES_LOCATION bilan prefiks qilinadi.
"""

import base64
import hashlib
import logging
import time
import uuid

import boto3
from botocore.config import Config
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.DO_SPACES_REGION,
        endpoint_url=settings.DO_SPACES_ENDPOINT,
        aws_access_key_id=settings.DO_SPACES_KEY,
        aws_secret_access_key=settings.DO_SPACES_SECRET,
        config=Config(signature_version="s3v4"),
    )


def _prefix(key: str) -> str:
    """App prefiksini qo'shadi (agar hali qo'shilmagan bo'lsa)."""
    location = (getattr(settings, "DO_SPACES_LOCATION", "") or "").strip("/")
    key = key.lstrip("/")
    if location and not key.startswith(location + "/"):
        return f"{location}/{key}"
    return key


# ---------------------- Key generators ----------------------

def generate_avatar_key(user_id: int, file_name: str) -> str:
    """Avatar fayl yo'li: {prefix}/avatars/{user_id}/{uuid}.{ext}"""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "jpg"
    unique = uuid.uuid4().hex[:8]
    return _prefix(f"avatars/{user_id}/{unique}.{ext}")


def generate_resume_key(application_id: int, file_name: str) -> str:
    """Rezyume fayl yo'li: {prefix}/resumes/{application_id}/{uuid}.{ext}"""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "pdf"
    unique = uuid.uuid4().hex[:8]
    return _prefix(f"resumes/{application_id}/{unique}.{ext}")


def generate_file_key(folder: str, file_name: str) -> str:
    """Umumiy fayl yo'li: {prefix}/{folder}/YYYY/MM/{uuid}_{name}"""
    from django.utils import timezone

    now = timezone.now()
    ext = file_name.rsplit(".", 1)[-1] if "." in file_name else ""
    unique = uuid.uuid4().hex[:8]
    safe_name = f"{unique}_{file_name}" if len(file_name) <= 50 else f"{unique}.{ext}"
    return _prefix(f"{folder}/{now.year}/{now.month:02d}/{safe_name}")


# ---------------------- Upload / Download URLs ----------------------

def generate_upload_url(
    file_key: str, content_type: str, expires_in: int = 900
) -> str:
    """
    DO Spaces presigned upload URL yaratadi.
    Client shu URL ga PUT request yuboradi.
    ACL qo'shilmaydi — Bunny CDN S3 auth orqali origin'ga ulanadi.
    Xavfsizlik Bunny CDN token authentication orqali ta'minlanadi.
    """
    s3 = _get_s3_client()
    url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.DO_SPACES_BUCKET,
            "Key": file_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )
    return url


def generate_download_url(file_key: str, expiry_seconds: int = 3600) -> str:
    """
    Bunny CDN token URL yaratadi (MD5 + base64).
    Vaqt cheklangan (default 1 soat).
    Ref: https://docs.bunny.net/docs/cdn-token-authentication-basic
    """
    if not file_key:
        return ""
    cdn = (getattr(settings, "BUNNY_CDN_URL", "") or "").rstrip("/")
    if not cdn:
        return ""

    token_key = getattr(settings, "BUNNY_TOKEN_KEY", "")
    file_path = "/" + file_key.lstrip("/")

    if not token_key:
        # Token key yo'q bo'lsa oddiy URL qaytaradi (dev mode yoki public pull zone)
        return f"{cdn}{file_path}"

    expiry_time = int(time.time()) + expiry_seconds
    hash_raw = token_key + file_path + str(expiry_time)
    token = (
        base64.b64encode(hashlib.md5(hash_raw.encode()).digest())
        .decode()
        .replace("\n", "")
        .replace("+", "-")
        .replace("/", "_")
        .replace("=", "")
    )

    return f"{cdn}{file_path}?token={token}&expires={expiry_time}"


# ---------------------- Helpers ----------------------

def file_url(fieldfile) -> str | None:
    """Django FieldFile uchun Bunny signed URL.

    - Bunny CDN sozlangan bo'lsa — signed URL
    - Aks holda — FieldFile.url (local dev yoki public storage)
    """
    if not fieldfile:
        return None
    try:
        name = getattr(fieldfile, "name", None)
    except Exception:
        return None
    if not name:
        return None

    cdn = (getattr(settings, "BUNNY_CDN_URL", "") or "").rstrip("/")
    if cdn:
        full_key = _prefix(name)
        return generate_download_url(full_key)

    try:
        return fieldfile.url
    except Exception:
        return None


def delete_file(file_key: str) -> bool:
    """DO Spaces dan faylni o'chiradi. Bunny cache TTL tugaguncha eski fayl qoladi."""
    try:
        s3 = _get_s3_client()
        s3.delete_object(Bucket=settings.DO_SPACES_BUCKET, Key=file_key)
        logger.info(f"Fayl o'chirildi: {file_key}")
        return True
    except Exception as e:
        logger.error(f"Fayl o'chirishda xato: {file_key} — {e}")
        return False


def download_file_bytes(file_key: str) -> tuple[bytes, str]:
    """DO Spaces dan faylni byte sifatida yuklab oladi.

    Returns:
        (file_bytes, content_type)
    """
    s3 = _get_s3_client()
    obj = s3.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=file_key)
    return obj["Body"].read(), obj.get("ContentType", "application/octet-stream")

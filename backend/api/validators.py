"""Kirish ma'lumotlarini tekshirish utilitlari."""

from __future__ import annotations

import logging
import re
from pathlib import Path

from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# O'zbek mobil format: +998 XX XXX XX XX (9 raqam +998 keyin)
UZ_PHONE_RE = re.compile(r"^\+?998\d{9}$")

ALLOWED_RESUME_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}


def validate_uz_phone(value: str) -> None:
    """+998XXXXXXXXX formati yoki shunga o'xshash probellarsiz format."""
    if not value:
        raise ValidationError("Telefon raqam majburiy")
    digits_only = re.sub(r"\s+", "", value)
    if not UZ_PHONE_RE.match(digits_only):
        raise ValidationError("Telefon raqam noto'g'ri formatda. Misol: +998901234567")


def validate_resume_file(uploaded_file) -> None:
    """Fayl hajmi + kengaytma + MIME type tekshiruvi."""
    from django.conf import settings

    if not uploaded_file:
        return

    max_size = getattr(settings, "MAX_RESUME_FILE_SIZE", 10 * 1024 * 1024)
    if uploaded_file.size > max_size:
        raise ValidationError(
            f"Fayl hajmi {max_size // (1024 * 1024)}MB dan oshib ketdi"
        )

    ext = Path(uploaded_file.name).suffix.lower()
    allowed_exts = {".pdf", ".docx", ".txt"}
    if ext not in allowed_exts:
        raise ValidationError(
            f"Ruxsat etilgan formatlar: {', '.join(sorted(allowed_exts))}"
        )

    # MIME type tekshirish — python-magic orqali
    try:
        import magic

        head = uploaded_file.read(4096)
        uploaded_file.seek(0)
        detected_mime = magic.from_buffer(head, mime=True)
        if detected_mime not in ALLOWED_RESUME_MIME_TYPES:
            raise ValidationError(
                f"Fayl ichidagi ma'lumot format bilan mos kelmaydi (aniqlandi: {detected_mime})"
            )
        expected_ext = ALLOWED_RESUME_MIME_TYPES[detected_mime]
        if expected_ext != ext:
            raise ValidationError(
                f"Fayl kengaytmasi ({ext}) va ichki formati ({detected_mime}) mos kelmaydi"
            )
    except ImportError:
        logger.warning("python-magic not installed; MIME validation skipped")
    except ValidationError:
        raise
    except Exception:
        logger.exception("MIME validation failed unexpectedly")

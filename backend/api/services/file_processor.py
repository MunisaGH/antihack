"""Rezyume fayllardan text ajratish — local va remote storage (S3) ikkalasi bilan ishlaydi."""

import io
import logging
import os
from pathlib import Path
from typing import Optional, Tuple, Union

from django.conf import settings
from django.core.files.base import File

try:
    import PyPDF2
    from docx import Document
except ImportError:
    PyPDF2 = None

    Document = None

logger = logging.getLogger(__name__)


class FileProcessor:
    """FileField / path / path-string ni qabul qiladi, ichida bytes stream orqali ishlaydi."""

    def __init__(self):
        self.supported_extensions = [".pdf", ".docx", ".txt"]

    def extract_text_from_file(
        self, file_or_path: Union[str, File, "os.PathLike"]
    ) -> Optional[str]:
        """
        Matn ajratib olish. Ikki rejim:
        - path string (eski kod uchun kompatibellik) → local fayldan o'qiydi
        - Django FieldFile → .open('rb') orqali bytes stream'ni oladi (S3 bilan ishlaydi)
        """
        try:
            if isinstance(file_or_path, (str, os.PathLike)):
                path = str(file_or_path)
                if not os.path.exists(path):
                    raise FileNotFoundError(f"File not found: {path}")
                ext = Path(path).suffix.lower()
                with open(path, "rb") as f:
                    return self._extract_from_stream(f, ext)

            # FieldFile yoki File obyekti
            name = getattr(file_or_path, "name", "") or ""
            ext = Path(name).suffix.lower()
            # Django FieldFile-ni ochib o'qiymiz
            file_or_path.open("rb")
            try:
                data = file_or_path.read()
            finally:
                file_or_path.close()
            return self._extract_from_stream(io.BytesIO(data), ext)
        except Exception as e:
            logger.exception(f"File processing error: {e}")
            return None

    def _extract_from_stream(self, stream, ext: str) -> str:
        if ext == ".pdf":
            return self._extract_from_pdf(stream)
        if ext == ".docx":
            return self._extract_from_word(stream)
        if ext == ".txt":
            return self._extract_from_txt(stream)
        raise ValueError(f"Unsupported file type: {ext}")

    def _extract_from_pdf(self, stream) -> str:
        if not PyPDF2:
            raise ImportError("PyPDF2 library not installed")
        text = ""
        pdf_reader = PyPDF2.PdfReader(stream)
        for page in pdf_reader.pages:
            text += (page.extract_text() or "") + "\n"
        return text.strip()

    def _extract_from_word(self, stream) -> str:
        if not Document:
            raise ImportError("python-docx library not installed")
        doc = Document(stream)
        return "\n".join(p.text for p in doc.paragraphs).strip()

    def _extract_from_txt(self, stream) -> str:
        data = stream.read()
        if isinstance(data, bytes):
            return data.decode("utf-8", errors="replace").strip()
        return str(data).strip()

    def validate_file(self, uploaded_file) -> Tuple[bool, str]:
        """Upload vaqtidagi hajm + kengaytma tekshiruvi (MIME esa validators.py'da)."""
        try:
            if uploaded_file.size > settings.MAX_RESUME_FILE_SIZE:
                return False, "File too large (max 10MB)"
            ext = Path(uploaded_file.name).suffix.lower()
            if ext not in self.supported_extensions:
                return False, (
                    f"Unsupported file type. Allowed: {', '.join(self.supported_extensions)}"
                )
            return True, "Valid file"
        except Exception as e:
            return False, f"File validation error: {e}"

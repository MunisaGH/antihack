"""Vakansiya matnlarini O'zbekchadan Ruschaga tarjima qilish — Gemini."""

from __future__ import annotations

import json
import logging

from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


TRANSLATION_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "requirements": {"type": "string"},
        "responsibilities": {"type": "string"},
    },
    "required": ["title", "description", "requirements", "responsibilities"],
}


class AIVacancyTranslator:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        # Tarjima — tezkor modeldа, pro'dan alohida quota pool
        self.model = settings.AI_SETTINGS.get("FAST_MODEL", "gemini-2.5-flash")

    def translate_uz_to_ru(self, content: dict) -> dict:
        prompt = f"""Quyidagi O'zbek tilidagi vakansiya matnlarini professional rus tiliga tarjima qiling.
Ma'noni saqlang, professional HR tilidan foydalaning, noqulay iboralarni takomillashtiring.

**Lavozim nomi:**
{content.get("title", "")}

**Tavsif:**
{content.get("description", "")}

**Talablar:**
{content.get("requirements", "")}

**Mas'uliyatlar:**
{content.get("responsibilities", "")}

Faqat JSON formatida, 4 ta maydon bilan qaytaring: title, description, requirements, responsibilities (hammasi rus tilida).
"""
        system = (
            "You are a professional HR translator. Translate Uzbek vacancy content to clear, "
            "professional Russian suitable for job listings. Maintain the original meaning and structure."
        )
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.3,
                response_mime_type="application/json",
                response_schema=TRANSLATION_SCHEMA,
            ),
        )
        return json.loads(response.text)

"""Qisqa tavsif asosida to'liq vakansiya matnini yaratish — Gemini."""

from __future__ import annotations

import json
import logging

from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


GENERATION_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "requirements": {"type": "string"},
        "responsibilities": {"type": "string"},
        "work_type": {"type": "string", "enum": ["remote", "office", "hybrid"]},
        "work_schedule": {
            "type": "string",
            "enum": ["full-time", "part-time", "contract"],
        },
        "experience_years": {"type": "integer", "minimum": 0, "maximum": 20},
        "experience_months": {"type": "integer", "minimum": 0, "maximum": 11},
        "location": {"type": "string"},
        "salary_min": {"type": "integer", "minimum": 0},
        "salary_max": {"type": "integer", "minimum": 0},
        "min_match_score": {"type": "integer", "minimum": 50, "maximum": 90},
    },
    "required": [
        "title",
        "description",
        "requirements",
        "responsibilities",
        "work_type",
        "work_schedule",
        "experience_years",
        "experience_months",
    ],
}


class AIVacancyGenerator:
    """Admin qisqa tavsif yozadi — AI to'liq vakansiya strukturasini yaratadi."""

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.AI_SETTINGS["MODEL"]

    def generate_from_brief(self, brief: str) -> dict:
        prompt = f"""Quyidagi qisqa tavsifga asosan to'liq, professional vakansiya ma'lumotlarini O'zbek tilida yarating.

**Admin tavsifi:**
{brief}

**Vazifa:**
- **title** — lavozimning aniq nomi (masalan: "Frontend dasturchi (React)")
- **description** — 2-4 jumla umumiy tavsif (kompaniya, loyiha, vakansiyaning mohiyati)
- **requirements** — har birini yangi qatordan boshlab, "• " bilan belgilab, talablar ro'yxati (5-8 banddan iborat)
- **responsibilities** — har birini yangi qatordan boshlab, "• " bilan belgilab, mas'uliyatlar ro'yxati (4-7 banddan iborat)
- **work_type** — "remote", "office" yoki "hybrid"
- **work_schedule** — "full-time", "part-time" yoki "contract"
- **experience_years / experience_months** — zarur tajriba miqdori (agar intern/junior bo'lsa 0 qo'ying)
- **location** — shahar yoki "Remote" (agar tavsifda yo'q bo'lsa "Toshkent")
- **salary_min / salary_max** — agar tavsifda ko'rsatilmagan bo'lsa, qatorni qo'shmang
- **min_match_score** — AI moslik chegarasi (intern uchun 50-60, junior 60-70, mid 70-80, senior 75-85)

Professional HR tilidan foydalaning, qisqa va aniq yozing. Barcha matnlarni O'zbek tilida qaytaring.
"""
        system = (
            "You are a professional HR copywriter specializing in Uzbek job listings. "
            "Given a brief, produce complete, well-structured vacancy content in Uzbek. "
            "Infer sensible defaults for missing fields. Use clear bullet points for lists."
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.6,
                response_mime_type="application/json",
                response_schema=GENERATION_SCHEMA,
            ),
        )
        return json.loads(response.text)

"""Rezyume tahlili (AI natijasi) matnlarini UZ <-> RU tarjima qilish."""

from __future__ import annotations

import json
import logging

from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


ANALYSIS_TRANSLATION_SCHEMA = {
    "type": "object",
    "properties": {
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "missing_skills": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "detailed_feedback": {"type": "string"},
    },
    "required": ["strengths", "weaknesses", "recommendations", "detailed_feedback"],
}


INTERVIEW_TRANSLATION_SCHEMA = {
    "type": "object",
    "properties": {
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
    },
    "required": ["strengths", "weaknesses", "summary"],
}


class AIAnalysisTranslator:
    """AI rezyume/intervyu tahlilining matnli qismini boshqa tilga ko'chiradi.
    FAST_MODEL (gemini-2.5-flash) ishlatadi — alohida quota pool, tezroq.
    """

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        # Tarjima — tezkor modeldа, asosiy pro modeldan alohida quota'ga ega
        self.model = settings.AI_SETTINGS.get("FAST_MODEL", "gemini-2.5-flash")

    def translate_interview(self, analysis: dict, target_lang: str) -> dict:
        """Intervyu tahlilining matnli qismlarini (strengths, weaknesses, summary) tarjima qiladi."""
        payload = {
            "strengths": analysis.get("strengths", []) or [],
            "weaknesses": analysis.get("weaknesses", []) or [],
            "summary": analysis.get("summary", "") or "",
        }

        lang_label = "O'zbek tiliga" if target_lang == "uz" else "русский язык"
        prompt = f"""Quyidagi intervyu tahlili matnlarini {lang_label} tarjima qiling.
Professional HR tonini saqlang. Faqat matnli maydonlarni tarjima qiling.

{json.dumps(payload, ensure_ascii=False)}

JSON javob qaytaring: strengths, weaknesses, summary."""

        system = (
            "You are a professional HR translator. Translate interview evaluation text "
            "between Uzbek and Russian. Keep professional tone. Return JSON only."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.2,
                    response_mime_type="application/json",
                    response_schema=INTERVIEW_TRANSLATION_SCHEMA,
                ),
            )
            translated = json.loads(response.text)
            result = dict(analysis)
            result.update(translated)
            return result
        except Exception:
            logger.exception("Interview analysis translation failed")
            return analysis

    def translate(self, analysis: dict, target_lang: str) -> dict:
        """Asl tahlildagi matnli maydonlarni target_lang ga tarjima qiladi.

        Raqamli ballar va qarorlar asl holda qoladi.
        """
        payload = {
            "strengths": analysis.get("strengths", []) or [],
            "weaknesses": analysis.get("weaknesses", []) or [],
            "missing_skills": analysis.get("missing_skills", []) or [],
            "recommendations": analysis.get("recommendations", []) or [],
            "detailed_feedback": analysis.get("detailed_feedback", "") or "",
        }

        lang_label = "O'zbek tiliga" if target_lang == "uz" else "русский язык"
        prompt = f"""Quyidagi rezyume tahlili matnlarini {lang_label} tarjima qiling.
Ma'noni saqlang, professional HR tonini qo'llang. Faqat matnli maydonlarni tarjima qiling.

{json.dumps(payload, ensure_ascii=False)}

JSON javob qaytaring: strengths, weaknesses, missing_skills, recommendations, detailed_feedback."""

        system = (
            "You are a professional HR translator. Translate resume analysis text "
            "between Uzbek and Russian. Keep professional HR tone. Return JSON only."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.2,
                    response_mime_type="application/json",
                    response_schema=ANALYSIS_TRANSLATION_SCHEMA,
                ),
            )
            translated = json.loads(response.text)
            # Raqamli maydonlarni asl holatda saqlaymiz
            result = dict(analysis)
            result.update(translated)
            return result
        except Exception:
            logger.exception("Analysis translation failed")
            return analysis

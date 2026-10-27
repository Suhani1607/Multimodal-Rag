import os
import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


def create_ai_enhanced_summary(
    text: str,
    tables: List[str],
    images: List[str],
    groq_api_key: Optional[str] = None,
    model_name: Optional[str] = None
) -> str:
    """
    Generate AI-enhanced multimodal summary for chunks containing tables or images.
    Prioritizes findability and searchability for vector retrieval.
    """
    api_key = groq_api_key or settings.GROQ_API_KEY
    if not api_key or not (tables or images):
        # Fallback to structured text if no key or pure text chunk
        summary = text[:400] + ("..." if len(text) > 400 else "")
        if tables:
            summary += f"\n[Contains {len(tables)} data table(s)]"
        if images:
            summary += f"\n[Contains {len(images)} figure/diagram(s)]"
        return summary

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        
        # Build prompt
        prompt_text = f"""You are creating a searchable description for document content retrieval.

CONTENT TO ANALYZE:
TEXT CONTENT:
{text}
"""
        if tables:
            prompt_text += "\nTABLES (HTML format):\n"
            for i, tbl in enumerate(tables):
                prompt_text += f"\n--- Table {i+1} ---\n{tbl}\n"

        prompt_text += """
TASK:
Generate a concise, dense, searchable description that captures:
1. Key facts, metrics, formulas, and data points from the text and tables
2. Main technical concepts and questions this content answers
3. Summary of visual figures/tables present
SEARCHABLE DESCRIPTION:"""

        # Active model - use configured model or default fast Groq model
        active_model = model_name or settings.GROQ_MODEL or "openai/gpt-oss-20b"
        messages = [{"role": "user", "content": prompt_text}]

        try:
            response = client.chat.completions.create(
                model=active_model,
                messages=messages,
                temperature=0.1,
                max_tokens=400,
                timeout=8.0
            )
            return response.choices[0].message.content.strip()
        except Exception as e_model:
            logger.warning(f"Groq summary with model {active_model} failed: {e_model}. Retrying with fast fallback model...")
            try:
                response = client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=messages,
                    temperature=0.1,
                    max_tokens=400,
                    timeout=6.0
                )
                return response.choices[0].message.content.strip()
            except Exception as e_fallback:
                logger.warning(f"Groq fallback summary failed: {e_fallback}")

    except Exception as e:
        logger.warning(f"AI enhanced summary creation failed: {e}")
        # Deterministic fallback summary
        summary = text[:400] + ("..." if len(text) > 400 else "")
        if tables:
            summary += f"\n[Contains {len(tables)} table(s)]"
        if images:
            summary += f"\n[Contains {len(images)} image(s)]"
        return summary

import logging
from typing import List, Union
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)

_embedding_model = None


def get_embedding_model():
    """Lazy load embedding model into memory"""
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model


def generate_embedding(text: str) -> List[float]:
    """Generate a 384-dimensional dense vector for a single string"""
    model = get_embedding_model()
    # Normalize query/text
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Batch embedding generation for efficiency"""
    if not texts:
        return []
    model = get_embedding_model()
    vectors = model.encode(texts, batch_size=32, normalize_embeddings=True)
    return vectors.tolist()

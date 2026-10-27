import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


def rerank_chunks(
    query: str,
    chunks: List[Dict[str, Any]],
    top_n: int = 4
) -> List[Dict[str, Any]]:
    """
    Rerank retrieved document chunks using Cohere Rerank API.
    Falls back gracefully to vector similarity order if key or service is unavailable.
    """
    if not settings.COHERE_API_KEY or not chunks:
        return chunks[:top_n]
        
    try:
        import cohere
        client = cohere.Client(api_key=settings.COHERE_API_KEY)
        documents = [c.get("content", "") for c in chunks]
        
        response = client.rerank(
            model=settings.COHERE_RERANK_MODEL,
            query=query,
            documents=documents,
            top_n=min(top_n, len(chunks))
        )
        
        reranked = []
        for result in response.results:
            idx = result.index
            chunk = dict(chunks[idx])
            chunk["rerank_score"] = float(result.relevance_score)
            reranked.append(chunk)
            
        logger.info(f"Successfully reranked {len(reranked)} chunks via Cohere")
        return reranked
    except Exception as e:
        logger.warning(f"Cohere reranking failed or unavailable: {e}. Preserving vector rank.")
        return chunks[:top_n]

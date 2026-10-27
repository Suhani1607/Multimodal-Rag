import json
import time
import logging
from typing import List, Dict, Any, Generator, Tuple, Optional
from app.config import settings
from app.services.embeddings import generate_embedding
from app.services.vector_store import search_similar_chunks
from app.services.reranker import rerank_chunks

logger = logging.getLogger(__name__)


def build_rag_prompt(query: str, retrieved_chunks: List[Dict[str, Any]]) -> str:
    """Build bounded prompt with system instructions and source context"""
    context_blocks = []
    for idx, chunk in enumerate(retrieved_chunks):
        doc_info = f"[Citation {idx+1}] Document: {chunk.get('document_id')} | Page: {chunk.get('page_number', 1)} | Type: {chunk.get('element_type', 'text')}"
        text_content = chunk.get("content", "").strip()
        
        tables = chunk.get("tables_html", [])
        tables_text = ""
        if tables:
            tables_text = "\nTables:\n" + "\n".join([f"Table {i+1}: {t}" for i, t in enumerate(tables)])
            
        context_blocks.append(f"{doc_info}\nContent:\n{text_content}{tables_text}")
        
    joined_context = "\n\n--------------------\n\n".join(context_blocks)
    
    prompt = f"""You are an expert AI document assistant. Your task is to provide accurate, truthful, and helpful answers strictly based on the provided document excerpts.

CRITICAL INSTRUCTIONS:
1. Ground your answer solely in the provided document excerpts below.
2. If the excerpts do not contain enough facts to answer the question, clearly state: "Based on the provided documents, there is insufficient evidence to answer this question." Do not hallucinate or fabricate facts.
3. When referencing specific information, refer to the sources with citations like [1], [2] matching the citation numbers.
4. Keep the tone professional, concise, and structured.

DOCUMENT EXCERPTS:
{joined_context}

USER QUESTION:
{query}

ANSWER:"""
    return prompt


def generate_rag_answer(
    project_id: str,
    query: str,
    top_k: int = 4,
    similarity_threshold: float = 0.25,
    use_reranker: bool = False,
    folder_name: Optional[str] = None
) -> Dict[str, Any]:
    """Execute complete RAG pipeline synchronously, optionally scoped by folder"""
    start_time = time.time()
    
    # 1. Query embedding
    q_vec = generate_embedding(query)
    
    # 2. Vector search (scoped by folder if provided)
    chunks = search_similar_chunks(
        project_id=project_id,
        query_vector=q_vec,
        top_k=top_k * 2 if use_reranker else top_k,
        similarity_threshold=similarity_threshold,
        folder_name=folder_name
    )
    
    # 3. Optional rerank
    if use_reranker:
        chunks = rerank_chunks(query, chunks, top_n=top_k)
    else:
        chunks = chunks[:top_k]

    citations = [
        {
            "chunk_id": c.get("chunk_id", ""),
            "document_id": c.get("document_id", ""),
            "page_number": c.get("page_number", 1),
            "element_type": c.get("element_type", "text"),
            "snippet": c.get("content", "")[:200] + "...",
            "score": round(float(c.get("rerank_score", c.get("score", 0.0))), 3)
        }
        for c in chunks
    ]
    
    if not chunks:
        return {
            "answer": "No relevant document excerpts were found matching your question in this project. Please ensure documents have been uploaded and processed.",
            "citations": [],
            "retrieved_chunks_count": 0,
            "processing_time_ms": round((time.time() - start_time) * 1000, 2)
        }
        
    prompt = build_rag_prompt(query, chunks)
    
    # Call Groq LLM
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        # Test configured model, fallback to llama-3.3-70b-versatile or llama-3.1-8b-instant if model unavailable
        model_to_use = settings.GROQ_MODEL
        try:
            resp = client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000,
            )
            answer_text = resp.choices[0].message.content.strip()
        except Exception as e_model:
            logger.warning(f"Groq model {model_to_use} failed ({e_model}), attempting fallback...")
            resp = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000,
            )
            answer_text = resp.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Groq inference failed: {e}")
        # Graceful fallback answer based directly on chunks
        answer_text = f"Retrieved {len(chunks)} relevant excerpt(s) from your documents:\n\n" + \
                      "\n\n".join([f"- **Page {c.get('page_number', 1)}**: {c.get('content', '')[:300]}..." for c in chunks])

    return {
        "answer": answer_text,
        "citations": citations,
        "retrieved_chunks_count": len(chunks),
        "processing_time_ms": round((time.time() - start_time) * 1000, 2)
    }


def stream_rag_answer(
    project_id: str,
    query: str,
    top_k: int = 4,
    similarity_threshold: float = 0.25,
    use_reranker: bool = False,
    folder_name: Optional[str] = None
) -> Generator[str, None, None]:
    """
    Stream RAG answer using Server-Sent Events (SSE), optionally scoped by folder.
    Emits chunk tokens as 'data: {"token": "..."}\n\n'
    and finishes with citations as 'data: {"citations": [...]}\n\n'
    """
    q_vec = generate_embedding(query)
    chunks = search_similar_chunks(
        project_id=project_id,
        query_vector=q_vec,
        top_k=top_k * 2 if use_reranker else top_k,
        similarity_threshold=similarity_threshold,
        folder_name=folder_name
    )
    
    if use_reranker:
        chunks = rerank_chunks(query, chunks, top_n=top_k)
    else:
        chunks = chunks[:top_k]

    citations = [
        {
            "chunk_id": c.get("chunk_id", ""),
            "document_id": c.get("document_id", ""),
            "page_number": c.get("page_number", 1),
            "element_type": c.get("element_type", "text"),
            "snippet": c.get("content", "")[:200] + "...",
            "score": round(float(c.get("rerank_score", c.get("score", 0.0))), 3)
        }
        for c in chunks
    ]
    
    if not chunks:
        yield f"data: {json.dumps({'token': 'No relevant document excerpts were found for your question in this project.'})}\n\n"
        yield f"data: {json.dumps({'citations': []})}\n\n"
        yield "data: [DONE]\n\n"
        return

    prompt = build_rag_prompt(query, chunks)
    
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        model_to_use = settings.GROQ_MODEL
        try:
            stream = client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000,
                stream=True
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e_model:
            logger.warning(f"Groq streaming with {model_to_use} failed ({e_model}), trying fallback...")
            stream = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000,
                stream=True
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"

    except Exception as e:
        logger.error(f"Groq streaming error: {e}")
        fallback_msg = f"Retrieved relevant context:\n" + chunks[0].get("content", "")[:400]
        yield f"data: {json.dumps({'token': fallback_msg})}\n\n"

    # Emit final citations
    yield f"data: {json.dumps({'citations': citations})}\n\n"
    yield "data: [DONE]\n\n"

import json
import logging
import uuid
from typing import List, Dict, Any, Optional
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)

# In-memory local fallback store when Postgres is offline
_in_memory_chunks: Dict[str, Dict[str, Any]] = {}


import time

_pg_last_attempt = 0.0
_pg_available = False


def get_pg_connection():
    """Attempt connecting to PostgreSQL with pgvector, caching failure to avoid blocking timeouts"""
    global _pg_last_attempt, _pg_available
    now = time.time()
    
    # If checked within the last 60 seconds and it failed, bypass TCP timeout
    if not _pg_available and (now - _pg_last_attempt < 60.0):
        return None
        
    _pg_last_attempt = now
    try:
        import psycopg2
        import psycopg2.extras
        from pgvector.psycopg2 import register_vector
        
        conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=1)
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id VARCHAR(64) PRIMARY KEY,
                    document_id VARCHAR(64) NOT NULL,
                    project_id VARCHAR(64) NOT NULL,
                    folder_name VARCHAR(128) DEFAULT 'General',
                    sequence INT NOT NULL,
                    content TEXT NOT NULL,
                    enhanced_content TEXT,
                    page_number INT DEFAULT 1,
                    element_type VARCHAR(32) DEFAULT 'text',
                    section_title TEXT,
                    tables_html JSONB DEFAULT '[]',
                    images_base64 JSONB DEFAULT '[]',
                    metadata JSONB DEFAULT '{}',
                    embedding vector(384),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS folder_name VARCHAR(128) DEFAULT 'General';
                CREATE INDEX IF NOT EXISTS idx_chunks_project ON document_chunks(project_id);
                CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
                CREATE INDEX IF NOT EXISTS idx_chunks_folder ON document_chunks(project_id, folder_name);
            """)
            conn.commit()
            register_vector(conn)
        _pg_available = True
        return conn
    except Exception as e:
        _pg_available = False
        logger.warning(f"PostgreSQL offline ({e}). Operating in instant memory-backed mode.")
        return None


def store_chunks(
    project_id: str,
    document_id: str,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]],
    folder_name: str = "General"
) -> int:
    """Store chunks with vectors in PostgreSQL pgvector or memory store"""
    conn = get_pg_connection()
    count = 0
    safe_folder = folder_name if folder_name and folder_name.strip() else "General"
    
    if conn is not None:
        try:
            with conn.cursor() as cur:
                # Remove existing chunks for this document (idempotent re-run)
                cur.execute("DELETE FROM document_chunks WHERE document_id = %s;", (document_id,))
                
                for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    chunk_id = f"chunk_{document_id}_{idx+1}"
                    el_type = chunk.get("element_type") or chunk.get("primary_type")
                    if not el_type or el_type == "text":
                        if chunk.get("tables_html") and len(chunk.get("tables_html")) > 0:
                            el_type = "table"
                        elif chunk.get("images_base64") and len(chunk.get("images_base64")) > 0:
                            el_type = "image"
                        else:
                            el_type = "text"

                    clean_text = chunk.get("text", "").replace("\x00", "") if chunk.get("text") else ""
                    clean_enhanced = chunk.get("enhanced_content", "").replace("\x00", "") if chunk.get("enhanced_content") else clean_text
                    clean_section = chunk.get("section_title", "").replace("\x00", "") if chunk.get("section_title") else None

                    cur.execute("""
                        INSERT INTO document_chunks (
                            id, document_id, project_id, folder_name, sequence, content, enhanced_content,
                            page_number, element_type, section_title, tables_html, images_base64,
                            metadata, embedding
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, (
                        chunk_id,
                        document_id,
                        project_id,
                        safe_folder,
                        chunk.get("sequence", idx + 1),
                        clean_text,
                        clean_enhanced,
                        chunk.get("page_number", 1),
                        el_type,
                        clean_section,
                        json.dumps(chunk.get("tables_html", [])),
                        json.dumps(chunk.get("images_base64", [])),
                        json.dumps(chunk.get("metadata", {})),
                        np.array(emb, dtype=np.float32)
                    ))
                    count += 1
                conn.commit()
            conn.close()
            logger.info(f"Stored {count} chunks in PostgreSQL pgvector (folder: {safe_folder})")
            return count
        except Exception as e:
            logger.error(f"Error inserting into PostgreSQL: {e}")
            if conn:
                conn.close()

    # Fallback in-memory storage
    for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        chunk_id = f"chunk_{document_id}_{idx+1}"
        el_type = chunk.get("element_type") or chunk.get("primary_type")
        if not el_type or el_type == "text":
            if chunk.get("tables_html") and len(chunk.get("tables_html")) > 0:
                el_type = "table"
            elif chunk.get("images_base64") and len(chunk.get("images_base64")) > 0:
                el_type = "image"
            else:
                el_type = "text"

        _in_memory_chunks[chunk_id] = {
            "id": chunk_id,
            "document_id": document_id,
            "project_id": project_id,
            "folder_name": safe_folder,
            "sequence": chunk.get("sequence", idx + 1),
            "content": chunk.get("text", ""),
            "enhanced_content": chunk.get("enhanced_content", chunk.get("text", "")),
            "page_number": chunk.get("page_number", 1),
            "element_type": el_type,
            "section_title": chunk.get("section_title", None),
            "tables_html": chunk.get("tables_html", []),
            "images_base64": chunk.get("images_base64", []),
            "metadata": chunk.get("metadata", {}),
            "embedding": np.array(emb, dtype=np.float32)
        }
        count += 1
    logger.info(f"Stored {count} chunks in memory store (folder: {safe_folder})")
    return count


def search_similar_chunks(
    project_id: str,
    query_vector: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.2,
    folder_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve top-K most similar chunks using cosine similarity, optionally scoped by folder"""
    conn = get_pg_connection()
    q_vec = np.array(query_vector, dtype=np.float32)
    filter_folder = folder_name.strip() if folder_name and folder_name.strip() and folder_name.strip().lower() != "all" else None
    
    if conn is not None:
        try:
            with conn.cursor() as cur:
                if filter_folder:
                    cur.execute("""
                        SELECT 
                            id, document_id, project_id, sequence, content, enhanced_content,
                            page_number, element_type, section_title, tables_html, images_base64,
                            1 - (embedding <=> %s) AS score
                        FROM document_chunks
                        WHERE project_id = %s AND folder_name = %s
                        ORDER BY embedding <=> %s
                        LIMIT %s;
                    """, (q_vec, project_id, filter_folder, q_vec, top_k * 2))
                else:
                    cur.execute("""
                        SELECT 
                            id, document_id, project_id, sequence, content, enhanced_content,
                            page_number, element_type, section_title, tables_html, images_base64,
                            1 - (embedding <=> %s) AS score
                        FROM document_chunks
                        WHERE project_id = %s
                        ORDER BY embedding <=> %s
                        LIMIT %s;
                    """, (q_vec, project_id, q_vec, top_k * 2))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    score = float(r[11])
                    if score >= similarity_threshold:
                        results.append({
                            "chunk_id": r[0],
                            "document_id": r[1],
                            "project_id": r[2],
                            "sequence": r[3],
                            "content": r[4],
                            "enhanced_content": r[5],
                            "page_number": r[6],
                            "element_type": r[7],
                            "section_title": r[8],
                            "tables_html": r[9] if isinstance(r[9], list) else json.loads(r[9] or "[]"),
                            "images_base64": r[10] if isinstance(r[10], list) else json.loads(r[10] or "[]"),
                            "score": score
                        })
                conn.close()
                return results[:top_k]
        except Exception as e:
            logger.warning(f"Error querying PostgreSQL: {e}")
            if conn:
                conn.close()

    # In-memory search fallback using numpy dot product
    results = []
    norm_q = np.linalg.norm(q_vec)
    for c in _in_memory_chunks.values():
        if c.get("project_id") == project_id:
            if filter_folder and c.get("folder_name", "General") != filter_folder:
                continue
            emb = c.get("embedding")
            if emb is not None:
                norm_emb = np.linalg.norm(emb)
                sim = float(np.dot(q_vec, emb) / (norm_q * norm_emb + 1e-9))
                if sim >= similarity_threshold:
                    item = dict(c)
                    item["score"] = sim
                    results.append(item)
                    
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def get_chunks_for_document(document_id: str) -> List[Dict[str, Any]]:
    """Retrieve all chunks belonging to a document for Chunk Explorer"""
    conn = get_pg_connection()
    if conn is not None:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id, document_id, project_id, sequence, content, enhanced_content,
                        page_number, element_type, section_title, tables_html, images_base64,
                        metadata
                    FROM document_chunks
                    WHERE document_id = %s
                    ORDER BY sequence ASC;
                """, (document_id,))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    results.append({
                        "chunk_id": r[0],
                        "document_id": r[1],
                        "project_id": r[2],
                        "sequence": r[3],
                        "content": r[4],
                        "enhanced_content": r[5],
                        "page_number": r[6],
                        "element_type": r[7],
                        "section_title": r[8],
                        "tables_html": r[9] if isinstance(r[9], list) else json.loads(r[9] or "[]"),
                        "images_base64": r[10] if isinstance(r[10], list) else json.loads(r[10] or "[]"),
                        "metadata": r[11] if isinstance(r[11], dict) else json.loads(r[11] or "{}"),
                    })
                conn.close()
                return results
        except Exception as e:
            logger.warning(f"Failed to fetch chunks from PostgreSQL: {e}")
            if conn:
                conn.close()

    # Memory fallback
    chunks = [
        dict(c) for c in _in_memory_chunks.values()
        if c.get("document_id") == document_id
    ]
    chunks.sort(key=lambda x: x.get("sequence", 0))
    return chunks

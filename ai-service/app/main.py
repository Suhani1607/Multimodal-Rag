import os
import uuid
import logging
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends, Query as FastQuery
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.config import settings
from app.models.schemas import IngestDocumentRequest, IngestUrlRequest, QueryRequest, QueryResponse
from app.tasks.ingestion import (
    process_document_pipeline,
    init_job_record,
    get_job_status,
    _JOB_STATUS_STORE,
    get_redis_client
)
from app.services.vector_store import get_chunks_for_document
from app.services.rag import generate_rag_answer, stream_rag_answer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

app = FastAPI(
    title="AI Document Knowledge Platform - AI Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Service health & model configuration status"""
    groq_configured = bool(settings.GROQ_API_KEY)
    return {
        "status": "healthy",
        "service": "ai-document-service",
        "groq_configured": groq_configured,
        "groq_model": settings.GROQ_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "cohere_configured": bool(settings.COHERE_API_KEY)
    }


import threading

@app.post("/internal/ingest")
def trigger_ingest(request: IngestDocumentRequest):
    """
    Trigger async ingestion pipeline. Enqueues in Celery or executes in background thread
    if Celery worker is offline during local development.
    """
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    init_job_record(job_id, request.document_id, request.project_id, request.filename)
    
    # Store doc -> job mapping in memory
    _JOB_STATUS_STORE[f"doc_{request.document_id}"] = job_id
    
    folder = request.folder_name or "General"
    redis_client = get_redis_client()
    dispatched = False

    if redis_client:
        try:
            process_document_pipeline.apply_async(
                kwargs={
                    "job_id": job_id,
                    "document_id": request.document_id,
                    "project_id": request.project_id,
                    "file_path": request.file_path,
                    "filename": request.filename,
                    "mime_type": request.mime_type,
                    "is_url": False,
                    "folder_name": folder
                },
                retry=False
            )
            dispatched = True
            logger.info(f"Dispatched Celery task for job {job_id}")
        except Exception as e:
            logger.warning(f"Celery apply_async failed: {e}")

    if not dispatched:
        logger.info(f"Redis offline, running pipeline in asynchronous background thread for job {job_id}...")
        thread = threading.Thread(
            target=process_document_pipeline,
            kwargs={
                "job_id": job_id,
                "document_id": request.document_id,
                "project_id": request.project_id,
                "file_path": request.file_path,
                "filename": request.filename,
                "mime_type": request.mime_type,
                "is_url": False,
                "folder_name": folder
            },
            daemon=True
        )
        thread.start()
        
    return {"job_id": job_id, "document_id": request.document_id, "status": "processing"}


@app.post("/internal/ingest-url")
def trigger_url_ingest(request: IngestUrlRequest):
    """Trigger ingestion for a website URL"""
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    init_job_record(job_id, request.document_id, request.project_id, request.url)
    _JOB_STATUS_STORE[f"doc_{request.document_id}"] = job_id
    folder = request.folder_name or "General"
    redis_client = get_redis_client()
    dispatched = False

    if redis_client:
        try:
            process_document_pipeline.apply_async(
                kwargs={
                    "job_id": job_id,
                    "document_id": request.document_id,
                    "project_id": request.project_id,
                    "file_path": request.url,
                    "filename": request.url,
                    "mime_type": "text/html",
                    "is_url": True,
                    "folder_name": folder
                },
                retry=False
            )
            dispatched = True
        except Exception as e:
            logger.warning(f"Celery URL apply_async failed: {e}")

    if not dispatched:
        logger.info(f"Redis offline, running URL ingest in asynchronous background thread for job {job_id}...")
        thread = threading.Thread(
            target=process_document_pipeline,
            kwargs={
                "job_id": job_id,
                "document_id": request.document_id,
                "project_id": request.project_id,
                "file_path": request.url,
                "filename": request.url,
                "mime_type": "text/html",
                "is_url": True,
                "folder_name": folder
            },
            daemon=True
        )
        thread.start()
        
    return {"job_id": job_id, "document_id": request.document_id, "status": "processing"}


@app.get("/internal/jobs/{job_id}")
def get_job(job_id: str):
    """Get status of an ingestion job with all 7 pipeline stages"""
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return status


@app.get("/internal/documents/{document_id}/status")
def get_document_status(document_id: str):
    """Lookup latest ingestion job status for a document"""
    # Check doc -> job mapping
    redis_client = get_redis_client()
    job_id = None
    if redis_client:
        try:
            job_id = redis_client.get(f"doc_job:{document_id}")
        except Exception:
            pass
            
    if not job_id:
        job_id = _JOB_STATUS_STORE.get(f"doc_{document_id}")
        
    if not job_id:
        # Search all records
        for k, v in _JOB_STATUS_STORE.items():
            if isinstance(v, dict) and v.get("document_id") == document_id:
                return v
        raise HTTPException(status_code=404, detail="No processing job found for document")

    status = get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job status not found")
    return status


@app.get("/internal/documents/{document_id}/chunks")
def get_doc_chunks(document_id: str):
    """Retrieve all chunks belonging to a document for Chunk Explorer"""
    chunks = get_chunks_for_document(document_id)
    return {"document_id": document_id, "count": len(chunks), "chunks": chunks}


@app.post("/internal/query", response_model=QueryResponse)
def execute_query(req: QueryRequest):
    """Synchronous RAG retrieval and answer generation"""
    result = generate_rag_answer(
        project_id=req.project_id,
        query=req.query,
        top_k=req.top_k,
        similarity_threshold=req.similarity_threshold,
        use_reranker=req.use_reranker,
        folder_name=req.folder_name
    )
    return result


@app.post("/internal/query/stream")
def execute_query_stream(req: QueryRequest):
    """Stream RAG response tokens and citations via SSE"""
    return StreamingResponse(
        stream_rag_answer(
            project_id=req.project_id,
            query=req.query,
            top_k=req.top_k,
            similarity_threshold=req.similarity_threshold,
            use_reranker=req.use_reranker,
            folder_name=req.folder_name
        ),
        media_type="text/event-stream"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)

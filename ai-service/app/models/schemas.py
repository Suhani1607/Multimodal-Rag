from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class IngestionStageStatus(BaseModel):
    stage: str
    status: str  # 'pending', 'in_progress', 'completed', 'failed'
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    progress: Optional[float] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None


class IngestionJobStatus(BaseModel):
    job_id: str
    document_id: str
    overall_status: str  # 'queued', 'processing', 'completed', 'failed'
    current_stage: str
    stages: List[IngestionStageStatus]
    summary: Optional[str] = None
    created_at: str
    updated_at: str
    error: Optional[str] = None


class ChunkMetadata(BaseModel):
    page_number: Optional[int] = None
    element_type: str = "text"  # 'text', 'table', 'image', 'title'
    section_title: Optional[str] = None
    source_filename: str = ""
    tables_html: List[str] = Field(default_factory=list)
    images_base64: List[str] = Field(default_factory=list)
    char_count: int = 0
    token_count: Optional[int] = None


class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    sequence: int
    content: str
    enhanced_content: Optional[str] = None
    metadata: ChunkMetadata
    score: Optional[float] = None


class IngestDocumentRequest(BaseModel):
    document_id: str
    file_path: str
    filename: str
    mime_type: str
    project_id: str
    folder_name: Optional[str] = "General"
    chunk_size: int = 3000
    chunk_overlap: int = 300


class IngestUrlRequest(BaseModel):
    document_id: str
    url: str
    project_id: str
    folder_name: Optional[str] = "General"


class QueryRequest(BaseModel):
    project_id: str
    query: str
    conversation_id: Optional[str] = None
    folder_name: Optional[str] = None
    top_k: int = 4
    similarity_threshold: float = 0.3
    use_reranker: bool = False


class Citation(BaseModel):
    chunk_id: str
    document_id: str
    source_filename: str
    page_number: Optional[int] = None
    element_type: str = "text"
    snippet: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    retrieved_chunks_count: int
    processing_time_ms: float

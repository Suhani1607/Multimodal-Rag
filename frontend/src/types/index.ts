export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  conversationCount: number;
}

export interface DocumentSource {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorDetails?: string;
  chunksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  progress?: number;
  metrics: Record<string, any>;
  error_message?: string;
}

export interface ProcessingStatus {
  job_id: string;
  document_id: string;
  overall_status: 'queued' | 'processing' | 'completed' | 'failed';
  current_stage: string;
  stages: PipelineStage[];
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  project_id: string;
  sequence: number;
  content: string;
  enhanced_content?: string;
  page_number: number;
  element_type: 'text' | 'table' | 'image' | 'title';
  section_title?: string;
  tables_html: string[];
  images_base64: string[];
  metadata?: Record<string, any>;
  score?: number;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  page_number?: number;
  element_type?: string;
  snippet: string;
  score: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

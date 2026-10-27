import {
  Project,
  DocumentSource,
  ProcessingStatus,
  DocumentChunk,
  Conversation,
  Message,
  Citation
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';

class ApiClient {
  private token: string | null = null;
  private devUserId: string = 'user_alex_dev';

  setToken(token: string | null) {
    this.token = token;
  }

  setDevUserId(userId: string) {
    this.devUserId = userId;
  }

  private getHeaders(contentType = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {
      'X-Dev-User-Id': this.devUserId,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  }

  async getProject(projectId: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  }

  async updateProject(projectId: string, name?: string, description?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  }

  async deleteProject(projectId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete project');
  }

  // --- DOCUMENTS ---
  async getDocuments(projectId: string): Promise<DocumentSource[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/documents`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  }

  async uploadDocument(projectId: string, file: File): Promise<DocumentSource> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
      'X-Dev-User-Id': this.devUserId,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}/projects/${projectId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload document');
    }
    return res.json();
  }

  async ingestUrl(projectId: string, url: string): Promise<DocumentSource> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/documents/url`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error('Failed to ingest URL');
    return res.json();
  }

  async deleteDocument(documentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
  }

  async getProcessingStatus(documentId: string): Promise<ProcessingStatus> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/processing-status`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch processing status');
    return res.json();
  }

  async getDocumentChunks(documentId: string): Promise<{ document_id: string; count: number; chunks: DocumentChunk[] }> {
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}/chunks`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.chunks && data.chunks.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend getDocumentChunks failed, trying direct AI service fallback:', err);
    }

    try {
      const directRes = await fetch(`http://localhost:8001/internal/documents/${documentId}/chunks`);
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData && directData.chunks && directData.chunks.length > 0) {
          return directData;
        }
      }
    } catch (fallbackErr) {
      console.warn('Direct AI service /chunks fallback failed:', fallbackErr);
    }

    return { document_id: documentId, count: 0, chunks: [] };
  }

  async retryIngestion(documentId: string): Promise<DocumentSource> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/retry`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retry ingestion');
    return res.json();
  }

  // --- CONVERSATIONS ---
  async getConversations(projectId: string): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/conversations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  }

  async createConversation(projectId: string, title: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  }

  // --- MESSAGES & STREAMING CHAT ---
  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  }

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  }

  streamChat(
    conversationId: string,
    content: string,
    onToken: (token: string) => void,
    onCitations: (citations: Citation[]) => void,
    onDone: () => void,
    onError: (err: any) => void
  ): () => void {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/conversations/${conversationId}/chat/stream`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Stream error: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('Response body is null');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              if (dataStr === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.token) {
                  onToken(parsed.token);
                }
                if (parsed.citations) {
                  onCitations(parsed.citations);
                }
              } catch (e) {
                // Raw text token
                if (dataStr) onToken(dataStr);
              }
            }
          }
        }
        onDone();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onError(err);
        }
      }
    })();

    return () => controller.abort();
  }
}

export const api = new ApiClient();

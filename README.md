# AI Document Knowledge Platform

A production-oriented, multimodal document intelligence and RAG knowledge platform built with a **Midnight Violet + Amber** visual identity. Users can organize projects, ingest diverse documents (PDF, DOCX, CSV, web URLs), observe live 7-stage asynchronous ingestion pipelines in an interactive inspector workbench, explore extracted chunks (tables, images, text), and converse with an AI assistant that grounds answers strictly in verified document citations.

---

## 1. Visual Design System: Midnight Violet + Amber

| Token | Color | Visual Role |
|---|---|---|
| **Main Background** | `#0B0A10` | Deep midnight canvas |
| **Sidebar Background** | `#100F17` | Navigation drawer surface |
| **Primary Surface** | `#171521` | Main cards, panels, chat bubbles |
| **Elevated Surface** | `#201D2B` | Dialogs, inspector modals, hover state |
| **Primary Accent** | `#A78BFA` | Violet-400: active navigation, AI badges, tabs, focus rings |
| **Secondary Accent** | `#F5B544` | Amber-400: primary CTAs, upload buttons, key progress metrics |
| **Amber Hover** | `#E9A72D` | Amber button active & hover state |
| **Subtle Borders** | `#302B3D` | Crisp dividers and card outlines |
| **Primary Text** | `#F5F3FA` | High-contrast readable typography |
| **Secondary Text** | `#A6A0B5` | Muted metadata and timestamps |
| **Semantic Status** | `#4ADE80` (Success), `#FBBF24` (Warning), `#FB7185` (Error), `#93C5FD` (Info) |

---

## 2. System Architecture

```
                     +---------------------------------------+
                     | React 18 + Vite + Tailwind CSS (SPA)  |
                     | Midnight Violet + Amber Visual Design |
                     +-------------------+-------------------+
                                         |
                       REST & SSE Stream | Bearer JWT / Dev Auth
                                         v
                     +---------------------------------------+
                     | Spring Boot 3.3 Application API       |
                     | - Projects, Conversations, Messages   |
                     | - Document Metadata & File Storage    |
                     | - Clerk Auth Verification & Security  |
                     +---------+-------------------+---------+
                               |                   |
            JPA Transactions   |                   | Internal Service API
                               v                   v
+--------------------------------+       +------------------------------------+
| PostgreSQL 16 + pgvector       |       | FastAPI AI Service (:8000)         |
| - Users, Projects, Documents   |       | - Unstructured Partitioning        |
| - Conversations, Messages      |       | - Semantic Title Chunking          |
| - Document Chunks & Vectors    |       | - HuggingFace Embeddings (384d)    |
+----------------+---------------+       | - Groq Multimodal Generation & SSE |
                 ^                       | - Cohere Reranking                 |
                 |                       +-----------------+------------------+
                 | Vectors & Chunks                        | Enqueue Jobs
                 +-----------------------+                 v
                                         |       +----------------------------+
                                         |       | Redis Broker (:6379)       |
                                         |       +-------------+--------------+
                                         |                     | Consume Tasks
                                         |                     v
                               +---------+------------------------------------+
                               | Celery Worker                              |
                               | - Asynchronous 7-stage Ingestion Pipeline    |
                               | - Multimodal Table & Image Extraction        |
                               +----------------------------------------------+
```

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router v6, Clerk Authentication.
- **Application Backend**: Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA, WebFlux (WebClient for internal calls & SSE streaming).
- **AI & Processing Service**: Python 3.11/3.13, FastAPI, Celery 5.4, Redis 7, Pydantic v2.
- **Document Extraction**: Unstructured (`hi_res` partitioning, table structure inference, base64 image extraction).
- **Embeddings & Vector Store**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) with PostgreSQL `pgvector`.
- **LLM Inference**: Groq API (`qwen/qwen3.8-27b`, `openai/gpt-oss-20b`, or `llama-3.3-70b-versatile`).
- **Reranker**: Cohere Rerank API (`rerank-english-v3.0`).

---

## 4. End-to-End Ingestion Pipeline Stages

The platform provides a dedicated **Document Processing Inspector** modal showing 7 stages with live metrics:
1. **Upload to storage**: Validates MIME type, calculates SHA-256 hash, stores file safely.
2. **Queued**: Enqueues job in Celery / Redis task queue.
3. **Partitioning**: Uses Unstructured to discover elements, text sections, structured tables, and embedded images.
4. **Chunking**: Uses title-based intelligent chunking (`max_characters=3000`, `new_after_n_chars=2400`, `combine_text_under_n_chars=500`).
5. **Summarization**: Generates multimodal searchable representations using Groq vision/text models for chunks containing tables or figures.
6. **Vectorization and storage**: Generates 384-dimensional normalized embeddings and saves chunks with pgvector cosine distance indexing.
7. **View Chunks**: Completes the pipeline and unlocks the interactive **Chunk Explorer** with Text, Image, and Table filters.

---

## 5. Local Setup & Running

### Prerequisites
- Node.js 20+ & npm
- Python 3.11+
- Java 21 & Maven 3.9+
- Docker & Docker Compose (optional for containerized deployment)

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your `GROQ_API_KEY` (already provided in your `.env`) and optional `COHERE_API_KEY` or `CLERK_SECRET_KEY`.

---

### Option A: Running with Docker Compose (Single Command)
```bash
docker compose up --build
```
This boots:
- React Frontend on port `3001`
- Spring Boot API on port `8081`
- FastAPI AI service on port `8001`
- Celery worker
- PostgreSQL with pgvector on port `5434`
- Redis on port `6380`

*(Configured specifically to run side-by-side without conflicting with other containers on ports 3000, 8080, 8000).*

---

### Option B: Running Services Locally

#### 1. Start the FastAPI AI Service
```bash
cd ai-service
# Using existing root virtual environment
..\.venv\Scripts\python -m uvicorn app.main:app --port 8001 --reload
```
Health check: [http://localhost:8001/health](http://localhost:8001/health)

#### 2. Start the Spring Boot API
```bash
cd backend-spring
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
```
Health check: [http://localhost:8081/api/v1/health](http://localhost:8081/api/v1/health)

#### 3. Start the React Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. Running Automated Tests

### Spring Boot Backend Tests
```bash
cd backend-spring
mvn test "-Dspring.profiles.active=dev"
```
*Tests JPA entity mapping, H2 in-memory dev database, project isolation, and user access authorization.*

### Python AI Service Tests
```bash
.venv\Scripts\python -m pytest ai-service/tests/test_pipeline.py -v
```
*Tests content separation, vector similarity search, RAG prompt boundaries, and FastAPI health endpoint.*

### Frontend Production Build Test
```bash
cd frontend
npm run build
```
*Validates TypeScript types and produces optimized production distribution.*

---

## 7. API Reference Summary

### Projects
- `GET /api/v1/projects` - List user projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{projectId}` - Get project details
- `PATCH /api/v1/projects/{projectId}` - Update project name/description
- `DELETE /api/v1/projects/{projectId}` - Delete project, cascaded documents & conversations

### Documents & Pipeline Inspector
- `GET /api/v1/projects/{projectId}/documents` - List project documents
- `POST /api/v1/projects/{projectId}/documents` - Upload PDF, DOCX, CSV (multipart)
- `POST /api/v1/projects/{projectId}/documents/url` - Ingest web page
- `GET /api/v1/documents/{documentId}/processing-status` - 7-stage inspector progress & metrics
- `GET /api/v1/documents/{documentId}/chunks` - Chunks with table HTML & base64 images
- `POST /api/v1/documents/{documentId}/retry` - Retry failed ingestion

### Conversations & RAG
- `GET /api/v1/projects/{projectId}/conversations` - List conversations
- `POST /api/v1/projects/{projectId}/conversations` - Create conversation
- `GET /api/v1/conversations/{conversationId}/messages` - Message history
- `POST /api/v1/conversations/{conversationId}/messages` - Send query (synchronous)
- `POST /api/v1/conversations/{conversationId}/chat/stream` - Stream answer via Server-Sent Events (SSE) with grounded citation chips

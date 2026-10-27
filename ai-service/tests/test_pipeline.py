import pytest
import sys
from pathlib import Path

# Add app to path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from app.services.chunker import separate_content_types, create_chunks_by_title
from app.services.vector_store import store_chunks, search_similar_chunks
from app.services.rag import build_rag_prompt
from fastapi.testclient import TestClient
from app.main import app


def test_content_separation():
    class MockElement:
        def __init__(self, text, elem_type='text'):
            self.text = text
            self.__name__ = elem_type
            self.metadata = type("M", (), {
                "page_number": 2,
                "orig_elements": []
            })()

    class MockChunk:
        def __init__(self, text):
            self.text = text
            self.metadata = type("M", (), {
                "page_number": 2,
                "orig_elements": []
            })()

    chunk = MockChunk("This is a test paragraph discussing Transformer architectures.")
    data = separate_content_types(chunk)
    
    assert data['text'] == "This is a test paragraph discussing Transformer architectures."
    assert data['page_number'] == 2
    assert 'text' in data['types']


def test_vector_storage_and_search():
    project_id = "test_proj_99"
    doc_id = "test_doc_88"
    
    mock_chunks = [
        {
            "sequence": 1,
            "text": "The Scaled Dot-Product Attention equation is softmax(QK^T / sqrt(d_k))V.",
            "enhanced_content": "Scaled Dot Product Attention formula details",
            "page_number": 4,
            "primary_type": "text",
            "tables_html": [],
            "images_base64": []
        },
        {
            "sequence": 2,
            "text": "Training was performed on 8 NVIDIA P100 GPUs for 3.5 days.",
            "enhanced_content": "Hardware specs and training duration",
            "page_number": 7,
            "primary_type": "text",
            "tables_html": [],
            "images_base64": []
        }
    ]
    
    # Simple normalized 384d test vectors
    emb1 = [1.0 if i == 0 else 0.0 for i in range(384)]
    emb2 = [1.0 if i == 1 else 0.0 for i in range(384)]
    
    count = store_chunks(project_id, doc_id, mock_chunks, [emb1, emb2])
    assert count == 2
    
    # Query matching emb1
    results = search_similar_chunks(project_id, emb1, top_k=2, similarity_threshold=0.1)
    assert len(results) >= 1
    assert "Scaled Dot-Product" in results[0]["content"]


def test_rag_prompt_construction():
    chunks = [{
        "chunk_id": "chunk_1",
        "document_id": "doc_1",
        "page_number": 3,
        "element_type": "text",
        "content": "Multi-Head Attention consists of 8 parallel attention layers.",
        "tables_html": []
    }]
    
    prompt = build_rag_prompt("How many attention heads are used?", chunks)
    assert "Multi-Head Attention" in prompt
    assert "CRITICAL INSTRUCTIONS:" in prompt
    assert "insufficient evidence" in prompt


def test_fastapi_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "embedding_model" in data

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Search for root .env or local .env
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()


class Settings(BaseSettings):
    APP_NAME: str = "AI Document Knowledge Platform - AI Service"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    PORT: int = int(os.getenv("FASTAPI_PORT", "8001"))
    
    # AI & LLM settings
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    GROQ_VISION_MODEL: str = os.getenv("GROQ_VISION_MODEL", "openai/gpt-oss-20b")
    COHERE_API_KEY: str = os.getenv("COHERE_API_KEY", "")
    COHERE_RERANK_MODEL: str = os.getenv("COHERE_RERANK_MODEL", "rerank-english-v3.0")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    PDF_PARTITION_STRATEGY: str = os.getenv("PDF_PARTITION_STRATEGY", "fast")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/knowledge_platform"
    )
    
    # Celery & Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    
    # Storage
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # 'local' or 's3'
    LOCAL_STORAGE_PATH: str = os.getenv("LOCAL_STORAGE_PATH", str(Path(__file__).resolve().parent.parent.parent / "storage"))
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")

    # Security
    INTERNAL_API_SECRET: str = os.getenv("INTERNAL_API_SECRET", "super-secret-internal-token-change-in-prod")

    class Config:
        case_sensitive = True
        extra = "allow"


settings = Settings()

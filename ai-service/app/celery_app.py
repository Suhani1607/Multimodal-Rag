import os
from celery import Celery
from app.config import settings

celery_app = Celery(
    "knowledge_platform_ai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ingestion"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes
    broker_connection_retry=False,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
    # Fallback to eager execution if REDIS_EAGER=true or broker unavailable in test
    task_always_eager=os.getenv("CELERY_ALWAYS_EAGER", "false").lower() == "true",
)

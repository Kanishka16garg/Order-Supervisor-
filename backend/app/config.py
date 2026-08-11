import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Order Supervisor"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sql_app.db")
    TEMPORAL_HOST: str = os.getenv("TEMPORAL_HOST", "localhost:7233")
    TEMPORAL_TASK_QUEUE: str = "order-supervisor-queue"
    
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    DEFAULT_WAKE_INTERVAL_SECONDS: int = 7200 # 2 hours
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

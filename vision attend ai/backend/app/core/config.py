from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    POSTGRES_USER: str = "visionattend"
    POSTGRES_PASSWORD: str = "visionattend123"
    POSTGRES_DB: str = "visionattend_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    USE_SQLITE_FALLBACK: bool = True

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    SECRET_KEY: str = "development-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    APP_NAME: str = "VisionAttend AI"
    APP_ENV: str = "development"
    DEBUG: bool = True

    FACE_RECOGNITION_THRESHOLD: float = 0.65
    LIVENESS_THRESHOLD: float = 0.70
    FACE_QUALITY_THRESHOLD: float = 0.50
    MIN_BOX_SIZE: int = 60

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8080"

    MAX_UPLOAD_SIZE: int = 10485760
    UPLOAD_DIR: str = "./uploads"

    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def SQLITE_URL(self) -> str:
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "visionattend.db")
        return f"sqlite:///{db_path}"

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


settings = Settings()

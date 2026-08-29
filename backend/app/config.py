from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://converge:converge@localhost:5433/converge"
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    environment: str = "development"
    algorithm: str = "HS256"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

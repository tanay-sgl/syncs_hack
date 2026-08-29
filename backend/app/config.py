from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://converge:converge@localhost:5433/converge"
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    password_reset_expire_minutes: int = 30
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    environment: str = "development"
    algorithm: str = "HS256"

    # Reputation
    reputation_default: float = 3.0
    reputation_min_signals_for_trust: int = 3
    reputation_half_life_days: float = 90.0  # recent signals weigh ~2x after this many days older
    reputation_idle_decay_days: float = 180.0  # pull toward default after this much silence
    reputation_idle_decay_strength: float = 0.35  # how strongly idle period pulls toward default

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

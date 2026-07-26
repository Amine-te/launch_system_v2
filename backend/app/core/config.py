"""
Centralized app settings.

Everything that needs the database URL (the app itself, Alembic's env.py)
should import `settings` from here rather than reading os.environ directly,
so there's exactly one place that knows how configuration is sourced.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# project-root/.env -- resolved from this file's location (not the current
# working directory) so it's found the same way whether you run uvicorn,
# alembic, or pytest, and from whatever directory you happen to be in.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    # Points at the Dockerized Postgres instance (see docker-compose.yml /
    # .env at the project root). Required -- no default on purpose, so
    # misconfiguration fails loudly instead of silently falling back to
    # something unexpected.
    database_url: str

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

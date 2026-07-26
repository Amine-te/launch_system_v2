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

    # Signs/verifies JWTs issued by /auth/login. Required, same reasoning as
    # database_url -- no silent fallback to a guessable default.
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    # How long an access token stays valid. 24h is a generous starting point
    # for local dev; tighten this (and add refresh tokens, if needed) before
    # this goes anywhere near production.
    access_token_expire_minutes: int = 60 * 24

    # Origins allowed to call this API from a browser. Edit this list if you
    # serve the frontend from a different port than the ones below (e.g.
    # `python3 -m http.server <port>` inside frontend/).
    cors_origins: list[str] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

"""
Declarative base for all ORM models.

No models live in this file. Every future model module (e.g.
app/models/project.py) should do `from app.db.base import Base` and
subclass it, so Alembic's autogenerate (via alembic/env.py, which imports
Base.metadata) picks up every table automatically.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass

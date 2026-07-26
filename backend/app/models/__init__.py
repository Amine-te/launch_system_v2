"""
Importing this package registers every model on Base.metadata, which is
what makes them visible to Alembic autogenerate and to
Base.metadata.create_all(). alembic/env.py imports this module for exactly
that reason. Add new model modules here as they're created.
"""
from app.models.user import User  # noqa: F401

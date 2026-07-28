"""
FastAPI application entrypoint.

Run with (from backend/, venv active):
    uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import audit_events, auth, project_assignments, projects, reference_entries, users
from app.core.config import settings

app = FastAPI(title="LaunchOps API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(reference_entries.router, prefix="/reference-entries", tags=["reference-entries"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(project_assignments.router, prefix="/project-assignments", tags=["project-assignments"])
app.include_router(audit_events.router, prefix="/audit-events", tags=["audit-events"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

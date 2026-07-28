"""
Seed the four demo projects (SRS M01) that used to be the frontend's
hardcoded PROJECTS mock (data/mock-data.js, now removed from that file),
so the seeded demo accounts have real project data to test against
instead of an empty list.

Assigns every seeded project to the demo Launch Engineer (a.rahal@
launchops.example) as owner/engineer, and to the demo Launch Manager
(s.aitoubou@launchops.example) as manager -- matching M01-AC-01's "a
Launch Engineer only sees their own assigned projects" test setup and
M01-AC-03's "Launch Manager sees all, writes only their own" (since Sara
is assigned to every seeded project here, run this before testing
M01-AC-03 exactly as written, or adjust the assignments to fit whatever
you want to demonstrate).

Idempotent: matched by project name, same convention as
seed_reference_lists.py.

Usage (from backend/, venv active):
    python -m scripts.seed_projects
"""
from datetime import date

from app.db.session import SessionLocal
from app.models.project import AssignmentRole, Project, ProjectAssignment, ProjectStatus
from app.models.user import User

ENGINEER_EMAIL = "a.rahal@launchops.example"
MANAGER_EMAIL = "s.aitoubou@launchops.example"

SEED_PROJECTS = [
    {
        "name": "BMW X5", "customer": "BMW Group", "customer_ref": "G05 LCI",
        "site": "Tangier Plant 2", "start_date": date(2026, 1, 12), "target_date": date(2026, 10, 15),
        "description": "Launch readiness and series preparation for the BMW X5 seat program.",
        "status": ProjectStatus.on_track,
    },
    {
        "name": "Renault Clio V", "customer": "Renault", "customer_ref": "BJA Phase 2",
        "site": "Tangier Plant 2", "start_date": date(2026, 2, 2), "target_date": date(2026, 9, 30),
        "description": "Controlled launch preparation for the Clio V program.",
        "status": ProjectStatus.at_risk,
    },
    {
        "name": "Peugeot 208", "customer": "Stellantis", "customer_ref": "P21",
        "site": "Kenitra Plant", "start_date": date(2026, 3, 9), "target_date": date(2026, 11, 20),
        "description": "Industrial launch project for the Peugeot 208 program.",
        "status": ProjectStatus.blocked,
    },
    {
        "name": "Dacia Sandero", "customer": "Renault", "customer_ref": "DJF",
        "site": "Tangier Plant 2", "start_date": date(2025, 11, 17), "target_date": date(2026, 8, 22),
        "description": "Launch and ramp-up governance for the Sandero program.",
        "status": ProjectStatus.on_track,
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        engineer = db.query(User).filter(User.email == ENGINEER_EMAIL).first()
        manager = db.query(User).filter(User.email == MANAGER_EMAIL).first()
        if engineer is None:
            print(f"Aborted: no user {ENGINEER_EMAIL} -- run `python -m scripts.seed_demo_users` first.")
            return
        if manager is None:
            print(f"Warning: no user {MANAGER_EMAIL} -- projects will be seeded without a Launch Manager assignment.")

        for seed in SEED_PROJECTS:
            existing = db.query(Project).filter(Project.name.ilike(seed["name"])).first()
            if existing:
                print(f"skipped (exists): {seed['name']}")
                continue
            project = Project(owner_user_id=engineer.id, **seed)
            db.add(project)
            db.flush()
            db.add(ProjectAssignment(project_id=project.id, user_id=engineer.id, role=AssignmentRole.engineer))
            if manager is not None:
                db.add(ProjectAssignment(project_id=project.id, user_id=manager.id, role=AssignmentRole.manager))
            print(f"created: {seed['name']} ({project.code})")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()

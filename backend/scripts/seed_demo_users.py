"""
Seed one demo user per role, for local dev / demoing the "quick login"
panel on the frontend's auth screen (frontend/js/components/quick-login.js).

Emails below are copy-pasted from ROLE_PERSONA in
frontend/js/components/nav-config.js -- keep the two in sync if either
changes, or quick-login buttons will "successfully" log in as the wrong
account. The password is shared across every seeded account and matches
DEMO_ACCOUNT_PASSWORD in frontend/js/components/quick-login.js.

Idempotent: existing users (matched by email) have their password/role
reset to the seed values rather than being skipped or duplicated, so
rerunning this after changing the shared password or a role mapping
keeps dev data consistent.

Usage (from backend/, venv active):
    python -m scripts.seed_demo_users
"""
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User, UserRole

# See the module docstring: keep this in lockstep with ROLE_PERSONA.
DEMO_ACCOUNTS = [
    {"email": "a.rahal@launchops.example", "full_name": "Amina Rahal", "role": UserRole.engineer},
    {"email": "s.aitoubou@launchops.example", "full_name": "Sara Ait Oubou", "role": UserRole.manager},
    {"email": "k.benali@launchops.example", "full_name": "Karim Benali", "role": UserRole.plant},
    {"email": "m.elidrissi@launchops.example", "full_name": "Mehdi El Idrissi", "role": UserRole.wh_lead},
    {"email": "i.chafai@launchops.example", "full_name": "Imane Chafai", "role": UserRole.wh_staff},
    {"email": "y.mansouri@launchops.example", "full_name": "Youssef Mansouri", "role": UserRole.prod_coord},
    {"email": "r.benali@launchops.example", "full_name": "Rachid Benali", "role": UserRole.admin},
]

# Dev-only password, never a real secret -- see README.md.
DEMO_PASSWORD = "DemoPass!2026"


def main() -> None:
    db = SessionLocal()
    try:
        hashed = get_password_hash(DEMO_PASSWORD)
        for account in DEMO_ACCOUNTS:
            user = db.query(User).filter(User.email == account["email"]).first()
            if user:
                user.hashed_password = hashed
                user.full_name = account["full_name"]
                user.role = account["role"]
                action = "updated"
            else:
                user = User(
                    email=account["email"],
                    hashed_password=hashed,
                    full_name=account["full_name"],
                    role=account["role"],
                )
                db.add(user)
                action = "created"
            db.flush()
            print(f"{action}: {account['email']} ({account['role'].value})")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()

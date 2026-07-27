"""
Create a user directly in the DB for local testing -- there's no
/auth/register endpoint yet.

Usage (from backend/, venv active):
    python -m scripts.create_user someone@example.com hunter2 --role engineer
"""
import argparse

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User, UserRole


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a user for local testing.")
    parser.add_argument("email")
    parser.add_argument("password")
    parser.add_argument(
        "--role", choices=[r.value for r in UserRole], default="engineer"
    )
    parser.add_argument(
        "--full-name", default="", help="Optional -- full_name is required by the schema but not by this script."
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = User(
            email=args.email,
            hashed_password=get_password_hash(args.password),
            full_name=args.full_name,
            role=UserRole(args.role),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user id={user.id} email={user.email} role={user.role.value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

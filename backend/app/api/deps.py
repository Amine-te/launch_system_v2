"""
Shared FastAPI dependencies for the API layer.
"""
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole

_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError:
        raise credentials_error

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_error

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_error

    # SRS M00-FR-04: "A deactivated account shall not be able to log in."
    # A JWT issued before deactivation is still cryptographically valid for
    # up to 24h (see Settings.access_token_expire_minutes), so this can't
    # just be a login-time check -- it has to be re-checked on every
    # authenticated request, or a deactivated user keeps working until
    # their token happens to expire. Frontend treats this exactly like an
    # expired token (see api/auth.js's authFetch -- 401 clears the session
    # and bounces to the login screen either way).
    if not user.is_active:
        raise credentials_error

    # SRS M00-FR-12: a locked account "shall not be able to log in" -- same
    # reasoning as the is_active check above applies here too, so a token
    # issued just before a lockout doesn't keep working until it expires.
    if user.is_locked:
        raise credentials_error

    return user


def require_role(*allowed_roles: UserRole):
    """Dependency factory for role-gated endpoints: `Depends(require_role(UserRole.admin))`.

    Deliberately generic (not `require_admin()` specifically) since almost
    every module from here on needs some role check, often more than one
    allowed role (e.g. an endpoint both a Launch Engineer and a Launch
    Manager can call) -- one small reusable dependency instead of a
    bespoke check copy-pasted into every routes/*.py file.
    """

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _dependency

from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, Role, Permission
from enum import Enum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class RoleEnum(str, Enum):
    ADMIN = "admin"
    HR = "hr"
    SECURITY = "security"
    EMPLOYEE = "employee"


def _to_bytes(s: str) -> bytes:
    return s.encode("utf-8") if isinstance(s, str) else s


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(plain_password), _to_bytes(hashed_password))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    if len(password) > 72:
        password = password[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(_to_bytes(password), salt).decode("utf-8")


def create_access_token(
    subject: str | Any, expires_delta: Optional[timedelta] = None, extra: Dict = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    if extra:
        to_encode.update(extra)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    subject: str | Any, expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_type = payload.get("type")
        if token_type != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def has_permission(required_permission: str):
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role not found",
            )
        if role.name == RoleEnum.ADMIN.value:
            return current_user
        permissions = (
            db.query(Permission.name)
            .join(Role.permissions)
            .filter(Role.id == current_user.role_id)
            .all()
        )
        permission_names = [p[0] for p in permissions]
        if required_permission not in permission_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {required_permission}",
            )
        return current_user

    return permission_checker


def has_role(*required_roles: RoleEnum):
    def role_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role not found",
            )
        if role.name not in [r.value for r in required_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {[r.value for r in required_roles]}",
            )
        return current_user

    return role_checker

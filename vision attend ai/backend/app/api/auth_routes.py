from __future__ import annotations

import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    get_current_user,
    RoleEnum,
    has_role,
)
from app.core.config import settings
from app.models.user import User, Role
from app.schemas.auth import (
    UserLoginResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserResponse,
    RoleResponse,
    RoleCreate,
    PermissionResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=UserLoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter((User.username == form_data.username) | (User.email == form_data.username))
        .first()
    )
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else RoleEnum.EMPLOYEE.value

    user.last_login = __import__("datetime").datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires, extra={"role": role_name}
    )
    refresh_token = create_refresh_token(subject=user.id)

    return UserLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        role_name=role_name,
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(
    req: TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else RoleEnum.EMPLOYEE.value

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires, extra={"role": role_name}
    )
    return TokenRefreshResponse(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    return {"message": "Password updated successfully"}

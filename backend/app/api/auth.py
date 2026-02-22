from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
import secrets

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_refresh_token,
)
from app.core.auth import get_current_user
from app.config import settings
from app.services.email_service import (
    send_email, build_welcome_email, build_verification_email,
    build_password_reset_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_SETTINGS = {
    "httponly": True,
    "samesite": "lax",
    "secure": settings.ENVIRONMENT == "production",
}


def _set_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie("mc_access_token", access_token, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **COOKIE_SETTINGS)
    response.set_cookie("mc_refresh_token", refresh_token, max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, **COOKIE_SETTINGS)


@router.post("/register", response_model=UserRead, status_code=201)
async def register(data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")

    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()
    role = "admin" if user_count == 0 else "member"

    verification_token = secrets.token_urlsafe(32)
    user = User(
        email=data.email.lower(),
        name=data.name,
        password_hash=hash_password(data.password),
        role=role,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires=datetime.now(timezone.utc) + timedelta(hours=48),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
    try:
        html, text = build_verification_email(user.name, verify_url)
        await send_email(user.email, "E-Mail verifizieren – MietCheck", html, text)
    except Exception:
        pass

    # Send welcome email after verification would be ideal, but send now for UX
    try:
        html, text = build_welcome_email(user.name)
        await send_email(user.email, "Willkommen bei MietCheck!", html, text)
    except Exception:
        pass

    # Auto-login after registration
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    _set_cookies(response, access_token, refresh_token)

    return user


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Ungültige E-Mail oder Passwort")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto deaktiviert")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Bitte verifizieren Sie zuerst Ihre E-Mail-Adresse")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    _set_cookies(response, access_token, refresh_token)

    return {"mc_access_token": access_token, "token_type": "bearer", "user": {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "subscription_tier": user.subscription_tier,
    }}


@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("mc_refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Kein Refresh-Token")

    payload = decode_refresh_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Ungültiger Refresh-Token")

    result = await db.execute(select(User).where(User.id == payload.sub))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")

    access_token = create_access_token(user.id, user.role)
    response.set_cookie("mc_access_token", access_token, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **COOKIE_SETTINGS)

    return {"mc_access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("mc_access_token")
    response.delete_cookie("mc_refresh_token")
    return {"message": "Abgemeldet"}


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Ungültiger Verifizierungslink")

    if user.verification_token_expires and user.verification_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verifizierungslink abgelaufen – bitte neu anfordern")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    await db.commit()

    return {"message": "E-Mail erfolgreich verifiziert"}


@router.post("/resend-verification")
async def resend_verification(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email", "").lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and not user.is_verified and user.is_active:
        token = secrets.token_urlsafe(32)
        user.verification_token = token
        user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=48)
        await db.commit()

        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        try:
            html, text = build_verification_email(user.name, verify_url)
            await send_email(user.email, "E-Mail verifizieren – MietCheck", html, text)
        except Exception:
            pass

    return {"message": "Falls ein unverifiziertes Konto existiert, wurde die E-Mail erneut gesendet."}


@router.post("/forgot-password")
async def forgot_password(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email", "").lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        try:
            html, text = build_password_reset_email(user.name, reset_url)
            await send_email(user.email, "Passwort zurücksetzen – MietCheck", html, text)
        except Exception:
            pass

    return {"message": "Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet."}


@router.post("/reset-password")
async def reset_password(data: dict, db: AsyncSession = Depends(get_db)):
    token = data.get("token", "")
    new_password = data.get("new_password", "")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen lang sein")

    result = await db.execute(select(User).where(User.reset_token == token))
    user = result.scalar_one_or_none()

    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Token")

    if user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token abgelaufen – bitte erneut anfordern")

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()

    return {"message": "Passwort erfolgreich geändert"}


@router.post("/change-password")
async def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 8 Zeichen lang sein")

    current_user.password_hash = hash_password(new_password)
    await db.commit()

    return {"message": "Passwort erfolgreich geändert"}

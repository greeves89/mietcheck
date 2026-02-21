from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from app.services.email_service import send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
async def register(data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # First user = admin
    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()
    role = "admin" if user_count == 0 else "member"

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        role=role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Set tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)

    response.set_cookie(
        "mc_access_token", access_token,
        httponly=True, samesite="lax", secure=False, max_age=3600
    )
    response.set_cookie(
        "mc_refresh_token", refresh_token,
        httponly=True, samesite="lax", secure=False, max_age=86400 * 30
    )

    # Send welcome email (fire and forget)
    import asyncio
    asyncio.create_task(send_welcome_email(user.email, user.name))

    return user


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)

    response.set_cookie(
        "mc_access_token", access_token,
        httponly=True, samesite="lax", secure=False, max_age=3600
    )
    response.set_cookie(
        "mc_refresh_token", refresh_token,
        httponly=True, samesite="lax", secure=False, max_age=86400 * 30
    )

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
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_refresh_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload.sub))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(user.id, user.role)
    response.set_cookie(
        "mc_access_token", access_token,
        httponly=True, samesite="lax", secure=False, max_age=3600
    )

    return {"mc_access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("mc_access_token")
    response.delete_cookie("mc_refresh_token")
    return {"message": "Logged out"}

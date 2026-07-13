from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_action
from app.core.database import get_session
from app.core.deps import get_current_user_uid
from app.core.security import create_token, hash_phrase, verify_phrase
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RecoverRequest,
    RecoverResponse,
    RegisterRequest,
    RegisterResponse,
    SetPhraseRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    user = User()
    if body.phrase:
        user.phrase_hash = hash_phrase(body.phrase)

    session.add(user)
    await session.commit()

    token = create_token(user.user_uid)

    log_action(user.user_uid, "register", "user", {"has_phrase": body.phrase is not None})

    return RegisterResponse(
        user_uid=user.user_uid,
        token=token,
        has_phrase=body.phrase is not None,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.user_uid == body.user_uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User()
        session.add(user)
        await session.commit()

    user.last_seen_at = None
    await session.commit()

    token = create_token(user.user_uid)

    log_action(user.user_uid, "login", "user", {})

    return LoginResponse(token=token)


@router.post("/recover", response_model=RecoverResponse)
async def recover(body: RecoverRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.user_uid == body.user_uid))
    user = result.scalar_one_or_none()

    if not user or not user.phrase_hash:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or no phrase set")

    if not verify_phrase(body.phrase, user.phrase_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid phrase")

    token = create_token(user.user_uid)

    log_action(user.user_uid, "recover", "user", {})

    return RecoverResponse(token=token)


@router.post("/phrase", status_code=status.HTTP_204_NO_CONTENT)
async def set_phrase(
    body: SetPhraseRequest,
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.user_uid == user_uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.phrase_hash = hash_phrase(body.phrase)
    await session.commit()

    log_action(user_uid, "set_phrase", "user", {})


@router.get("/me")
async def get_me(
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.user_uid == user_uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "user_uid": user.user_uid,
        "has_phrase": user.phrase_hash is not None,
        "created_at": user.created_at.isoformat(),
    }

from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_phrase(phrase: str) -> str:
    return pwd_context.hash(phrase)


def verify_phrase(phrase: str, hashed: str) -> bool:
    return pwd_context.verify(phrase, hashed)


def create_token(user_uid: str) -> str:
    payload = {
        "sub": user_uid,
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None

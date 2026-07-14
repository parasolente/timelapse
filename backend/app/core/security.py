import hashlib
import os
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

HASH_ITERATIONS = 100_000


def hash_phrase(phrase: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", phrase.encode(), salt, HASH_ITERATIONS)
    return salt.hex() + ":" + key.hex()


def verify_phrase(phrase: str, hashed: str) -> bool:
    salt_hex, key_hex = hashed.split(":")
    salt = bytes.fromhex(salt_hex)
    key = hashlib.pbkdf2_hmac("sha256", phrase.encode(), salt, HASH_ITERATIONS)
    return key.hex() == key_hex


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

import datetime as dt
import secrets
import string
from typing import Any

import jwt
from passlib.hash import pbkdf2_sha256

from .config import settings


def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pbkdf2_sha256.verify(password, hashed)


def _jwt_encode(payload: dict[str, Any], ttl_minutes: int) -> str:
    exp = dt.datetime.utcnow() + dt.timedelta(minutes=ttl_minutes)
    payload = {**payload, "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(sub: str) -> str:
    return _jwt_encode({"sub": sub, "type": "access"}, settings.access_token_ttl_minutes)


def create_refresh_token(sub: str) -> str:
    return _jwt_encode({"sub": sub, "type": "refresh"}, settings.refresh_token_ttl_minutes)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def short_id(n: int = 6) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


def slugify(text: str) -> str:
    s = text.strip().lower()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in {" ", "_", ".", "-", "@"}:
            out.append("-")
    slug = "".join(out).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug[:64]

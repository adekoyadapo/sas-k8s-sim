from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.user import User
from ..schemas.auth import RegisterRequest, LoginRequest, TokenPair, MeResponse, RefreshRequest, ThemeUpdate
from ..deps import get_current_user
from ..core.security import hash_password, verify_password, create_access_token, create_refresh_token, slugify
from ..models.settings import UserSetting


router = APIRouter()


@router.post("/register", response_model=TokenPair)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=str(payload.email), user_slug=slugify(payload.email.split("@")[0]), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    access = create_access_token(sub=user.email)
    refresh = create_refresh_token(sub=user.email)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenPair(access_token=create_access_token(sub=user.email), refresh_token=create_refresh_token(sub=user.email))


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return MeResponse(id=current_user.id, email=current_user.email, user_slug=current_user.user_slug)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    # Decode without enforcing access type to allow refresh
    from ..core.security import decode_token

    try:
        data = decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    sub = data.get("sub")
    user = db.query(User).filter(User.email == sub).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenPair(access_token=create_access_token(sub=sub), refresh_token=create_refresh_token(sub=sub))


@router.delete("/account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # delete all namespaces for this user, then remove user record
    from ..models.deployment import Deployment
    from ..services.k8s import delete_namespace, wait_namespace_gone

    deps = db.query(Deployment).filter(Deployment.user_id == current_user.id).all()
    errors = []
    for d in deps:
        try:
            delete_namespace(d.namespace)
            wait_namespace_gone(d.namespace)
        except Exception as e:
            errors.append({"namespace": d.namespace, "error": str(e)})
    # delete user regardless; record errors if any
    db.delete(current_user)
    db.commit()
    if errors:
        return {"ok": True, "warnings": errors}
    return {"ok": True}


@router.get("/me/settings")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserSetting).filter(UserSetting.user_id == current_user.id).first()
    return {"theme": getattr(s, "theme", None)}


@router.post("/me/settings")
def update_settings(payload: ThemeUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserSetting).filter(UserSetting.user_id == current_user.id).first()
    if not s:
        s = UserSetting(user_id=current_user.id, theme=payload.theme)
    else:
        s.theme = payload.theme
    db.add(s)
    db.commit()
    return {"ok": True}

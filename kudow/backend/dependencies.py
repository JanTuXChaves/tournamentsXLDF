from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
from database import get_db
from security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload or not payload.get("email"):
        raise credentials_exception

    user = db.query(models.Usuario).filter(models.Usuario.email == payload.get("email")).first()
    if user is None:
        raise credentials_exception
    return user

def get_optional_current_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    payload = decode_token(token)
    if not payload or not payload.get("email"):
        return None
    return db.query(models.Usuario).filter(models.Usuario.email == payload.get("email")).first()

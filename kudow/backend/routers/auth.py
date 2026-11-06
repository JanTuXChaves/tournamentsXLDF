import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(
    prefix="/auth",
    tags=["Autenticação"],
)

_login_failed_attempts: dict[str, list[datetime]] = defaultdict(list)
_reset_failed_attempts: dict[str, int] = defaultdict(int)
MAX_LOGIN_ATTEMPTS = 10
LOGIN_WINDOW_MINUTES = 5
MAX_RESET_ATTEMPTS = 5

@router.post("/register", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    if user.tipo_usuario not in ["ATLETA", "ENTIDADE"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não é permitido registrar perfis administrativos ou de arbitragem via auto-cadastro público."
        )

    db_user = db.query(models.Usuario).filter(models.Usuario.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    atleta_id_vinculo = None
    entidade_id_vinculo = None

    if user.tipo_usuario == "ATLETA":
        if not user.atleta_id:
            raise HTTPException(status_code=400, detail="ID do perfil de atleta é obrigatório para auto-cadastro de atleta.")
        atleta_existe = db.query(models.Atleta).filter(models.Atleta.codatl == user.atleta_id).first()
        if not atleta_existe:
            raise HTTPException(status_code=404, detail="Perfil de atleta não encontrado.")
        vinculo_existente = db.query(models.Usuario).filter(models.Usuario.atleta_id == user.atleta_id).first()
        if vinculo_existente:
            raise HTTPException(status_code=403, detail="Este perfil de atleta já possui um usuário de acesso vinculado.")
        atleta_id_vinculo = user.atleta_id

    elif user.tipo_usuario == "ENTIDADE":
        if not user.entidade_id:
            raise HTTPException(status_code=400, detail="ID da entidade é obrigatório.")
        entidade_existe = db.query(models.Entidade).filter(models.Entidade.codenti == user.entidade_id).first()
        if not entidade_existe:
            raise HTTPException(status_code=404, detail="Entidade não encontrada.")
        vinculo_existente = db.query(models.Usuario).filter(models.Usuario.entidade_id == user.entidade_id).first()
        if vinculo_existente:
            raise HTTPException(status_code=403, detail="Esta entidade já possui um gestor vinculado. Solicite acesso à administração Master.")
        entidade_id_vinculo = user.entidade_id

    hashed_password = get_password_hash(user.password)

    new_user = models.Usuario(
        email=user.email,
        nome=user.nome,
        hashed_password=hashed_password,
        tipo_usuario=user.tipo_usuario,
        entidade_id=entidade_id_vinculo,
        atleta_id=atleta_id_vinculo,
        colaborador_id=None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    email_key = form_data.username.strip().lower()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=LOGIN_WINDOW_MINUTES)
    _login_failed_attempts[email_key] = [t for t in _login_failed_attempts[email_key] if t > cutoff]

    if len(_login_failed_attempts[email_key]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login falharam. Aguarde 5 minutos antes de tentar novamente."
        )

    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        _login_failed_attempts[email_key].append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _login_failed_attempts.pop(email_key, None)

    logo_entidade = None
    if getattr(user, 'entidade_id', None) is not None:
        entidade = db.query(models.Entidade).filter(models.Entidade.codenti == user.entidade_id).first()
        if entidade:
            logo_entidade = entidade.logo

    user_payload = {
        "email": user.email,
        "tipo_usuario": user.tipo_usuario,
        "atleta_id": getattr(user, 'atleta_id', None),
        "entidade_id": getattr(user, 'entidade_id', None),
        "colaborador_id": getattr(user, 'colaborador_id', None),
        "deve_mudar_senha": getattr(user, 'deve_mudar_senha', False),
        "logo_entidade": logo_entidade
    }

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data=user_payload, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(data={"email": user.email, "tipo_usuario": user.tipo_usuario})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("email")
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário associado ao token não existe mais"
        )

    logo_entidade = None
    if getattr(user, 'entidade_id', None) is not None:
        entidade = db.query(models.Entidade).filter(models.Entidade.codenti == user.entidade_id).first()
        if entidade:
            logo_entidade = entidade.logo

    user_payload = {
        "email": user.email,
        "tipo_usuario": user.tipo_usuario,
        "atleta_id": getattr(user, 'atleta_id', None),
        "entidade_id": getattr(user, 'entidade_id', None),
        "colaborador_id": getattr(user, 'colaborador_id', None),
        "deve_mudar_senha": getattr(user, 'deve_mudar_senha', False),
        "logo_entidade": logo_entidade
    }

    new_access_token = create_access_token(data=user_payload)
    new_refresh_token = create_refresh_token(data={"email": user.email, "tipo_usuario": user.tipo_usuario})

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token
    }

@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()

    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum usuário encontrado com este e-mail"
        )

    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    _reset_failed_attempts.pop(email, None)

    reset_record = models.PasswordResetToken(
        email=email,
        code=code,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_record)
    db.commit()

    print("\n" + "="*50)
    print(f"CÓDIGO DE RECUPERAÇÃO PARA {email}: {code} (Válido por 15 min)")
    print("="*50 + "\n")

    return {
        "message": "Código de recuperação gerado com sucesso. Verifique o console do servidor."
    }

@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    code = request.code.strip()
    new_password = request.new_password

    now = datetime.now(timezone.utc)
    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == email,
        models.PasswordResetToken.code == code,
        models.PasswordResetToken.used == False
    ).order_by(models.PasswordResetToken.id.desc()).first()

    if not token_record:
        _reset_failed_attempts[email] += 1
        if _reset_failed_attempts[email] >= MAX_RESET_ATTEMPTS:
            db.query(models.PasswordResetToken).filter(
                models.PasswordResetToken.email == email,
                models.PasswordResetToken.used == False
            ).update({"used": True})
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Número máximo de tentativas excedido. Solicite um novo código de recuperação."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de recuperação inválido ou inexistente."
        )

    _reset_failed_attempts.pop(email, None)

    exp = token_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de recuperação expirou."
        )

    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    user.hashed_password = get_password_hash(new_password)
    token_record.used = True
    db.commit()

    return {"message": "Senha redefinida com sucesso."}


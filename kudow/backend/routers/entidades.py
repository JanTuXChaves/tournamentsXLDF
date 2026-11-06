from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(
    prefix="/entidades",
    tags=["Entidades"]
)

MEDIA_DIR = "media/entidades"
os.makedirs(MEDIA_DIR, exist_ok=True)

@router.post("/", response_model=schemas.EntidadeResponse, status_code=status.HTTP_201_CREATED)
def criar_entidade(entidade: schemas.EntidadeCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario != 'MASTER':
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para administradores master.")
    nova_entidade = models.Entidade(**entidade.dict())
    db.add(nova_entidade)
    db.commit()
    db.refresh(nova_entidade)
    return nova_entidade

from typing import Optional

@router.get("/", response_model=list[schemas.EntidadeResponse])
def listar_entidades(q: Optional[str] = None, uf: Optional[str] = None, db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    query = db.query(models.Entidade)
    if uf:
        query = query.filter(models.Entidade.estado.ilike(f"%{uf}%"))
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            (models.Entidade.nome.ilike(search)) |
            (models.Entidade.respon.ilike(search))
        )
    return query.offset(skip).limit(limit).all()

@router.get("/{entidade_id}", response_model=schemas.EntidadeResponse)
def obter_entidade(entidade_id: int, db: Session = Depends(get_db)):
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")
    return entidade

@router.put("/{entidade_id}", response_model=schemas.EntidadeResponse)
def atualizar_entidade(entidade_id: int, entidade_atualizada: schemas.EntidadeCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    if current_user.tipo_usuario != 'MASTER':
        if current_user.tipo_usuario == 'ENTIDADE' and current_user.entidade_id != entidade_id:
            raise HTTPException(status_code=403, detail="Você não tem permissão para alterar os dados desta entidade.")
        elif current_user.tipo_usuario != 'ENTIDADE':
            raise HTTPException(status_code=403, detail="Você não tem permissão para alterar dados de entidades.")

    for key, value in entidade_atualizada.dict().items():
        setattr(entidade, key, value)

    db.commit()
    db.refresh(entidade)
    return entidade

@router.post("/{entidade_id}/logo", response_model=schemas.EntidadeResponse)
def upload_logo_entidade(entidade_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    if current_user.tipo_usuario != 'MASTER':
        if current_user.tipo_usuario == 'ENTIDADE' and current_user.entidade_id != entidade_id:
            raise HTTPException(status_code=403, detail="Você não tem permissão para alterar os dados desta entidade.")
        elif current_user.tipo_usuario != 'ENTIDADE':
            raise HTTPException(status_code=403, detail="Você não tem permissão para alterar dados de entidades.")

    ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
    file_extension = os.path.splitext(os.path.basename(file.filename or ""))[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de imagem inválido ({file_extension}). Formatos permitidos: PNG, JPG, JPEG, WEBP."
        )

    MAX_LOGO_BYTES = 5 * 1024 * 1024
    content = file.file.read(MAX_LOGO_BYTES + 1)
    if len(content) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="A imagem excede o limite máximo de 5 MB.")

    filename = f"{entidade_id}_logo{file_extension}"
    file_path = os.path.join(MEDIA_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")

    entidade.logo = f"/media/entidades/{filename}"
    db.commit()
    db.refresh(entidade)

    return entidade

@router.delete("/{entidade_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_entidade(entidade_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario != 'MASTER':
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para administradores master.")
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    db.delete(entidade)
    db.commit()
    return None

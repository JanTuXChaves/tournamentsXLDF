from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(
    prefix="/colaboradores",
    tags=["Colaboradores"]
)

def check_admin_permission(current_user: models.Usuario):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para administradores ou entidades."
        )

@router.post("/", response_model=schemas.ColaboradorResponse, status_code=status.HTTP_201_CREATED)
def create_colaborador(
    colaborador: schemas.ColaboradorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    check_admin_permission(current_user)
    db_colaborador = models.Colaborador(**colaborador.model_dump())
    db.add(db_colaborador)
    db.commit()
    db.refresh(db_colaborador)
    return db_colaborador

@router.get("/", response_model=List[schemas.ColaboradorResponse])
def get_colaboradores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Colaborador).offset(skip).limit(limit).all()

@router.get("/{colaborador_id}", response_model=schemas.ColaboradorResponse)
def get_colaborador(colaborador_id: int, db: Session = Depends(get_db)):
    db_colaborador = db.query(models.Colaborador).filter(models.Colaborador.codcola == colaborador_id).first()
    if not db_colaborador:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return db_colaborador

@router.delete("/{colaborador_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_colaborador(
    colaborador_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    check_admin_permission(current_user)
    db_colaborador = db.query(models.Colaborador).filter(models.Colaborador.codcola == colaborador_id).first()
    if not db_colaborador:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")

    db.delete(db_colaborador)
    db.commit()
    return None

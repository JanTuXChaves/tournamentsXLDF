from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(
    prefix="/categorias",
    tags=["Categorias"]
)

def check_admin_permission(current_user: models.Usuario):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para administradores ou entidades."
        )

@router.post("/", response_model=schemas.CategoriaResponse, status_code=status.HTTP_201_CREATED)
def criar_categoria(
    categoria: schemas.CategoriaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    check_admin_permission(current_user)
    nova_categoria = models.Categoria(**categoria.dict())
    db.add(nova_categoria)
    db.commit()
    db.refresh(nova_categoria)
    return nova_categoria

@router.get("/", response_model=list[schemas.CategoriaResponse])
def listar_categorias(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return db.query(models.Categoria).offset(skip).limit(limit).all()

@router.get("/{categoria_id}", response_model=schemas.CategoriaResponse)
def obter_categoria(categoria_id: int, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(models.Categoria.codcat == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return categoria

@router.put("/{categoria_id}", response_model=schemas.CategoriaResponse)
def atualizar_categoria(
    categoria_id: int,
    categoria_atualizada: schemas.CategoriaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != 'MASTER':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a administração Master pode alterar categorias globais do sistema."
        )
    categoria = db.query(models.Categoria).filter(models.Categoria.codcat == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    for key, value in categoria_atualizada.dict().items():
        setattr(categoria, key, value)

    db.commit()
    db.refresh(categoria)
    return categoria

@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != 'MASTER':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a administração Master pode excluir categorias globais do sistema."
        )
    categoria = db.query(models.Categoria).filter(models.Categoria.codcat == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    db.delete(categoria)
    db.commit()
    return None

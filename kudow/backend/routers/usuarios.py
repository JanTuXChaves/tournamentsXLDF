from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from dependencies import get_current_user
from security import get_password_hash
from fastapi import HTTPException, status

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuários"],
)

@router.get("/me", response_model=schemas.UsuarioResponse)
def read_users_me(current_user: models.Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.entidade_id:
        entidade = db.query(models.Entidade).filter(models.Entidade.codenti == current_user.entidade_id).first()
        if entidade:
            current_user.logo_entidade = entidade.logo
    return current_user

@router.put("/me", response_model=schemas.UsuarioResponse)
def update_users_me(
    usuario_update: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if usuario_update.email:
        db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario_update.email).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Este e-mail já está sendo usado por outro usuário.")
        current_user.email = usuario_update.email

    if usuario_update.password:
        current_user.hashed_password = get_password_hash(usuario_update.password)
        current_user.deve_mudar_senha = False

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/", response_model=list[schemas.UsuarioResponse])
def list_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para administradores master."
        )
    return db.query(models.Usuario).all()

@router.post("/", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para administradores master."
        )

    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")

    hashed_password = get_password_hash(usuario.password)
    novo_usuario = models.Usuario(
        email=usuario.email,
        nome=usuario.nome,
        hashed_password=hashed_password,
        tipo_usuario=usuario.tipo_usuario,
        entidade_id=usuario.entidade_id,
        atleta_id=usuario.atleta_id,
        colaborador_id=usuario.colaborador_id,
        deve_mudar_senha=False
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@router.put("/{usuario_id}", response_model=schemas.UsuarioResponse)
def update_usuario(
    usuario_id: int,
    usuario_update: schemas.UsuarioUpdateMaster,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para administradores master."
        )

    db_user = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if usuario_update.email:
        email_check = db.query(models.Usuario).filter(models.Usuario.email == usuario_update.email).first()
        if email_check and email_check.id != usuario_id:
            raise HTTPException(status_code=400, detail="Este e-mail já está sendo usado por outro usuário.")
        db_user.email = usuario_update.email

    if usuario_update.nome is not None:
        db_user.nome = usuario_update.nome

    if usuario_update.tipo_usuario is not None:
        db_user.tipo_usuario = usuario_update.tipo_usuario

    if usuario_update.password:
        db_user.hashed_password = get_password_hash(usuario_update.password)

    update_data = usuario_update.dict(exclude_unset=True)

    if "entidade_id" in update_data:
        db_user.entidade_id = update_data["entidade_id"]
    if "atleta_id" in update_data:
        db_user.atleta_id = update_data["atleta_id"]
    if "colaborador_id" in update_data:
        db_user.colaborador_id = update_data["colaborador_id"]

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Erro ao atualizar usuário. Certifique-se de que as restrições de vínculos ou e-mail único estão corretas."
        )

    db.refresh(db_user)
    return db_user

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para administradores master."
        )

    if current_user.id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um administrador master não pode excluir a si mesmo."
        )

    db_user = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    db.delete(db_user)
    db.commit()
    return None

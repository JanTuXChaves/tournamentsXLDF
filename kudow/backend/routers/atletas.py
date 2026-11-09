from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models, schemas
import os
import csv
import io
from typing import Optional
from database import get_db
from dependencies import get_current_user, get_optional_current_user

router = APIRouter(
    prefix="/atletas",
    tags=["Atletas"]
)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BACKEND_DIR, "media", "atletas")
CERTIFICADOS_DIR = os.path.join(BACKEND_DIR, "media", "certificados")
os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(CERTIFICADOS_DIR, exist_ok=True)

@router.post("/", response_model=schemas.AtletaResponse, status_code=status.HTTP_201_CREATED)
def criar_atleta(atleta: schemas.AtletaCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_optional_current_user)):
    if current_user and current_user.tipo_usuario == 'ATLETA':
        raise HTTPException(status_code=403, detail="Atletas não têm permissão para cadastrar novos lutadores.")

    try:
        if atleta.cpf:
            atleta_existente = db.query(models.Atleta).filter(models.Atleta.cpf == atleta.cpf).first()
            if atleta_existente:
                raise HTTPException(status_code=400, detail="CPF já cadastrado")

        if current_user and current_user.tipo_usuario == 'ENTIDADE':
            atleta.entidade_id = current_user.entidade_id

        novo_atleta = models.Atleta(**atleta.dict(exclude={'email'}))
        db.add(novo_atleta)
        db.flush()

        if current_user and current_user.tipo_usuario in ['ENTIDADE', 'MASTER'] and atleta.email:
            usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == atleta.email).first()
            if usuario_existente:
                db.rollback()
                raise HTTPException(status_code=400, detail="E-mail já cadastrado por outro usuário.")

            from security import get_password_hash
            hashed_password = get_password_hash("123456")
            novo_usuario = models.Usuario(
                email=atleta.email,
                nome=atleta.nome,
                hashed_password=hashed_password,
                tipo_usuario='ATLETA',
                atleta_id=novo_atleta.codatl,
                deve_mudar_senha=True
            )
            db.add(novo_usuario)

        db.commit()
        db.refresh(novo_atleta)
        return novo_atleta
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/importar-csv")
async def importar_csv_atletas(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario != 'ENTIDADE':
        raise HTTPException(status_code=403, detail="Apenas entidades podem importar atletas em massa.")
    if not current_user.entidade_id:
        raise HTTPException(status_code=400, detail="Usuário não possui uma entidade vinculada corretamente.")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Por favor, envie um arquivo .csv")

    try:
        contents = await file.read()
        decoded_content = contents.decode('utf-8-sig')

        csv_reader = csv.DictReader(io.StringIO(decoded_content))

        sucessos = 0
        erros = 0
        from security import get_password_hash

        for row in csv_reader:
            try:
                nome = row.get('Nome') or row.get('nome')
                email = row.get('Email') or row.get('email')
                cpf = row.get('CPF') or row.get('cpf')
                data_nascimento = row.get('Data de Nascimento') or row.get('data_nascimento')

                if not nome:
                    erros += 1
                    continue

                if cpf:
                    existente = db.query(models.Atleta).filter(models.Atleta.cpf == cpf).first()
                    if existente:
                        erros += 1
                        continue

                novo_atleta = models.Atleta(
                    nome=nome,
                    cpf=cpf,
                    entidade_id=current_user.entidade_id
                )

                if data_nascimento:
                    from datetime import datetime
                    try:
                        novo_atleta.data_nascimento = datetime.strptime(data_nascimento, "%d/%m/%Y").date()
                    except ValueError:
                        try:
                            novo_atleta.data_nascimento = datetime.strptime(data_nascimento, "%Y-%m-%d").date()
                        except ValueError:
                            pass

                novo_atleta.apelido = row.get('Apelido') or row.get('apelido')
                novo_atleta.faixa = row.get('Faixa') or row.get('faixa')

                peso = row.get('Peso') or row.get('peso')
                if peso:
                    try: novo_atleta.peso = float(str(peso).replace(',','.'))
                    except: pass

                altura = row.get('Altura') or row.get('altura')
                if altura:
                    try: novo_atleta.altura = float(str(altura).replace(',','.'))
                    except: pass

                novo_atleta.sexo = row.get('Sexo') or row.get('sexo')

                db.add(novo_atleta)
                db.flush()

                if email:
                    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == email).first()
                    if not usuario_existente:
                        senha_padrao = row.get('Senha') or row.get('senha') or 'kudow123'
                        hashed_password = get_password_hash(senha_padrao)

                        novo_usuario = models.Usuario(
                            email=email,
                            nome=nome,
                            hashed_password=hashed_password,
                            tipo_usuario="ATLETA",
                            atleta_id=novo_atleta.codatl,
                            deve_mudar_senha=True
                        )
                        db.add(novo_usuario)

                sucessos += 1

            except Exception as row_error:
                erros += 1
                continue

        db.commit()
        return {"sucessos": sucessos, "erros": erros}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

def _mascarar_dados_sensiveis_atleta(db: Session, atleta: models.Atleta, current_user: Optional[models.Usuario]):
    pode_ver_completo = False
    if current_user:
        if current_user.tipo_usuario == "MASTER":
            pode_ver_completo = True
        elif current_user.tipo_usuario == "ENTIDADE" and current_user.entidade_id == atleta.entidade_id:
            pode_ver_completo = True
        elif current_user.tipo_usuario == "ATLETA" and current_user.atleta_id == atleta.codatl:
            pode_ver_completo = True
    if not pode_ver_completo:
        db.expunge(atleta)
        if atleta.cpf and len(atleta.cpf) >= 8:
            atleta.cpf = f"***.{atleta.cpf[4:11]}-**" if "." in atleta.cpf else f"***{atleta.cpf[3:9]}**"
        if atleta.telefone:
            atleta.telefone = None
        if atleta.endereco:
            atleta.endereco = None
    return atleta

@router.get("/", response_model=list[schemas.AtletaResponse])
def listar_atletas(
    entidade_id: Optional[int] = None,
    q: Optional[str] = None,
    sexo: Optional[str] = None,
    faixa: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.Usuario] = Depends(get_optional_current_user),
    skip: int = 0,
    limit: int = 100
):
    query = db.query(models.Atleta)
    if entidade_id is not None:
        query = query.filter(models.Atleta.entidade_id == entidade_id)
    if sexo:
        query = query.filter(models.Atleta.sexo.ilike(f"%{sexo}%"))
    if faixa:
        query = query.filter(models.Atleta.faixa.ilike(f"%{faixa}%"))
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            (models.Atleta.nome.ilike(search)) |
            (models.Atleta.cpf.ilike(search))
        )
    atletas = query.offset(skip).limit(limit).all()
    return [_mascarar_dados_sensiveis_atleta(db, a, current_user) for a in atletas]

@router.get("/{atleta_id}", response_model=schemas.AtletaResponse)
def obter_atleta(
    atleta_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.Usuario] = Depends(get_optional_current_user)
):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    return _mascarar_dados_sensiveis_atleta(db, atleta, current_user)

@router.get("/{atleta_id}/historico")
def obter_historico_atleta(atleta_id: int, db: Session = Depends(get_db)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    inscricoes = db.query(models.Inscricao).filter(models.Inscricao.atleta_id == atleta_id).all()

    historico = []
    for insc in inscricoes:
        evento = db.query(models.Evento).filter(models.Evento.codevent == insc.evento_id).first()
        categoria = db.query(models.Categoria).filter(models.Categoria.codcat == insc.categoria_id).first()

        lutas = db.query(models.Partida).filter(
            models.Partida.evento_id == insc.evento_id,
            (models.Partida.atleta_1_id == atleta_id) | (models.Partida.atleta_2_id == atleta_id)
        ).all()

        vitorias = sum(1 for l in lutas if l.vencedor_id == atleta_id)
        derrotas = sum(1 for l in lutas if l.vencedor_id is not None and l.vencedor_id != atleta_id)

        historico.append({
            "evento_id": evento.codevent if evento else None,
            "evento_nome": evento.evento if evento else "Desconhecido",
            "evento_data": evento.data_inicio if evento else None,
            "evento_local": evento.local if evento else None,
            "categoria_nome": categoria.nome_categoria or categoria.descricao if categoria else "Desconhecida",
            "status_inscricao": insc.status,
            "desempenho": {
                "total_lutas": len(lutas),
                "vitorias": vitorias,
                "derrotas": derrotas
            }
        })

    return historico

@router.get("/{atleta_id}/lutas")
def obter_lutas_atleta(atleta_id: int, db: Session = Depends(get_db)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    partidas = db.query(models.Partida).filter(
        (models.Partida.atleta_1_id == atleta_id) | (models.Partida.atleta_2_id == atleta_id)
    ).order_by(models.Partida.codpartida.desc()).all()

    resultado_lutas = []
    total_vitorias = 0
    total_derrotas = 0
    vitorias_ippon = 0

    import json
    for p in partidas:
        evento = db.query(models.Evento).filter(models.Evento.codevent == p.evento_id).first()
        categoria = db.query(models.Categoria).filter(models.Categoria.codcat == p.categoria_id).first()

        is_atleta_1 = (p.atleta_1_id == atleta_id)
        oponente_id = p.atleta_2_id if is_atleta_1 else p.atleta_1_id
        oponente = db.query(models.Atleta).filter(models.Atleta.codatl == oponente_id).first() if oponente_id else None
        oponente_entidade = db.query(models.Entidade).filter(models.Entidade.codenti == oponente.entidade_id).first() if (oponente and oponente.entidade_id) else None

        canto = "VERMELHO (AKA)" if is_atleta_1 else "BRANCO (SHIRO)"

        status_luta = "EM_ABERTO"
        if p.vencedor_id:
            if p.vencedor_id == atleta_id:
                status_luta = "VITORIA"
                total_vitorias += 1
                if p.observacoes_arbitro and ("IPPON" in p.observacoes_arbitro.upper()):
                    vitorias_ippon += 1
            else:
                status_luta = "DERROTA"
                total_derrotas += 1

        historico_minutos = []
        if p.historico_pontos:
            try:
                historico_minutos = json.loads(p.historico_pontos)
            except:
                pass

        resultado_lutas.append({
            "partida_id": p.codpartida,
            "numero_luta": p.codpartida,
            "evento_id": p.evento_id,
            "evento_nome": evento.evento if evento else "Torneio Kudow",
            "evento_data": evento.data_inicio if evento else None,
            "evento_local": evento.local if evento else None,
            "categoria_id": p.categoria_id,
            "categoria_nome": categoria.nome_categoria or categoria.descricao if categoria else "Geral",
            "fase": p.fase or "Confronto Eliminatório",
            "status_luta": status_luta,
            "canto": canto,
            "vencedor_id": p.vencedor_id,
            "oponente": {
                "id": oponente.codatl if oponente else None,
                "nome": oponente.nome if oponente else "Aguardando Oponente / Bye",
                "faixa": oponente.faixa if oponente else "Geral",
                "estado": oponente.estado if oponente else "SP",
                "entidade": oponente_entidade.nome if oponente_entidade else "Federação"
            },
            "observacoes_arbitro": p.observacoes_arbitro,
            "historico_pontos": historico_minutos
        })

    total_lutas = total_vitorias + total_derrotas
    taxa_vitoria = round((total_vitorias / total_lutas * 100), 1) if total_lutas > 0 else 0.0

    return {
        "estatisticas": {
            "total_lutas": len(partidas),
            "lutas_finalizadas": total_lutas,
            "vitorias": total_vitorias,
            "derrotas": total_derrotas,
            "vitorias_ippon": vitorias_ippon,
            "taxa_vitoria": taxa_vitoria
        },
        "lutas": resultado_lutas
    }

@router.put("/{atleta_id}", response_model=schemas.AtletaResponse)
def atualizar_atleta(atleta_id: int, atleta_atualizado: schemas.AtletaUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para alterar a ficha cadastral deste atleta.")
    if current_user.tipo_usuario == 'ATLETA' and atleta.codatl != current_user.atleta_id:
        raise HTTPException(status_code=403, detail="Você só pode alterar o seu próprio perfil.")

    if atleta_atualizado.cpf and atleta_atualizado.cpf != atleta.cpf:
        atleta_existente = db.query(models.Atleta).filter(models.Atleta.cpf == atleta_atualizado.cpf).first()
        if atleta_existente:
            raise HTTPException(status_code=400, detail="CPF já cadastrado para outro atleta")

    for key, value in atleta_atualizado.dict(exclude_unset=True).items():
        setattr(atleta, key, value)

    db.commit()
    db.refresh(atleta)
    return atleta

@router.delete("/{atleta_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_atleta(atleta_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para excluir este atleta.")
    if current_user.tipo_usuario == 'ATLETA' and atleta.codatl != current_user.atleta_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para excluir este atleta.")

    db.delete(atleta)
    db.commit()
    return None

class BloqueioRequest(BaseModel):
    motivo_bloqueio: str
    bloqueado_por_id: int

MAX_UPLOAD_BYTES = 5 * 1024 * 1024

@router.post("/{atleta_id}/bloquear", response_model=schemas.AtletaResponse)
def bloquear_atleta(
    atleta_id: int,
    request: BloqueioRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Apenas entidades ou administradores podem bloquear atletas.")

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE':
        entidade_atleta = db.query(models.Entidade).filter(models.Entidade.codenti == atleta.entidade_id).first() if atleta.entidade_id else None
        is_propria_ou_filiada = (
            atleta.entidade_id == current_user.entidade_id or
            (entidade_atleta and entidade_atleta.entidade_pai_id == current_user.entidade_id)
        )
        if not is_propria_ou_filiada:
            raise HTTPException(status_code=403, detail="Sua entidade só pode bloquear atletas filiados diretamente a ela ou às suas academias subordinadas.")
        bloqueador_id = current_user.entidade_id
    else:
        bloqueador_id = request.bloqueado_por_id

    entidade_bloqueadora = db.query(models.Entidade).filter(models.Entidade.codenti == bloqueador_id).first()
    if not entidade_bloqueadora:
        raise HTTPException(status_code=404, detail="Entidade bloqueadora informada não existe")

    atleta.status_bloqueio = True
    atleta.motivo_bloqueio = request.motivo_bloqueio
    atleta.bloqueado_por_id = bloqueador_id

    db.commit()
    db.refresh(atleta)
    return atleta

@router.post("/{atleta_id}/desbloquear", response_model=schemas.AtletaResponse)
def desbloquear_atleta(
    atleta_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Apenas entidades ou administradores podem desbloquear atletas.")

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE':
        if atleta.bloqueado_por_id != current_user.entidade_id and atleta.entidade_id != current_user.entidade_id:
            raise HTTPException(status_code=403, detail="Sua entidade não possui permissão para remover o bloqueio deste atleta.")

    atleta.status_bloqueio = False
    atleta.motivo_bloqueio = None
    atleta.bloqueado_por_id = None

    db.commit()
    db.refresh(atleta)
    return atleta

@router.post("/{atleta_id}/documento")
def upload_documento(atleta_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    import uuid
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para modificar os anexos deste atleta.")
    if current_user.tipo_usuario == 'ATLETA' and atleta.codatl != current_user.atleta_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para modificar os anexos deste atleta.")

    ALLOWED_DOC_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp']
    ext = os.path.splitext(os.path.basename(file.filename or ""))[1].lower()
    if ext not in ALLOWED_DOC_EXT:
        raise HTTPException(status_code=400, detail="Formato de documento não permitido. Envie PDF, PNG, JPG ou WEBP.")

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="O arquivo excede o tamanho máximo permitido de 5 MB.")

    safe_name = f"doc_{atleta_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(MEDIA_DIR, safe_name)
    rel_path = f"media/atletas/{safe_name}"
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return {"filename": safe_name, "path": rel_path, "mensagem": "Documento enviado com sucesso"}

@router.post("/{atleta_id}/foto")
def upload_foto(atleta_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para modificar a foto deste atleta.")
    if current_user.tipo_usuario == 'ATLETA' and atleta.codatl != current_user.atleta_id:
        raise HTTPException(status_code=403, detail="Você só pode alterar a foto do seu próprio perfil.")

    ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
    file_extension = os.path.splitext(os.path.basename(file.filename or ""))[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de imagem inválido ({file_extension}). Formatos permitidos: PNG, JPG, JPEG, WEBP."
        )

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="A imagem excede o tamanho máximo permitido de 5 MB.")

    file_path = os.path.join(MEDIA_DIR, f"foto_{atleta_id}{file_extension}")
    rel_path = f"media/atletas/foto_{atleta_id}{file_extension}"
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    atleta.foto = rel_path
    db.commit()

    return {"filename": f"foto_{atleta_id}{file_extension}", "path": rel_path, "mensagem": "Foto enviada com sucesso"}

from datetime import date
from fastapi import Form

@router.get("/{atleta_id}/certificados", response_model=list[schemas.CertificadoResponse])
def listar_certificados(atleta_id: int, db: Session = Depends(get_db)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    certificados = db.query(models.CertificadoAtleta).filter(models.CertificadoAtleta.atleta_id == atleta_id).all()
    return certificados

@router.post("/{atleta_id}/certificados", response_model=schemas.CertificadoResponse, status_code=status.HTTP_201_CREATED)
def upload_certificado(
    atleta_id: int,
    data_certificado: date = Form(...),
    descricao: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para modificar os anexos deste atleta.")
    if current_user.tipo_usuario == 'ATLETA' and atleta.codatl != current_user.atleta_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para modificar os anexos deste atleta.")

    ext = os.path.splitext(os.path.basename(file.filename or ""))[1].lower()
    if ext != '.pdf':
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos para certificados.")

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="O certificado PDF excede o tamanho máximo permitido de 5 MB.")

    import uuid
    safe_filename = f"cert_{atleta_id}_{uuid.uuid4().hex[:8]}.pdf"
    file_path = os.path.join(CERTIFICADOS_DIR, safe_filename)
    rel_path = f"media/certificados/{safe_filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    novo_certificado = models.CertificadoAtleta(
        atleta_id=atleta_id,
        data_certificado=data_certificado,
        descricao=descricao,
        arquivo_caminho=rel_path
    )

    db.add(novo_certificado)
    db.commit()
    db.refresh(novo_certificado)

    return novo_certificado

@router.delete("/{atleta_id}/certificados/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_certificado(atleta_id: int, cert_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para modificar os anexos deste atleta.")
    if current_user.tipo_usuario == 'ATLETA' and atleta.codatl != current_user.atleta_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para modificar os anexos deste atleta.")

    certificado = db.query(models.CertificadoAtleta).filter(
        models.CertificadoAtleta.id == cert_id,
        models.CertificadoAtleta.atleta_id == atleta_id
    ).first()

    if not certificado:
        raise HTTPException(status_code=404, detail="Certificado não encontrado")

    try:
        full_cert_path = os.path.join(BACKEND_DIR, certificado.arquivo_caminho.lstrip("/"))
        if os.path.exists(full_cert_path):
            os.remove(full_cert_path)
    except Exception as e:
        print(f"Erro ao deletar arquivo {certificado.arquivo_caminho}: {e}")

    db.delete(certificado)
    db.commit()
    return None

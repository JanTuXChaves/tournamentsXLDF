from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models, schemas
from database import get_db
from dependencies import get_current_user
import os, csv, io, re
from typing import Optional
from collections import defaultdict
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape

def atualizar_partida_e_propagar(db: Session, partida: models.Partida, novo_vencedor_id: Optional[int]):
    partida.vencedor_id = novo_vencedor_id
    db.add(partida)
    db.flush()

    if partida.proxima_partida_id is not None:
        parent = db.query(models.Partida).filter(models.Partida.codpartida == partida.proxima_partida_id).first()
        if parent:
            children = db.query(models.Partida).filter(
                models.Partida.proxima_partida_id == parent.codpartida
            ).order_by(models.Partida.codpartida).all()

            is_left = True
            if len(children) >= 2:
                if partida.codpartida == children[1].codpartida:
                    is_left = False

            old_athlete_id = parent.atleta_1_id if is_left else parent.atleta_2_id

            if old_athlete_id != novo_vencedor_id:
                if is_left:
                    parent.atleta_1_id = novo_vencedor_id
                else:
                    parent.atleta_2_id = novo_vencedor_id
                db.add(parent)
                db.flush()

                atualizar_partida_e_propagar(db, parent, None)

            if partida.fase == "Semifinal":
                disputa_terceiro = db.query(models.Partida).filter(
                    models.Partida.evento_id == partida.evento_id,
                    models.Partida.categoria_id == partida.categoria_id,
                    models.Partida.fase == "Disputa de 3º Lugar"
                ).first()
                if disputa_terceiro:
                    if novo_vencedor_id is not None:
                        perdedor_id = partida.atleta_2_id if novo_vencedor_id == partida.atleta_1_id else partida.atleta_1_id
                    else:
                        perdedor_id = None
                    if is_left:
                        disputa_terceiro.atleta_1_id = perdedor_id
                    else:
                        disputa_terceiro.atleta_2_id = perdedor_id
                    disputa_terceiro.vencedor_id = None
                    db.add(disputa_terceiro)
                    db.flush()

router = APIRouter(
    prefix="/eventos",
    tags=["Eventos"]
)

@router.post("/", response_model=schemas.EventoResponse, status_code=status.HTTP_201_CREATED)
def criar_evento(evento: schemas.EventoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Você não tem permissão para criar eventos.")

    novo_evento = models.Evento(**evento.dict())

    if current_user.tipo_usuario == 'ENTIDADE':
        novo_evento.entidade_responsavel_id = current_user.entidade_id

    db.add(novo_evento)
    db.commit()
    db.refresh(novo_evento)
    return novo_evento

@router.get("/", response_model=list[schemas.EventoResponse])
def listar_eventos(q: Optional[str] = None, db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    query = db.query(models.Evento)
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            (models.Evento.evento.ilike(search)) |
            (models.Evento.local.ilike(search))
        )
    return query.offset(skip).limit(limit).all()

@router.get("/{evento_id}", response_model=schemas.EventoResponse)
def obter_evento(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return evento

@router.get("/{evento_id}/categorias", response_model=list[schemas.CategoriaResponse])
def listar_categorias_com_inscricoes(evento_id: int, db: Session = Depends(get_db)):
    categorias = db.query(models.Categoria).join(
        models.Inscricao, models.Inscricao.categoria_id == models.Categoria.codcat
    ).filter(
        models.Inscricao.evento_id == evento_id,
        models.Inscricao.status == "CONFIRMADA"
    ).distinct().all()
    return categorias

@router.get("/{evento_id}/partidas", response_model=list[schemas.PartidaDetailedResponse])
def listar_partidas_evento(evento_id: int, categoria_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Partida).filter(models.Partida.evento_id == evento_id)
    if categoria_id is not None:
        query = query.filter(models.Partida.categoria_id == categoria_id)
    partidas = query.all()

    res = []
    for p in partidas:
        res.append(schemas.PartidaDetailedResponse(
            codpartida=p.codpartida,
            evento_id=p.evento_id,
            categoria_id=p.categoria_id,
            atleta_1_id=p.atleta_1_id,
            atleta_2_id=p.atleta_2_id,
            vencedor_id=p.vencedor_id,
            fase=p.fase,
            proxima_partida_id=p.proxima_partida_id,
            atleta_1_nome=p.rel_atleta_1.nome if p.rel_atleta_1 else None,
            atleta_1_sexo=p.rel_atleta_1.sexo if p.rel_atleta_1 else None,
            atleta_1_peso=float(p.rel_atleta_1.peso) if p.rel_atleta_1 and p.rel_atleta_1.peso is not None else None,
            atleta_2_nome=p.rel_atleta_2.nome if p.rel_atleta_2 else None,
            atleta_2_sexo=p.rel_atleta_2.sexo if p.rel_atleta_2 else None,
            atleta_2_peso=float(p.rel_atleta_2.peso) if p.rel_atleta_2 and p.rel_atleta_2.peso is not None else None,
            vencedor_nome=p.rel_vencedor.nome if p.rel_vencedor else None,
            observacoes_arbitro=p.observacoes_arbitro,
            historico_pontos=p.historico_pontos
        ))
    return res

@router.get("/partidas/{partida_id}", response_model=schemas.PartidaDetailedResponse)
def obter_partida_detalhes(partida_id: int, db: Session = Depends(get_db)):
    partida = db.query(models.Partida).filter(models.Partida.codpartida == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada")

    atl1 = partida.rel_atleta_1
    atl2 = partida.rel_atleta_2

    return schemas.PartidaDetailedResponse(
        codpartida=partida.codpartida,
        evento_id=partida.evento_id,
        categoria_id=partida.categoria_id,
        atleta_1_id=partida.atleta_1_id,
        atleta_2_id=partida.atleta_2_id,
        vencedor_id=partida.vencedor_id,
        fase=partida.fase,
        proxima_partida_id=partida.proxima_partida_id,
        atleta_1_nome=atl1.nome if atl1 else None,
        atleta_1_sexo=atl1.sexo if atl1 else None,
        atleta_1_peso=float(atl1.peso) if (atl1 and atl1.peso is not None) else None,
        atleta_1_estado=atl1.estado if (atl1 and atl1.estado) else (atl1.rel_entidade.estado if (atl1 and atl1.rel_entidade and hasattr(atl1.rel_entidade, 'estado')) else "SP"),
        atleta_1_entidade=atl1.rel_entidade.nome if (atl1 and atl1.rel_entidade) else "Federação Kudow",
        atleta_2_nome=atl2.nome if atl2 else None,
        atleta_2_sexo=atl2.sexo if atl2 else None,
        atleta_2_peso=float(atl2.peso) if (atl2 and atl2.peso is not None) else None,
        atleta_2_estado=atl2.estado if (atl2 and atl2.estado) else (atl2.rel_entidade.estado if (atl2 and atl2.rel_entidade and hasattr(atl2.rel_entidade, 'estado')) else "SP"),
        atleta_2_entidade=atl2.rel_entidade.nome if (atl2 and atl2.rel_entidade) else "Federação Kudow",
        vencedor_nome=partida.rel_vencedor.nome if partida.rel_vencedor else None,
        evento_nome=partida.rel_evento.evento if partida.rel_evento else "Torneio Kudow",
        evento_entidade_responsavel_id=partida.rel_evento.entidade_responsavel_id if partida.rel_evento else None,
        categoria_nome=partida.rel_categoria.nome_categoria or partida.rel_categoria.descricao if partida.rel_categoria else "Categoria Oficial",
        observacoes_arbitro=partida.observacoes_arbitro,
        historico_pontos=partida.historico_pontos
    )

@router.put("/{evento_id}", response_model=schemas.EventoResponse)
def atualizar_evento(evento_id: int, evento_atualizado: schemas.EventoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Você não tem permissão para editar eventos.")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para editar este evento.")

    for key, value in evento_atualizado.dict().items():
        setattr(evento, key, value)

    db.commit()
    db.refresh(evento)
    return evento

@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_evento(evento_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Você não tem permissão para deletar eventos.")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para deletar este evento.")

    db.delete(evento)
    db.commit()
    return None

import random
import itertools
import math
from collections import defaultdict

def propagar_vencedor_para_pai(partida: models.Partida, db: Session):
    if not partida.vencedor_id or not partida.proxima_partida_id:
        return
    parent = db.query(models.Partida).filter(models.Partida.codpartida == partida.proxima_partida_id).first()
    if not parent:
        return

    filhos = db.query(models.Partida).filter(
        models.Partida.proxima_partida_id == parent.codpartida
    ).order_by(models.Partida.codpartida).all()

    if len(filhos) >= 1 and filhos[0].codpartida == partida.codpartida:
        parent.atleta_1_id = partida.vencedor_id
    elif len(filhos) >= 2 and filhos[1].codpartida == partida.codpartida:
        parent.atleta_2_id = partida.vencedor_id

    db.flush()

@router.post("/{evento_id}/gerar_chaves")
def gerar_chaves(
    evento_id: int,
    formato: Optional[str] = "MATA_MATA",
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Você não tem permissão para gerenciar as chaves deste evento.")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para gerenciar as chaves deste evento.")

    db.query(models.Partida).filter(models.Partida.evento_id == evento_id).delete()
    db.commit()

    inscricoes = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == evento_id,
        models.Inscricao.status == "CONFIRMADA"
    ).all()

    if not inscricoes:
        raise HTTPException(status_code=400, detail="Nenhuma inscrição confirmada para este evento")

    por_categoria = defaultdict(list)
    for insc in inscricoes:
        por_categoria[insc.categoria_id].append(insc.atleta_id)

    partidas_criadas_total = 0

    if formato == "ROUND_ROBIN":
        for cat_id, atletas_ids in por_categoria.items():
            if len(atletas_ids) < 2:
                if len(atletas_ids) == 1:
                    partida = models.Partida(
                        evento_id=evento_id,
                        categoria_id=cat_id,
                        atleta_1_id=atletas_ids[0],
                        atleta_2_id=None,
                        vencedor_id=atletas_ids[0],
                        fase="Final (Bye)"
                    )
                    db.add(partida)
                    partidas_criadas_total += 1
                continue

            for a1, a2 in itertools.combinations(atletas_ids, 2):
                partida = models.Partida(
                    evento_id=evento_id,
                    categoria_id=cat_id,
                    atleta_1_id=a1,
                    atleta_2_id=a2,
                    fase="Round Robin"
                )
                db.add(partida)
                partidas_criadas_total += 1
        db.commit()
        return {"mensagem": f"Chaves Round-Robin geradas com sucesso. Total de {partidas_criadas_total} partidas criadas."}

    for cat_id, atletas_ids in por_categoria.items():
        n = len(atletas_ids)
        if n == 0:
            continue

        if n == 1:
            partida = models.Partida(
                evento_id=evento_id,
                categoria_id=cat_id,
                atleta_1_id=atletas_ids[0],
                atleta_2_id=None,
                vencedor_id=atletas_ids[0],
                fase="Final"
            )
            db.add(partida)
            partidas_criadas_total += 1
            continue

        k = math.ceil(math.log2(n))
        m = 2 ** k

        lutas_por_rodada = {}

        for r in range(1, k + 1):
            num_lutas = 2 ** (k - r)

            if r == k:
                fase_nome = "Final"
            elif num_lutas == 2:
                fase_nome = "Semifinal"
            elif num_lutas == 4:
                fase_nome = "Quartas de Final"
            elif num_lutas == 8:
                fase_nome = "Oitavas de Final"
            else:
                fase_nome = f"Fase de {num_lutas * 2}"

            lutas_por_rodada[r] = []
            for i in range(num_lutas):
                partida = models.Partida(
                    evento_id=evento_id,
                    categoria_id=cat_id,
                    fase=fase_nome
                )
                db.add(partida)
                db.flush()
                lutas_por_rodada[r].append(partida)
                partidas_criadas_total += 1

        for r in range(1, k):
            for i, p in enumerate(lutas_por_rodada[r]):
                parent_match = lutas_por_rodada[r + 1][i // 2]
                p.proxima_partida_id = parent_match.codpartida
        db.flush()

        lutas_primeira_rodada = lutas_por_rodada[1]
        num_lutas_r1 = len(lutas_primeira_rodada)

        atletas_objs = db.query(models.Atleta).filter(models.Atleta.codatl.in_(atletas_ids)).all()
        entidade_por_atleta = {a.codatl: a.entidade_id for a in atletas_objs}

        grupos_entidade = defaultdict(list)
        for aid in atletas_ids:
            grupos_entidade[entidade_por_atleta.get(aid)].append(aid)

        for g in grupos_entidade.values():
            random.shuffle(g)

        grupos_ordenados = sorted(grupos_entidade.values(), key=len, reverse=True)
        atletas_intercalados = []
        max_len = max((len(g) for g in grupos_ordenados), default=0)
        for idx_item in range(max_len):
            for g in grupos_ordenados:
                if idx_item < len(g):
                    atletas_intercalados.append(g[idx_item])

        cabecas = atletas_intercalados[:num_lutas_r1]
        restantes = list(atletas_intercalados[num_lutas_r1:])

        for i, p in enumerate(lutas_primeira_rodada):
            if i < len(cabecas):
                p.atleta_1_id = cabecas[i]

        for p in lutas_primeira_rodada:
            if not restantes:
                break
            ent_1 = entidade_por_atleta.get(p.atleta_1_id)
            escolhido_idx = 0
            for idx_cand, cand_id in enumerate(restantes):
                if ent_1 is None or entidade_por_atleta.get(cand_id) != ent_1:
                    escolhido_idx = idx_cand
                    break
            p.atleta_2_id = restantes.pop(escolhido_idx)

        db.flush()

        for r in range(1, k + 1):
            for p in lutas_primeira_rodada if r == 1 else lutas_por_rodada[r]:
                if p.atleta_1_id is not None and p.atleta_2_id is None and r == 1:
                    p.vencedor_id = p.atleta_1_id
                    propagar_vencedor_para_pai(p, db)
                elif p.atleta_1_id is None and p.atleta_2_id is not None and r == 1:
                    p.vencedor_id = p.atleta_2_id
                    propagar_vencedor_para_pai(p, db)

        if n >= 4:
            partida_terceiro = models.Partida(
                evento_id=evento_id,
                categoria_id=cat_id,
                fase="Disputa de 3º Lugar"
            )
            db.add(partida_terceiro)
            partidas_criadas_total += 1

    db.commit()
    return {"mensagem": f"Chaves geradas com sucesso. Total de {partidas_criadas_total} partidas criadas."}

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BACKEND_DIR, "media", "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)

@router.get("/{evento_id}/pdf", response_class=FileResponse)
def gerar_pdf_chaves(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    partidas = db.query(models.Partida).filter(models.Partida.evento_id == evento_id).all()
    if not partidas:
        try:
            gerar_chaves(evento_id=evento_id, formato="MATA_MATA", db=db, current_user=None)
            partidas = db.query(models.Partida).filter(models.Partida.evento_id == evento_id).all()
        except Exception:
            pass

    if not partidas:
        raise HTTPException(status_code=400, detail="Ainda não existem atletas com inscrições confirmadas para gerar as chaves deste evento.")

    file_path = os.path.join(PDF_DIR, f"chaves_evento_{evento_id}.pdf")

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    c = canvas.Canvas(file_path, pagesize=landscape(A4))
    largura, altura = landscape(A4)

    por_categoria = defaultdict(list)
    for p in partidas:
        por_categoria[p.categoria_id].append(p)

    def desenhar_cabecalho(titulo, subcategoria):
        c.setFillColorRGB(0.08, 0.12, 0.25)
        c.rect(0, altura - 50, largura, 50, fill=True, stroke=False)

        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(25, altura - 22, f"KUDOW TORNEIOS • {titulo.upper()}")

        c.setFont("Helvetica", 9.5)
        c.setFillColorRGB(0.9, 0.9, 0.95)
        c.drawString(25, altura - 38, f"CHAVEAMENTO OFICIAL DA CATEGORIA: {subcategoria.upper()}")

    def desenhar_rodape_assinaturas(entidade_nome):
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(0.8)
        c.line(25, 55, largura - 25, 55)

        c.setStrokeColorRGB(0.2, 0.2, 0.2)
        c.line(40, 25, 280, 25)
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(40, 15, "ÁRBITRO GERAL / MESTRE RESPONSÁVEL")
        c.setFont("Helvetica", 7)
        c.drawString(40, 6, "Assinatura do Responsável Técnico")

        c.setStrokeColorRGB(0.2, 0.2, 0.2)
        c.line(320, 25, 560, 25)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(320, 15, f"ORGANIZAÇÃO: {entidade_nome[:35].upper()}")
        c.setFont("Helvetica", 7)
        c.drawString(320, 6, "Assinatura do Organizador / Federação")

        c.setStrokeColorRGB(0.2, 0.2, 0.2)
        c.line(600, 25, 800, 25)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(600, 15, "DATA E VISTO FINAL: _____ / _____ / 2026")
        c.setFont("Helvetica", 7)
        c.drawString(600, 6, "Homologação do Resultado")

    for cat_id, partidas_cat in por_categoria.items():
        categoria = db.query(models.Categoria).filter(models.Categoria.codcat == cat_id).first()
        nome_cat = categoria.nome_categoria or categoria.descricao if categoria else f"Categoria #{cat_id}"
        entidade = db.query(models.Entidade).filter(models.Entidade.codenti == evento.entidade_responsavel_id).first() if evento.entidade_responsavel_id else None
        entidade_nome = entidade.nome if entidade else "Federação / Entidade Organizadora"

        desenhar_cabecalho(evento.evento, nome_cat)
        desenhar_rodape_assinaturas(entidade_nome)

        fases_grupos = defaultdict(list)
        for p in partidas_cat:
            fase_nome = p.fase or "Partida"
            fases_grupos[fase_nome].append(p)

        rodadas_ordenadas = sorted(
            [item for item in fases_grupos.items() if item[0] != "Disputa de 3º Lugar"],
            key=lambda x: 1 if x[0] == 'Final' else -len(x[1])
        )

        num_rodadas = len(rodadas_ordenadas)
        if num_rodadas == 0:
            continue

        x_inicio = 25
        card_w = 122
        card_h = 25
        y_topo = altura - 75
        y_base = 65
        h_disponivel = y_topo - y_base

        espacamento_x = (largura - 50 - (num_rodadas * card_w)) / max(1, num_rodadas - 1) if num_rodadas > 1 else 0

        c.setFont("Helvetica-Bold", 8)
        for r_idx, (fase_nome, _) in enumerate(rodadas_ordenadas):
            col_x = x_inicio + r_idx * (card_w + espacamento_x)
            c.setFillColorRGB(0.92, 0.94, 0.98)
            c.roundRect(col_x, y_topo, card_w, 13, 3, fill=True, stroke=True)
            c.setFillColorRGB(0.1, 0.2, 0.4)
            c.drawCentredString(col_x + card_w / 2, y_topo + 3.5, fase_nome.upper())

        numero_luta_map = {}
        contador_luta = 1
        for fase_nome, lutas in rodadas_ordenadas:
            lutas_ordenadas = sorted(lutas, key=lambda x: (x.proxima_partida_id or 0, x.codpartida))
            for p in lutas_ordenadas:
                numero_luta_map[p.codpartida] = contador_luta
                contador_luta += 1

        pos_partidas = {}

        fase_0, lutas_0 = rodadas_ordenadas[0]
        n_lutas_0 = len(lutas_0)
        step_y_0 = h_disponivel / max(1, n_lutas_0)

        lutas_0_ordenadas = sorted(lutas_0, key=lambda x: (x.proxima_partida_id or 0, x.codpartida))
        for i, p in enumerate(lutas_0_ordenadas):
            cy = (y_topo - 10) - (i + 0.5) * step_y_0
            pos_partidas[p.codpartida] = {
                "x": x_inicio,
                "y": cy - card_h / 2,
                "cy": cy,
                "partida": p
            }

        for r_idx in range(1, num_rodadas):
            col_x = x_inicio + r_idx * (card_w + espacamento_x)
            fase_r, lutas_r = rodadas_ordenadas[r_idx]
            lutas_r_ordenadas = sorted(lutas_r, key=lambda x: (x.proxima_partida_id or 0, x.codpartida))

            for p in lutas_r_ordenadas:
                filhas = [info for info in pos_partidas.values() if info["partida"].proxima_partida_id == p.codpartida]
                if len(filhas) >= 2:
                    cy = (filhas[0]["cy"] + filhas[1]["cy"]) / 2
                elif len(filhas) == 1:
                    cy = filhas[0]["cy"]
                else:
                    cy = (y_topo - 10) - (len(lutas_r_ordenadas) / 2) * (h_disponivel / len(lutas_r_ordenadas))

                pos_partidas[p.codpartida] = {
                    "x": col_x,
                    "y": cy - card_h / 2,
                    "cy": cy,
                    "partida": p
                }

        c.setStrokeColorRGB(0.5, 0.5, 0.6)
        c.setLineWidth(1)
        for p_id, info in pos_partidas.items():
            p = info["partida"]
            if p.proxima_partida_id and p.proxima_partida_id in pos_partidas:
                pai_info = pos_partidas[p.proxima_partida_id]
                x_mid = info["x"] + card_w + espacamento_x / 2

                c.line(info["x"] + card_w, info["cy"], x_mid, info["cy"])
                c.line(x_mid, info["cy"], x_mid, pai_info["cy"])
                c.line(x_mid, pai_info["cy"], pai_info["x"], pai_info["cy"])

        for p_id, info in pos_partidas.items():
            px, py, p = info["x"], info["y"], info["partida"]
            num_luta = numero_luta_map.get(p.codpartida, p.codpartida)

            c.setStrokeColorRGB(0.15, 0.2, 0.3)
            c.setFillColorRGB(1, 1, 1)
            c.roundRect(px, py, card_w, card_h, 3, fill=True, stroke=True)

            c.setFillColorRGB(0.9, 0.9, 0.95)
            c.rect(px, py + card_h - 7, card_w, 7, fill=True, stroke=False)
            c.setFillColorRGB(0.2, 0.2, 0.3)
            c.setFont("Helvetica-Bold", 5.5)
            c.drawString(px + 3, py + card_h - 5.5, f"LUTA #{num_luta}")

            c.setStrokeColorRGB(0.85, 0.85, 0.85)
            c.line(px, py + (card_h - 7) / 2, px + card_w, py + (card_h - 7) / 2)

            atl1 = p.rel_atleta_1.nome if p.rel_atleta_1 else ("Bye" if p.atleta_2_id else "")
            venceu1 = p.vencedor_id and p.vencedor_id == p.atleta_1_id
            c.setFont("Helvetica-Bold" if venceu1 else "Helvetica", 6.5)
            c.setFillColorRGB(0.7, 0, 0) if venceu1 else c.setFillColorRGB(0, 0, 0)
            if atl1:
                c.drawString(px + 4, py + card_h - 14, atl1[:22])

            atl2 = p.rel_atleta_2.nome if p.rel_atleta_2 else ("Bye" if p.atleta_1_id else "")
            venceu2 = p.vencedor_id and p.vencedor_id == p.atleta_2_id
            c.setFont("Helvetica-Bold" if venceu2 else "Helvetica", 6.5)
            c.setFillColorRGB(0.7, 0, 0) if venceu2 else c.setFillColorRGB(0, 0, 0)
            if atl2:
                c.drawString(px + 4, py + 3, atl2[:22])

        c.showPage()

    c.save()
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"Chaves_{evento.evento}.pdf",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )

@router.get("/{evento_id}/inscricoes")
def listar_inscricoes_evento(evento_id: int, db: Session = Depends(get_db)):
    inscricoes = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == evento_id
    ).all()

    resultado = []
    for insc in inscricoes:
        atleta = db.query(models.Atleta).filter(models.Atleta.codatl == insc.atleta_id).first()
        categoria = db.query(models.Categoria).filter(models.Categoria.codcat == insc.categoria_id).first()
        pagamento = db.query(models.Pagamento).filter(models.Pagamento.inscricao_id == insc.codinsc).first()
        if atleta:
            peso_atual = float(atleta.peso) if atleta.peso is not None else None
            peso_min = float(categoria.peso_minimo) if (categoria and categoria.peso_minimo is not None) else None
            peso_max = float(categoria.peso_maximo) if (categoria and categoria.peso_maximo is not None) else None
            dentro_do_peso = True
            if peso_atual is not None:
                if peso_max is not None and peso_atual > peso_max:
                    dentro_do_peso = False
                if peso_min is not None and peso_atual < peso_min:
                    dentro_do_peso = False

            resultado.append({
                "inscricao_id": insc.codinsc,
                "atleta_id": atleta.codatl,
                "atleta_nome": atleta.nome,
                "cpf": atleta.cpf,
                "faixa": atleta.faixa,
                "peso": peso_atual,
                "sexo": atleta.sexo,
                "estado": atleta.estado or (atleta.rel_entidade.estado if (atleta.rel_entidade and hasattr(atleta.rel_entidade, 'estado')) else "SP"),
                "entidade_nome": atleta.rel_entidade.nome if atleta.rel_entidade else "Federação Kudow",
                "categoria_id": categoria.codcat if categoria else insc.categoria_id,
                "categoria_nome": (categoria.nome_categoria or categoria.descricao) if categoria else "Categoria Geral",
                "peso_minimo": peso_min,
                "peso_maximo": peso_max,
                "dentro_do_peso": dentro_do_peso,
                "pagamento_status": pagamento.status if pagamento else "PENDENTE",
                "status": insc.status or "CONFIRMADA"
            })
    return resultado

class PesagemOficialRequest(BaseModel):
    peso_aferido: float
    acao: Optional[str] = "VALIDAR"
    nova_categoria_id: Optional[int] = None

@router.put("/{evento_id}/inscricoes/{inscricao_id}/pesagem")
def registrar_pesagem_oficial(
    evento_id: int,
    inscricao_id: int,
    dados: PesagemOficialRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario not in ["MASTER", "ENTIDADE", "ARBITRO"]:
        raise HTTPException(status_code=403, detail="Apenas organizadores e árbitros podem aferir pesagem.")

    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    if current_user.tipo_usuario == "ENTIDADE" and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.codinsc == inscricao_id,
        models.Inscricao.evento_id == evento_id
    ).first()
    if not inscricao:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada.")

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == inscricao.atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado.")

    atleta.peso = dados.peso_aferido

    if dados.acao == "REENQUADRAR" and dados.nova_categoria_id:
        inscricao.categoria_id = dados.nova_categoria_id
        inscricao.status = "CONFIRMADA"
    elif dados.acao == "REPROVAR":
        inscricao.status = "REPROVADO_PESAGEM"
    else:
        categoria = db.query(models.Categoria).filter(models.Categoria.codcat == inscricao.categoria_id).first()
        acima = categoria and categoria.peso_maximo is not None and dados.peso_aferido > float(categoria.peso_maximo)
        abaixo = categoria and categoria.peso_minimo is not None and dados.peso_aferido < float(categoria.peso_minimo)
        if acima or abaixo:
            inscricao.status = "FORA_DO_PESO"
        else:
            inscricao.status = "CONFIRMADA"

    db.commit()
    return {
        "mensagem": "Pesagem aferida com sucesso!",
        "inscricao_id": inscricao.codinsc,
        "peso_aferido": float(atleta.peso),
        "categoria_id": inscricao.categoria_id,
        "status": inscricao.status
    }

class InscricaoAdminRequest(BaseModel):
    atleta_id: int
    categoria_id: int

@router.post("/{evento_id}/inscricoes/admin")
def adicionar_inscricao_admin(evento_id: int, request: InscricaoAdminRequest, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Acesso restrito a organizadores.")

    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == request.atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    existente = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == evento_id,
        models.Inscricao.atleta_id == request.atleta_id
    ).first()

    if existente:
        existente.categoria_id = request.categoria_id
        existente.status = "CONFIRMADA"
        db.commit()
        db.refresh(existente)
        return {"mensagem": "Inscrição atualizada com sucesso.", "inscricao_id": existente.codinsc}

    nova_insc = models.Inscricao(
        evento_id=evento_id,
        atleta_id=request.atleta_id,
        categoria_id=request.categoria_id,
        status="CONFIRMADA"
    )
    db.add(nova_insc)
    db.commit()
    db.refresh(nova_insc)
    return {"mensagem": "Atleta inscrito com sucesso.", "inscricao_id": nova_insc.codinsc}

@router.delete("/{evento_id}/inscricoes/{inscricao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_inscricao(evento_id: int, inscricao_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Acesso restrito.")

    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.codinsc == inscricao_id,
        models.Inscricao.evento_id == evento_id
    ).first()
    if not inscricao:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    db.delete(inscricao)
    db.commit()
    return None

@router.get("/{evento_id}/modelo-csv")
def baixar_modelo_csv_torneio(evento_id: int):
    csv_content = (
        "Nome,CPF,Categoria,Faixa,Peso,Sexo,Entidade,Estado,Email,Data_Nascimento\n"
        "Carlos 'Trovão' Silva,123.456.789-00,Masculino Adulto Até 81kg,Preta,80.5,MASCULINO,Associação Kudow de Judô,SP,carlos.silva@email.com,15/05/1995\n"
        "Ana 'Fênix' Oliveira,987.654.321-11,Feminino Adulto Até 63kg,Marrom,62.0,FEMININO,Academia Samurai de Artes Marciais,RJ,ana.oliveira@email.com,20/08/1998\n"
        "Bruno 'Navalha' Rodrigues,456.789.123-22,Masculino Adulto Até 81kg,Roxa,79.0,MASCULINO,Clube dos Campeões,SP,bruno.rodrigues@email.com,10/02/1997\n"
    )
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=modelo_atletas_torneio_{evento_id}.csv"}
    )

@router.post("/{evento_id}/importar-csv")
async def importar_csv_atletas_torneio(
    evento_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Apenas organizadores podem importar atletas via CSV.")

    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Formato inválido. Por favor, envie um arquivo .csv")

    try:
        contents = await file.read()
        decoded_content = contents.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(decoded_content))

        categorias_existentes = db.query(models.Categoria).all()
        cat_map = {}
        for c in categorias_existentes:
            nome_clean = (c.nome_categoria or c.descricao or '').strip().lower()
            if nome_clean:
                cat_map[nome_clean] = c.codcat

        cat_padrao_id = categorias_existentes[0].codcat if categorias_existentes else 1

        total_processados = 0
        cadastrados_novos = 0
        ja_existentes = 0
        inscritos_no_torneio = 0
        erros = []

        from security import get_password_hash
        from datetime import datetime

        for idx, row in enumerate(csv_reader, start=2):
            total_processados += 1
            nome = (row.get('Nome') or row.get('nome') or row.get('Atleta') or '').strip()
            cpf_raw = (row.get('CPF') or row.get('cpf') or '').strip()
            categoria_str = (row.get('Categoria') or row.get('categoria') or row.get('Nome_Categoria') or '').strip()
            faixa = (row.get('Faixa') or row.get('faixa') or row.get('Graduacao') or '').strip()
            peso_raw = row.get('Peso') or row.get('peso') or ''
            sexo = (row.get('Sexo') or row.get('sexo') or 'MASCULINO').strip().upper()
            if sexo not in ['MASCULINO', 'FEMININO']:
                sexo = 'MASCULINO'
            entidade_nome = (row.get('Entidade') or row.get('entidade') or row.get('Academia') or row.get('Clube') or '').strip()
            estado = (row.get('Estado') or row.get('estado') or row.get('UF') or 'SP').strip().upper()[:2]
            email = (row.get('Email') or row.get('email') or '').strip()
            data_nasc_str = (row.get('Data_Nascimento') or row.get('Data de Nascimento') or row.get('data_nascimento') or '').strip()

            if not nome:
                erros.append(f"Linha {idx}: Nome do atleta é obrigatório.")
                continue

            cpf_clean = re.sub(r'\D', '', cpf_raw) if cpf_raw else None
            cpf_formatado = f"{cpf_clean[:3]}.{cpf_clean[3:6]}.{cpf_clean[6:9]}-{cpf_clean[9:]}" if cpf_clean and len(cpf_clean) == 11 else cpf_raw

            peso_num = None
            if peso_raw:
                try:
                    peso_num = float(str(peso_raw).replace(',', '.').strip())
                except:
                    pass

            data_nasc = None
            if data_nasc_str:
                for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]:
                    try:
                        data_nasc = datetime.strptime(data_nasc_str, fmt).date()
                        break
                    except:
                        pass

            entidade_id = current_user.entidade_id
            if entidade_nome:
                entidade_existente = db.query(models.Entidade).filter(
                    models.Entidade.nome.ilike(f"%{entidade_nome}%")
                ).first()
                if entidade_existente:
                    entidade_id = entidade_existente.codenti
                elif current_user.tipo_usuario == 'MASTER':
                    nova_ent = models.Entidade(nome=entidade_nome, estado=estado or 'SP')
                    db.add(nova_ent)
                    db.flush()
                    entidade_id = nova_ent.codenti

            atleta = None
            if cpf_clean and len(cpf_clean) >= 6:
                atleta = db.query(models.Atleta).filter(
                    (models.Atleta.cpf == cpf_formatado) | (models.Atleta.cpf == cpf_clean)
                ).first()

            if not atleta and nome:
                atleta = db.query(models.Atleta).filter(
                    models.Atleta.nome.ilike(nome),
                    models.Atleta.entidade_id == entidade_id
                ).first()

            if atleta:
                ja_existentes += 1
                if faixa and not atleta.faixa: atleta.faixa = faixa
                if peso_num and not atleta.peso: atleta.peso = peso_num
                if estado and not atleta.estado: atleta.estado = estado
                if data_nasc and not atleta.data_nascimento: atleta.data_nascimento = data_nasc
                db.flush()
            else:
                cadastrados_novos += 1
                atleta = models.Atleta(
                    nome=nome,
                    cpf=cpf_formatado or None,
                    faixa=faixa or 'Geral',
                    peso=peso_num,
                    sexo=sexo,
                    estado=estado or 'SP',
                    data_nascimento=data_nasc,
                    entidade_id=entidade_id
                )
                db.add(atleta)
                db.flush()

                if email:
                    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == email).first()
                    if not usuario_existente:
                        novo_usuario = models.Usuario(
                            email=email,
                            nome=nome,
                            hashed_password=get_password_hash("123456"),
                            tipo_usuario='ATLETA',
                            atleta_id=atleta.codatl,
                            deve_mudar_senha=True
                        )
                        db.add(novo_usuario)
                        db.flush()

            cat_alvo_id = cat_padrao_id
            if categoria_str:
                cat_match = cat_map.get(categoria_str.lower())
                if cat_match:
                    cat_alvo_id = cat_match
                else:
                    for k, v in cat_map.items():
                        if categoria_str.lower() in k or k in categoria_str.lower():
                            cat_alvo_id = v
                            break

            inscricao = db.query(models.Inscricao).filter(
                models.Inscricao.evento_id == evento_id,
                models.Inscricao.atleta_id == atleta.codatl
            ).first()

            if inscricao:
                inscricao.categoria_id = cat_alvo_id
                inscricao.status = "CONFIRMADA"
            else:
                nova_insc = models.Inscricao(
                    evento_id=evento_id,
                    atleta_id=atleta.codatl,
                    categoria_id=cat_alvo_id,
                    status="CONFIRMADA"
                )
                db.add(nova_insc)
                inscritos_no_torneio += 1

        db.commit()

        return {
            "mensagem": "Importação de atletas concluída com sucesso!",
            "total_processados": total_processados,
            "cadastrados_novos": cadastrados_novos,
            "ja_existentes": ja_existentes,
            "inscritos_no_torneio": total_processados - len(erros),
            "erros": erros
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo CSV: {str(e)}")

@router.get("/{evento_id}/inscricoes/sem-par")
@router.get("/{evento_id}/inscricoes-sem-par")
def listar_inscricoes_sem_par(evento_id: int, db: Session = Depends(get_db)):
    inscricoes = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == evento_id,
        models.Inscricao.status == "CONFIRMADA"
    ).all()

    por_categoria = defaultdict(list)
    for insc in inscricoes:
        por_categoria[insc.categoria_id].append(insc)

    solitarios = []
    for cat_id, insc_list in por_categoria.items():
        if len(insc_list) == 1:
            insc = insc_list[0]
            atleta = db.query(models.Atleta).filter(models.Atleta.codatl == insc.atleta_id).first()
            categoria = db.query(models.Categoria).filter(models.Categoria.codcat == cat_id).first()
            solitarios.append({
                "inscricao_id": insc.codinsc,
                "atleta_id": atleta.codatl,
                "atleta_nome": atleta.nome,
                "categoria_id": categoria.codcat,
                "categoria_nome": categoria.nome_categoria or categoria.descricao
            })

    return solitarios

class ReenquadramentoRequest(BaseModel):
    nova_categoria_id: int

@router.put("/{evento_id}/inscricoes/{inscricao_id}/re-enquadrar")
def re_enquadrar_atleta(evento_id: int, inscricao_id: int, request: ReenquadramentoRequest, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    if current_user.tipo_usuario == 'ENTIDADE' and evento.entidade_responsavel_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    if current_user.tipo_usuario != 'MASTER':
        if current_user.tipo_usuario == 'ENTIDADE':
            if evento.entidade_responsavel_id != current_user.entidade_id:
                raise HTTPException(status_code=403, detail="Você não tem permissão para gerenciar as inscrições deste evento.")
        else:
            raise HTTPException(status_code=403, detail="Você não tem permissão para gerenciar as inscrições deste evento.")

    inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.codinsc == inscricao_id,
        models.Inscricao.evento_id == evento_id
    ).first()

    if not inscricao:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada neste evento")

    nova_categoria = db.query(models.Categoria).filter(models.Categoria.codcat == request.nova_categoria_id).first()
    if not nova_categoria:
        raise HTTPException(status_code=404, detail="Nova Categoria não encontrada")

    inscricao.categoria_id = request.nova_categoria_id
    db.commit()
    db.refresh(inscricao)

    return {"mensagem": "Atleta re-enquadrado com sucesso.", "nova_categoria_id": inscricao.categoria_id}

class ResultadoPartidaRequest(BaseModel):
    vencedor_id: Optional[int] = None
    pontos_atleta_1: Optional[int] = 0
    pontos_atleta_2: Optional[int] = 0
    punicoes_atleta_1: Optional[int] = 0
    punicoes_atleta_2: Optional[int] = 0
    tipo_vitoria: Optional[str] = "Decisão Arbitral"
    observacoes: Optional[str] = None
    historico_pontos: Optional[str] = None
    sem_mesa_controle: Optional[bool] = False

@router.put("/partidas/{partida_id}")
def atualizar_resultado(
    partida_id: int,
    vencedor_id: Optional[int] = None,
    dados: Optional[ResultadoPartidaRequest] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    partida = db.query(models.Partida).filter(models.Partida.codpartida == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada")

    evento = db.query(models.Evento).filter(models.Evento.codevent == partida.evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento associado à partida não encontrado")

    if current_user.tipo_usuario not in ['MASTER', 'ARBITRO']:
        if current_user.tipo_usuario == 'ENTIDADE':
            if evento.entidade_responsavel_id != current_user.entidade_id:
                raise HTTPException(status_code=403, detail="Sua entidade não tem permissão para gerenciar as partidas deste evento.")
        else:
            raise HTTPException(status_code=403, detail="Acesso negado.")

    from routers.ranking import recalcular_ranking_db
    venc_id = dados.vencedor_id if (dados and dados.vencedor_id is not None) else vencedor_id

    if venc_id == 0 or venc_id is None:
        atualizar_partida_e_propagar(db, partida, None)
        partida.observacoes_arbitro = None
        partida.historico_pontos = None
        db.commit()
        recalcular_ranking_db(db)
        db.refresh(partida)
        return {"mensagem": "Luta reaberta com sucesso e retornada para Em Aberto.", "vencedor_id": None, "status": "PRONTO"}

    if venc_id not in [partida.atleta_1_id, partida.atleta_2_id]:
        raise HTTPException(status_code=400, detail="Vencedor deve ser um dos atletas da partida")

    nome_1 = partida.rel_atleta_1.nome if partida.rel_atleta_1 else "Canto Vermelho"
    nome_2 = partida.rel_atleta_2.nome if partida.rel_atleta_2 else "Canto Branco"
    nome_venc = nome_1 if venc_id == partida.atleta_1_id else nome_2

    if dados and dados.sem_mesa_controle:
        tipo = dados.tipo_vitoria or "Decisão Arbitral"
        p1 = dados.pontos_atleta_1 or 0
        p2 = dados.pontos_atleta_2 or 0
        s1 = dados.punicoes_atleta_1 or 0
        s2 = dados.punicoes_atleta_2 or 0

        obs_texto = (
            f"📋 SÚMULA OFICIAL - RESULTADO MANUAL (SEM USO DA MESA DE CONTROLE)\n"
            f"• Luta encerrada diretamente pelo administrador do evento.\n"
            f"• Vencedor Oficial: {nome_venc} ({tipo})\n"
            f"• Placar Final: {nome_1} ({p1} pts / {s1} shidos) x {nome_2} ({p2} pts / {s2} shidos)"
        )
        if dados.observacoes:
            obs_texto += f"\n• Observações do Administrador: {dados.observacoes.strip()}"

        partida.observacoes_arbitro = obs_texto

        import json
        from datetime import datetime
        historico_manual = [
            {
                "id": int(datetime.utcnow().timestamp() * 1000),
                "tempo_formatado": "MANUAL",
                "canto": "GERAL",
                "acao": f"VITÓRIA ({tipo.upper()})",
                "detalhe": f"Resultado lançado manualmente pelo administrador: {nome_venc} venceu ({p1}x{p2} pts | {s1}x{s2} shidos). Luta realizada sem uso da mesa de controle.",
                "hora_real": datetime.now().strftime("%H:%M:%S")
            }
        ]
        partida.historico_pontos = json.dumps(historico_manual, ensure_ascii=False)
    elif dados:
        if dados.historico_pontos:
            partida.historico_pontos = dados.historico_pontos
        if dados.observacoes:
            partida.observacoes_arbitro = dados.observacoes
        elif dados.tipo_vitoria:
            partida.observacoes_arbitro = f"🥋 Vitória oficial de {nome_venc} ({dados.tipo_vitoria}) | Placar final: {dados.pontos_atleta_1}x{dados.pontos_atleta_2} pts ({dados.punicoes_atleta_1}x{dados.punicoes_atleta_2} shidos)."

    atualizar_partida_e_propagar(db, partida, venc_id)
    db.commit()
    recalcular_ranking_db(db)
    db.refresh(partida)

    return {"mensagem": "Resultado atualizado com sucesso e ranking sincronizado.", "vencedor_id": venc_id, "status": "FINALIZADA"}

@router.get("/partidas/{partida_id}/sumula-pdf", response_class=FileResponse)
def gerar_pdf_sumula_partida(partida_id: int, db: Session = Depends(get_db)):
    import json
    from datetime import datetime

    partida = db.query(models.Partida).filter(models.Partida.codpartida == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada")

    evento = partida.rel_evento
    categoria = partida.rel_categoria
    atl1 = partida.rel_atleta_1
    atl2 = partida.rel_atleta_2
    venc = partida.rel_vencedor

    file_path = os.path.join(PDF_DIR, f"sumula_partida_{partida_id}.pdf")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    c = canvas.Canvas(file_path, pagesize=A4)
    largura, altura = A4

    c.setFillColorRGB(0.08, 0.12, 0.25)
    c.rect(0, altura - 70, largura, 70, fill=True, stroke=False)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(30, altura - 30, "KUDOW TORNEIOS • SÚMULA OFICIAL DE COMBATE")
    c.setFont("Helvetica", 10)
    nome_ev = evento.evento if evento else "Torneio Oficial Kudow"
    nome_cat = (categoria.nome_categoria or categoria.descricao) if categoria else "Categoria Oficial"
    c.drawString(30, altura - 48, f"Evento: {nome_ev}  |  Fase: {partida.fase or 'Eliminatória'}  |  Luta #{partida.codpartida}")
    c.drawString(30, altura - 62, f"Categoria: {nome_cat}")

    y = altura - 100

    c.setStrokeColorRGB(0.8, 0.8, 0.85)
    c.setFillColorRGB(0.98, 0.95, 0.95)
    c.roundRect(30, y - 65, 255, 65, 5, fill=True, stroke=True)
    c.setFillColorRGB(0.75, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(40, y - 16, "CANTO VERMELHO (AKA)")
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y - 34, (atl1.nome if atl1 else "Bye / Aguardando")[:30])
    c.setFont("Helvetica", 8.5)
    ent1 = atl1.rel_entidade.nome if (atl1 and atl1.rel_entidade) else "Federação Kudow"
    c.drawString(40, y - 48, f"Entidade: {ent1[:32]}")
    c.drawString(40, y - 60, f"Peso: {atl1.peso or '--'} kg  |  Faixa: {atl1.faixa or '--'}")

    c.setFillColorRGB(0.96, 0.97, 0.99)
    c.roundRect(310, y - 65, 255, 65, 5, fill=True, stroke=True)
    c.setFillColorRGB(0.15, 0.25, 0.45)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(320, y - 16, "CANTO BRANCO (SHIRO)")
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(320, y - 34, (atl2.nome if atl2 else "Bye / Aguardando")[:30])
    c.setFont("Helvetica", 8.5)
    ent2 = atl2.rel_entidade.nome if (atl2 and atl2.rel_entidade) else "Federação Kudow"
    c.drawString(320, y - 48, f"Entidade: {ent2[:32]}")
    c.drawString(320, y - 60, f"Peso: {atl2.peso or '--'} kg  |  Faixa: {atl2.faixa or '--'}")

    y -= 85

    c.setFillColorRGB(0.92, 0.97, 0.94)
    c.setStrokeColorRGB(0.1, 0.6, 0.35)
    c.roundRect(30, y - 42, largura - 60, 42, 5, fill=True, stroke=True)
    c.setFillColorRGB(0.06, 0.4, 0.22)
    c.setFont("Helvetica-Bold", 11)
    vencedor_str = venc.nome if venc else "LUTA EM ABERTO / SEM VENCEDOR DECLARADO"
    c.drawString(42, y - 18, f"VENCEDOR OFICIAL: {vencedor_str.upper()}")
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.15, 0.15, 0.15)
    c.drawString(42, y - 34, f"Status da Partida: {'FINALIZADA' if partida.vencedor_id else 'PENDENTE'}  •  Emitido em {datetime.now().strftime('%d/%m/%Y %H:%M')}")

    y -= 62

    c.setFillColorRGB(0.1, 0.1, 0.2)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(30, y, "PARECER DA ARBITRAGEM / SÚMULA:")
    y -= 14

    obs_linhas = (partida.observacoes_arbitro or "Nenhuma observação adicional registrada pelo árbitro.").split("\n")
    c.setFont("Helvetica", 8.5)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    for linha in obs_linhas[:8]:
        c.drawString(35, y, linha[:105])
        y -= 12

    y -= 12

    c.setFillColorRGB(0.1, 0.1, 0.2)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(30, y, "HISTÓRICO CRONOLÓGICO DE PONTOS E PUNIÇÕES:")
    y -= 16

    c.setFillColorRGB(0.9, 0.92, 0.96)
    c.rect(30, y - 4, largura - 60, 16, fill=True, stroke=False)
    c.setFillColorRGB(0.1, 0.15, 0.3)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(36, y, "TEMPO")
    c.drawString(95, y, "CANTO")
    c.drawString(175, y, "AÇÃO / PONTUAÇÃO")
    c.drawString(310, y, "DETALHAMENTO")
    y -= 16

    historico_lista = []
    if partida.historico_pontos:
        try:
            historico_lista = json.loads(partida.historico_pontos)
        except Exception:
            historico_lista = []

    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.15, 0.15, 0.15)
    if not historico_lista:
        c.drawString(36, y, "--")
        c.drawString(95, y, "--")
        c.drawString(175, y, "Sem eventos detalhados")
        c.drawString(310, y, "Placar encerrado sem linha do tempo de eventos.")
        y -= 14
    else:
        for item in historico_lista[:22]:
            if y < 110:
                break
            c.drawString(36, y, str(item.get("tempo_formatado", "--"))[:10])
            c.drawString(95, y, str(item.get("canto", "--"))[:12])
            c.drawString(175, y, str(item.get("acao", "--"))[:24])
            c.drawString(310, y, str(item.get("detalhe", ""))[:48])
            c.setStrokeColorRGB(0.9, 0.9, 0.9)
            c.line(30, y - 3, largura - 30, y - 3)
            y -= 14

    c.setStrokeColorRGB(0.3, 0.3, 0.3)
    c.line(40, 55, 250, 55)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(40, 42, "ÁRBITRO CENTRAL DO TATAME")
    c.setFont("Helvetica", 7)
    c.drawString(40, 32, "Assinatura e Homologação Técnica")

    c.line(340, 55, 550, 55)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(340, 42, "MESÁRIO / COORDENAÇÃO DE MESA")
    c.setFont("Helvetica", 7)
    c.drawString(340, 32, "Conferência de Súmula Eletrônica")

    c.save()
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"Sumula_Luta_{partida_id}.pdf",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )

def _calcular_categorias_elegiveis_atleta(atleta: models.Atleta, todas_categorias: list[models.Categoria]):
    from datetime import date
    hoje = date.today()
    idade = (hoje.year - atleta.data_nascimento.year - ((hoje.month, hoje.day) < (atleta.data_nascimento.month, atleta.data_nascimento.day))) if atleta.data_nascimento else None
    peso = float(atleta.peso) if atleta.peso is not None else None
    sexo_atl = (atleta.sexo or "MASCULINO").strip().upper()
    prefix_sexo = sexo_atl[0] if sexo_atl else "M"

    elegiveis = []
    categoria_natural_id = None

    for cat in todas_categorias:
        cat_sexo = (cat.sexo or "").strip().upper()
        if cat_sexo and not cat_sexo.startswith(prefix_sexo):
            continue

        if idade is not None and cat.idade_minima is not None and cat.idade_maxima is not None:
            if not (cat.idade_minima <= idade <= cat.idade_maxima):
                continue

        p_min = float(cat.peso_minimo) if cat.peso_minimo is not None else 0.0
        p_max = float(cat.peso_maximo) if cat.peso_maximo is not None else 999.0
        is_absoluto = (cat.classificacao or "").strip().upper() in ("ABSOLUTO", "LIVRE")

        if peso is not None:
            if not is_absoluto and p_max < peso:
                continue

            is_natural = (not is_absoluto) and (p_min <= peso <= p_max)
            is_acima = is_absoluto or (p_min > peso)
        else:
            is_natural = not is_absoluto
            is_acima = is_absoluto

        if is_natural and categoria_natural_id is None:
            categoria_natural_id = cat.codcat

        elegiveis.append({
            "codcat": cat.codcat,
            "descricao": cat.descricao,
            "nome_categoria": cat.nome_categoria or cat.descricao,
            "classificacao": cat.classificacao,
            "sexo": cat.sexo,
            "idade_minima": cat.idade_minima,
            "idade_maxima": cat.idade_maxima,
            "peso_minimo": float(cat.peso_minimo) if cat.peso_minimo is not None else 0.0,
            "peso_maximo": float(cat.peso_maximo) if cat.peso_maximo is not None else None,
            "tipo_elegibilidade": "NATURAL" if is_natural else "ACIMA"
        })

    return {
        "atleta_id": atleta.codatl,
        "atleta_nome": atleta.nome,
        "peso_atual": peso,
        "idade": idade,
        "sexo": sexo_atl,
        "categoria_natural_id": categoria_natural_id,
        "categorias_elegiveis": elegiveis
    }

@router.get("/{evento_id}/categorias-elegiveis")
def listar_categorias_elegiveis(
    evento_id: int,
    atleta_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    target_atleta_id = atleta_id or current_user.atleta_id
    if not target_atleta_id:
        raise HTTPException(status_code=400, detail="Informe o atleta_id para consultar as categorias elegíveis.")

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == target_atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado.")

    todas_categorias = db.query(models.Categoria).order_by(models.Categoria.peso_minimo.asc()).all()
    return _calcular_categorias_elegiveis_atleta(atleta, todas_categorias)

@router.post("/{evento_id}/inscrever", response_model=schemas.InscricaoResponse)
def inscrever_atleta(evento_id: int, inscricao: schemas.InscricaoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    if current_user.tipo_usuario == 'ATLETA' and current_user.atleta_id != inscricao.atleta_id:
        raise HTTPException(status_code=403, detail="Você só pode inscrever a si mesmo.")

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == inscricao.atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == 'ENTIDADE' and atleta.entidade_id != current_user.entidade_id:
         raise HTTPException(status_code=403, detail="Você só pode inscrever atletas pertencentes à sua entidade.")

    if atleta.status_bloqueio:
        raise HTTPException(status_code=403, detail=f"Atleta bloqueado. Motivo: {atleta.motivo_bloqueio}")

    categoria_escolhida = db.query(models.Categoria).filter(models.Categoria.codcat == inscricao.categoria_id).first()
    if not categoria_escolhida:
        raise HTTPException(status_code=404, detail="Categoria selecionada não encontrada.")

    is_absoluto = (categoria_escolhida.classificacao or "").strip().upper() in ("ABSOLUTO", "LIVRE")
    if atleta.peso is not None and categoria_escolhida.peso_maximo is not None and not is_absoluto:
        if float(atleta.peso) > float(categoria_escolhida.peso_maximo):
            raise HTTPException(
                status_code=400,
                detail=f"Inscrição não permitida em categoria abaixo do seu peso ({float(atleta.peso):.1f}kg > limite de {float(categoria_escolhida.peso_maximo):.1f}kg). Escolha sua categoria natural ou uma categoria ACIMA."
            )

    inscricao_existente = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == evento_id,
        models.Inscricao.atleta_id == inscricao.atleta_id
    ).first()
    if inscricao_existente:
        raise HTTPException(status_code=400, detail="Este atleta já está inscrito neste evento")

    from datetime import date, datetime
    from services.mercadopago_service import calcular_taxas

    hoje = date.today()
    if evento.data_inicio_inscricao and hoje < evento.data_inicio_inscricao:
        raise HTTPException(status_code=400, detail="Inscrições ainda não abertas para este evento")
    if evento.data_fim_inscricao and hoje > evento.data_fim_inscricao:
        raise HTTPException(status_code=400, detail="Inscrições encerradas para este evento")

    nova_inscricao = models.Inscricao(
        evento_id=evento_id,
        atleta_id=inscricao.atleta_id,
        categoria_id=inscricao.categoria_id
    )
    db.add(nova_inscricao)
    db.flush()

    valor_bruto = float(evento.valor_inscricao or 80.00)
    taxas = calcular_taxas(db, valor_bruto, "INSCRICAO_TORNEIO")
    novo_pagamento = models.Pagamento(
        inscricao_id=nova_inscricao.codinsc,
        evento_id=evento_id,
        atleta_id=inscricao.atleta_id,
        valor_bruto=valor_bruto,
        taxa_kudow=taxas["taxa_kudow"],
        valor_liquido_entidade=taxas["valor_liquido_entidade"],
        status="PENDENTE",
        status_repasse="AGUARDANDO_REPASSE",
        forma_pagamento="PIX",
        created_at=datetime.now()
    )
    db.add(novo_pagamento)

    db.commit()
    db.refresh(nova_inscricao)
    return nova_inscricao

@router.get("/{evento_id}/minha_inscricao")
def checar_inscricao_logada(evento_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario != 'ATLETA':
        return {"inscrito": False}

    inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == evento_id,
        models.Inscricao.atleta_id == current_user.atleta_id
    ).first()

    if inscricao:
        pagamento = db.query(models.Pagamento).filter(models.Pagamento.inscricao_id == inscricao.codinsc).first()
        return {
            "inscrito": True,
            "status": inscricao.status,
            "categoria_id": inscricao.categoria_id,
            "inscricao_id": inscricao.codinsc,
            "pagamento_status": pagamento.status if pagamento else "PENDENTE"
        }
    else:
        return {"inscrito": False}

@router.get("/{evento_id}/podio-pdf")
def gerar_podio_pdf(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")

    partidas = db.query(models.Partida).filter(models.Partida.evento_id == evento_id).all()
    if not partidas:
        raise HTTPException(status_code=400, detail="Nenhuma chave gerada para este torneio.")

    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from fastapi.responses import StreamingResponse

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    largura, altura = A4

    por_cat = {}
    for p in partidas:
        por_cat.setdefault(p.categoria_id, []).append(p)

    y = altura - 50
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, f"RELATÓRIO OFICIAL DE PÓDIO — {evento.evento}")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Local: {evento.local or 'Não informado'} | Data: {evento.data_inicio or '-'}")
    y -= 25
    c.line(40, y, largura - 40, y)
    y -= 25

    for cat_id, lista_p in por_cat.items():
        cat = db.query(models.Categoria).filter(models.Categoria.codcat == cat_id).first()
        nome_cat = (cat.nome_categoria or cat.descricao) if cat else f"Categoria #{cat_id}"

        final_match = next((m for m in lista_p if m.fase == "Final"), None)
        terceiro_match = next((m for m in lista_p if m.fase == "Disputa de 3º Lugar"), None)

        ouro_nome = "-"
        prata_nome = "-"
        bronze_nome = "-"

        if final_match and final_match.vencedor_id:
            vencedor = final_match.rel_vencedor
            perdedor_id = final_match.atleta_2_id if final_match.vencedor_id == final_match.atleta_1_id else final_match.atleta_1_id
            perdedor = db.query(models.Atleta).filter(models.Atleta.codatl == perdedor_id).first() if perdedor_id else None
            ouro_nome = f"{vencedor.nome} ({vencedor.rel_entidade.nome if vencedor and vencedor.rel_entidade else 'Independente'})" if vencedor else "-"
            prata_nome = f"{perdedor.nome} ({perdedor.rel_entidade.nome if perdedor and perdedor.rel_entidade else 'Independente'})" if perdedor else "-"

        if terceiro_match and terceiro_match.vencedor_id and terceiro_match.rel_vencedor:
            v3 = terceiro_match.rel_vencedor
            bronze_nome = f"{v3.nome} ({v3.rel_entidade.nome if v3.rel_entidade else 'Independente'})"

        if y < 120:
            c.showPage()
            y = altura - 50

        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y, f"Categoria: {nome_cat}")
        y -= 18
        c.setFont("Helvetica", 10)
        c.drawString(55, y, f"1º Lugar (Ouro):   {ouro_nome}")
        y -= 15
        c.drawString(55, y, f"2º Lugar (Prata):  {prata_nome}")
        y -= 15
        c.drawString(55, y, f"3º Lugar (Bronze): {bronze_nome}")
        y -= 22

    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=podio_evento_{evento_id}.pdf"}
    )

@router.get("/{evento_id}/resumo-chaveamento")
def obter_resumo_chaveamento_mobile(evento_id: int, categoria_id: Optional[int] = None, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.codevent == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")

    query = db.query(models.Partida).filter(models.Partida.evento_id == evento_id)
    if categoria_id:
        query = query.filter(models.Partida.categoria_id == categoria_id)
    partidas = query.order_by(models.Partida.codpartida.asc()).all()

    por_categoria = {}
    for idx, p in enumerate(partidas, start=1):
        por_categoria.setdefault(p.categoria_id, []).append((idx, p))

    categorias_resumo = []
    for cat_id, lista in por_categoria.items():
        cat = db.query(models.Categoria).filter(models.Categoria.codcat == cat_id).first()
        lutas = []
        ouro = None
        prata = None
        bronze = None

        for num_luta, p in lista:
            a1_nome = p.rel_atleta_1.nome if p.rel_atleta_1 else None
            a2_nome = p.rel_atleta_2.nome if p.rel_atleta_2 else None
            venc_nome = p.rel_vencedor.nome if p.rel_vencedor else None

            if p.fase == "Final" and p.vencedor_id:
                ouro = venc_nome
                prata = a2_nome if p.vencedor_id == p.atleta_1_id else a1_nome
            elif p.fase == "Disputa de 3º Lugar" and p.vencedor_id:
                bronze = venc_nome

            lutas.append({
                "codpartida": p.codpartida,
                "numero_luta": num_luta,
                "fase": p.fase,
                "atleta_1_id": p.atleta_1_id,
                "atleta_1_nome": a1_nome,
                "atleta_2_id": p.atleta_2_id,
                "atleta_2_nome": a2_nome,
                "vencedor_id": p.vencedor_id,
                "vencedor_nome": venc_nome,
                "status_resultado": "FINALIZADA" if p.vencedor_id else "AGUARDANDO_RESULTADO",
                "observacoes_arbitro": p.observacoes_arbitro,
                "proxima_partida_id": p.proxima_partida_id
            })

        categorias_resumo.append({
            "categoria_id": cat_id,
            "nome_categoria": (cat.nome_categoria or cat.descricao) if cat else f"Categoria #{cat_id}",
            "podio": {
                "ouro": ouro,
                "prata": prata,
                "bronze": bronze
            },
            "lutas": lutas
        })

    return {
        "evento_id": evento.codevent,
        "evento_nome": evento.evento,
        "local": evento.local,
        "data_inicio": evento.data_inicio,
        "categorias": categorias_resumo
    }

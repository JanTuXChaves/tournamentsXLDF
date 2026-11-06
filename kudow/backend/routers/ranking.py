from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import models, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(
    prefix="/ranking",
    tags=["Ranking"]
)

@router.get("/", response_model=List[schemas.RankingAtletaResponse])
def listar_ranking(ano: Optional[int] = 2026, db: Session = Depends(get_db)):
    rankings = db.query(models.RankingAtleta).filter(models.RankingAtleta.ano == ano).order_by(models.RankingAtleta.pontos.desc()).all()

    result = []
    for r in rankings:
        atleta_nome = r.rel_atleta.nome if r.rel_atleta else f"Atleta {r.atleta_id}"
        result.append(schemas.RankingAtletaResponse(
            id=r.id,
            atleta_id=r.atleta_id,
            atleta_nome=atleta_nome,
            ano=r.ano,
            pontos=r.pontos,
            vitorias=r.vitorias,
            derrotas=r.derrotas,
            ouros=r.ouros,
            pratas=r.pratas,
            bronzes=r.bronzes
        ))
    return result

def recalcular_ranking_db(db: Session, ano: int = 2026) -> int:
    partidas = db.query(models.Partida).all()

    categorias_com_terceiro = set()
    for p in partidas:
        if p.fase == "Disputa de 3º Lugar":
            categorias_com_terceiro.add((p.evento_id, p.categoria_id))

    stats = {}

    for p in partidas:
        if not p.vencedor_id:
            continue

        vencedor_id = p.vencedor_id
        perdedor_id = p.atleta_2_id if p.atleta_1_id == vencedor_id else p.atleta_1_id

        if vencedor_id not in stats:
            stats[vencedor_id] = {"vitorias": 0, "derrotas": 0, "ouros": 0, "pratas": 0, "bronzes": 0, "pontos": 0}

        if perdedor_id is not None:
            stats[vencedor_id]["vitorias"] += 1
            stats[vencedor_id]["pontos"] += 3

            if perdedor_id not in stats:
                stats[perdedor_id] = {"vitorias": 0, "derrotas": 0, "ouros": 0, "pratas": 0, "bronzes": 0, "pontos": 0}
            stats[perdedor_id]["derrotas"] += 1

        if p.fase == "Final":
            stats[vencedor_id]["ouros"] += 1
            stats[vencedor_id]["pontos"] += 10
            if perdedor_id:
                stats[perdedor_id]["pratas"] += 1
                stats[perdedor_id]["pontos"] += 5
        elif p.fase == "Disputa de 3º Lugar":
            stats[vencedor_id]["bronzes"] += 1
            stats[vencedor_id]["pontos"] += 2
        elif p.fase == "Semifinal" and perdedor_id and (p.evento_id, p.categoria_id) not in categorias_com_terceiro:
            stats[perdedor_id]["bronzes"] += 1
            stats[perdedor_id]["pontos"] += 2

    atletas_processados = 0
    for atleta_id, s in stats.items():
        ranking = db.query(models.RankingAtleta).filter(
            models.RankingAtleta.atleta_id == atleta_id,
            models.RankingAtleta.ano == ano
        ).first()

        if not ranking:
            ranking = models.RankingAtleta(atleta_id=atleta_id, ano=ano)
            db.add(ranking)

        ranking.pontos = s["pontos"]
        ranking.vitorias = s["vitorias"]
        ranking.derrotas = s["derrotas"]
        ranking.ouros = s["ouros"]
        ranking.pratas = s["pratas"]
        ranking.bronzes = s["bronzes"]
        atletas_processados += 1

    db.commit()
    return atletas_processados

@router.post("/recalcular")
def recalcular_ranking(ano: Optional[int] = 2026, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.tipo_usuario not in ['MASTER', 'ENTIDADE']:
        raise HTTPException(status_code=403, detail="Apenas administradores podem recalcular o ranking.")

    atletas_processados = recalcular_ranking_db(db, ano or 2026)
    return {"mensagem": f"Ranking do ano {ano} recalculado com sucesso.", "atletas_processados": atletas_processados}

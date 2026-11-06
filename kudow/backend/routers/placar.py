import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional

import models, schemas
from database import get_db, SessionLocal
from dependencies import get_current_user
from security import decode_token

router = APIRouter(
    prefix="/placar",
    tags=["Placar & WebSockets"]
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, partida_id: int, websocket: WebSocket):
        await websocket.accept()
        if partida_id not in self.active_connections:
            self.active_connections[partida_id] = []
        self.active_connections[partida_id].append(websocket)

    def disconnect(self, partida_id: int, websocket: WebSocket):
        if partida_id in self.active_connections:
            if websocket in self.active_connections[partida_id]:
                self.active_connections[partida_id].remove(websocket)
            if not self.active_connections[partida_id]:
                del self.active_connections[partida_id]

    async def broadcast(self, partida_id: int, message: dict):
        if partida_id in self.active_connections:
            for connection in list(self.active_connections[partida_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(partida_id, connection)

manager = ConnectionManager()

estado_partidas: Dict[int, dict] = {}

@router.get("/partidas/{partida_id}/estado")
async def obter_estado_placar(partida_id: int):
    if partida_id in estado_partidas:
        return estado_partidas[partida_id]
    return {
        "partida_id": partida_id,
        "pontos_atleta_1": 0,
        "pontos_atleta_2": 0,
        "punicoes_atleta_1": 0,
        "punicoes_atleta_2": 0,
        "tempo_restante_segundos": 180,
        "status_partida": "PRONTO"
    }

@router.websocket("/ws/partidas/{partida_id}")
async def websocket_placar(websocket: WebSocket, partida_id: int):
    await manager.connect(partida_id, websocket)

    token = websocket.query_params.get("token")
    can_control = False
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            tipo_usr = payload.get("tipo_usuario")
            if tipo_usr in ["MASTER", "ARBITRO"]:
                can_control = True
            elif tipo_usr == "ENTIDADE":
                ent_id = payload.get("entidade_id")
                db_ws = SessionLocal()
                try:
                    partida_ws = db_ws.query(models.Partida).filter(models.Partida.codpartida == partida_id).first()
                    if partida_ws and partida_ws.rel_evento and partida_ws.rel_evento.entidade_responsavel_id == ent_id:
                        can_control = True
                finally:
                    db_ws.close()

    if partida_id in estado_partidas:
        await websocket.send_json(estado_partidas[partida_id])
    else:
        estado_inicial = {
            "partida_id": partida_id,
            "pontos_atleta_1": 0,
            "pontos_atleta_2": 0,
            "punicoes_atleta_1": 0,
            "punicoes_atleta_2": 0,
            "tempo_restante_segundos": 180,
            "status_partida": "PRONTO"
        }
        estado_partidas[partida_id] = estado_inicial
        await websocket.send_json(estado_inicial)

    try:
        while True:
            data = await websocket.receive_text()
            if not can_control:
                continue
            try:
                msg = json.loads(data)
                if isinstance(msg, dict):
                    if partida_id not in estado_partidas:
                        estado_partidas[partida_id] = {}
                    estado_partidas[partida_id].update(msg)
                    estado_partidas[partida_id]["partida_id"] = partida_id
                    await manager.broadcast(partida_id, estado_partidas[partida_id])
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(partida_id, websocket)

@router.put("/partidas/{partida_id}/placar")
async def atualizar_placar(
    partida_id: int,
    placar: schemas.PlacarUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario not in ["MASTER", "ENTIDADE", "ARBITRO"]:
        raise HTTPException(status_code=403, detail="Apenas árbitros e organizadores podem operar a mesa de controle.")
    partida = db.query(models.Partida).filter(models.Partida.codpartida == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada")
    if current_user.tipo_usuario == "ENTIDADE":
        evento = partida.rel_evento or db.query(models.Evento).filter(models.Evento.codevent == partida.evento_id).first()
        if not evento or evento.entidade_responsavel_id != current_user.entidade_id:
            raise HTTPException(status_code=403, detail="Sua entidade não é a organizadora responsável por este torneio.")

    if placar.observacoes_arbitro is not None:
        partida.observacoes_arbitro = placar.observacoes_arbitro
    if placar.historico_pontos is not None:
        partida.historico_pontos = placar.historico_pontos
    partida.pontos_atleta_1 = placar.pontos_atleta_1
    partida.pontos_atleta_2 = placar.pontos_atleta_2
    partida.punicoes_atleta_1 = placar.punicoes_atleta_1
    partida.punicoes_atleta_2 = placar.punicoes_atleta_2
    db.commit()

    novo_estado = {
        "partida_id": partida_id,
        "pontos_atleta_1": placar.pontos_atleta_1,
        "pontos_atleta_2": placar.pontos_atleta_2,
        "punicoes_atleta_1": placar.punicoes_atleta_1,
        "punicoes_atleta_2": placar.punicoes_atleta_2,
        "tempo_restante_segundos": placar.tempo_restante_segundos,
        "status_partida": placar.status_partida,
        "observacoes_arbitro": partida.observacoes_arbitro,
        "historico_pontos": partida.historico_pontos
    }

    estado_partidas[partida_id] = novo_estado

    await manager.broadcast(partida_id, novo_estado)

    return {"mensagem": "Placar atualizado e transmitido via WebSocket.", "estado": novo_estado}

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel
import os
import hmac
import hashlib
import calendar

from database import get_db
import models
from dependencies import get_current_user
from services.mercadopago_service import (
    calcular_taxas,
    criar_pagamento_pix,
    criar_pagamento_cartao,
    criar_pagamento_boleto,
    consultar_pagamento_mp
)

router = APIRouter(prefix="/financeiro", tags=["Financeiro & Repasses"])

class PagarRequest(BaseModel):
    metodo: str = "PIX"
    card_token: Optional[str] = None
    installments: Optional[int] = 1
    payment_method_id: Optional[str] = "visa"
    card_holder_cpf: Optional[str] = None
    card_holder_name: Optional[str] = None
    payer_cpf: Optional[str] = None

class DadosBancariosRequest(BaseModel):
    chave_pix_repasse: str
    tipo_chave_pix_repasse: str
    titular_conta_repasse: str
    valor_mensalidade_padrao: Optional[float] = 120.00
    dia_vencimento_mensalidade: Optional[int] = 10

class GerarMensalidadesLoteRequest(BaseModel):
    mes_referencia: str
    valor: Optional[float] = None
    dia_vencimento: Optional[int] = None

class ExecutarRepasseRequest(BaseModel):
    entidade_id: int
    valor_total: float
    chave_pix_utilizada: str
    comprovante_pix_url: Optional[str] = None
    observacoes: Optional[str] = None

@router.post("/mensalidades/{mensalidade_id}/pagar")
def pagar_mensalidade(
    mensalidade_id: int,
    dados: PagarRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    mensalidade = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.id == mensalidade_id).first()
    if not mensalidade:
        raise HTTPException(status_code=404, detail="Mensalidade não encontrada")

    if mensalidade.status_pagamento == "PAGO":
        return {"mensagem": "Esta mensalidade já está quitada!", "status": "PAGO"}

    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == mensalidade.atleta_id).first()
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == mensalidade.entidade_id).first()
    usuario_atleta = db.query(models.Usuario).filter(models.Usuario.atleta_id == atleta.codatl).first() if atleta else None

    payer_email = usuario_atleta.email if usuario_atleta else "atleta@kudow.com.br"
    payer_nome = atleta.nome if atleta else "Atleta Kudow"
    payer_cpf = dados.payer_cpf or (atleta.cpf if atleta else "00000000000")
    valor_float = float(mensalidade.valor_bruto)
    descricao = f"Mensalidade {mensalidade.mes_referencia} - {entidade.nome if entidade else 'Kudow'}"

    taxas = calcular_taxas(db, valor_float, "MENSALIDADE")
    mensalidade.taxa_kudow = taxas["taxa_kudow"]
    mensalidade.valor_liquido_entidade = taxas["valor_liquido_entidade"]

    metodo = dados.metodo.upper()
    metadata = {"tipo": "MENSALIDADE", "id": mensalidade.id, "entidade_id": mensalidade.entidade_id, "atleta_id": mensalidade.atleta_id}

    if metodo == "PIX":
        res_mp = criar_pagamento_pix(
            valor=valor_float,
            descricao=descricao,
            payer_email=payer_email,
            payer_nome=payer_nome,
            payer_cpf=payer_cpf,
            metadata=metadata
        )
        if not res_mp.get("success"):
            raise HTTPException(status_code=400, detail="Erro ao gerar cobrança PIX no Mercado Pago.")

        mensalidade.forma_pagamento = "PIX"
        mensalidade.mp_payment_id = res_mp.get("payment_id")
        mensalidade.qr_code_pix = res_mp.get("qr_code_pix")
        mensalidade.qr_code_base64 = res_mp.get("qr_code_base64")
        mensalidade.mp_status_detail = res_mp.get("status_detail")
        db.commit()

        return {
            "forma_pagamento": "PIX",
            "status": "PENDENTE",
            "valor_bruto": valor_float,
            "qr_code_pix": res_mp.get("qr_code_pix"),
            "qr_code_base64": res_mp.get("qr_code_base64"),
            "payment_id": res_mp.get("payment_id")
        }

    elif metodo == "CARTAO_CREDITO":
        if not dados.card_token:
            raise HTTPException(status_code=400, detail="Token do cartão de crédito é obrigatório.")

        res_mp = criar_pagamento_cartao(
            valor=valor_float,
            token=dados.card_token,
            installments=dados.installments or 1,
            payment_method_id=dados.payment_method_id or "visa",
            payer_email=payer_email,
            payer_nome=dados.card_holder_name or payer_nome,
            payer_cpf=dados.card_holder_cpf or payer_cpf,
            metadata=metadata
        )
        if not res_mp.get("success"):
            raise HTTPException(status_code=400, detail=res_mp.get("message") or "Erro ao processar cartão.")

        mensalidade.forma_pagamento = "CARTAO_CREDITO"
        mensalidade.mp_payment_id = res_mp.get("payment_id")
        mensalidade.cartao_bandeira = res_mp.get("card_brand")
        mensalidade.numero_parcelas = res_mp.get("installments")
        mensalidade.valor_parcela = res_mp.get("installment_amount")
        mensalidade.mp_status_detail = res_mp.get("status_detail")

        if res_mp.get("status") == "approved":
            mensalidade.status_pagamento = "PAGO"
            mensalidade.data_pagamento = datetime.now()

        db.commit()

        return {
            "forma_pagamento": "CARTAO_CREDITO",
            "status": mensalidade.status_pagamento,
            "status_detail": res_mp.get("status_detail"),
            "payment_id": res_mp.get("payment_id"),
            "parcelas": mensalidade.numero_parcelas,
            "valor_parcela": float(mensalidade.valor_parcela) if mensalidade.valor_parcela else valor_float
        }

    elif metodo == "BOLETO":
        res_mp = criar_pagamento_boleto(
            valor=valor_float,
            descricao=descricao,
            payer_email=payer_email,
            payer_nome=payer_nome,
            payer_cpf=payer_cpf,
            metadata=metadata
        )
        mensalidade.forma_pagamento = "BOLETO"
        mensalidade.mp_payment_id = res_mp.get("payment_id")
        mensalidade.boleto_linha_digitavel = res_mp.get("boleto_linha_digitavel")
        mensalidade.boleto_codigo_barras = res_mp.get("boleto_codigo_barras")
        mensalidade.boleto_pdf_url = res_mp.get("boleto_pdf_url")
        db.commit()

        return {
            "forma_pagamento": "BOLETO",
            "status": "PENDENTE",
            "boleto_linha_digitavel": res_mp.get("boleto_linha_digitavel"),
            "boleto_codigo_barras": res_mp.get("boleto_codigo_barras"),
            "boleto_pdf_url": res_mp.get("boleto_pdf_url")
        }

    else:
        raise HTTPException(status_code=400, detail="Método de pagamento inválido. Use PIX, CARTAO_CREDITO ou BOLETO.")

@router.post("/inscricoes/{inscricao_id}/pagar")
def pagar_inscricao_torneio(
    inscricao_id: int,
    dados: PagarRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    inscricao = db.query(models.Inscricao).filter(models.Inscricao.codinsc == inscricao_id).first()
    if not inscricao:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    evento = db.query(models.Evento).filter(models.Evento.codevent == inscricao.evento_id).first()
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == inscricao.atleta_id).first()
    usuario_atleta = db.query(models.Usuario).filter(models.Usuario.atleta_id == atleta.codatl).first() if atleta else None

    valor_bruto = float(evento.valor_inscricao or 80.00) if evento else 80.00
    taxas = calcular_taxas(db, valor_bruto, "INSCRICAO_TORNEIO")

    pagamento = db.query(models.Pagamento).filter(models.Pagamento.inscricao_id == inscricao_id).first()
    if not pagamento:
        pagamento = models.Pagamento(
            inscricao_id=inscricao_id,
            evento_id=inscricao.evento_id,
            atleta_id=inscricao.atleta_id,
            valor_bruto=valor_bruto,
            taxa_kudow=taxas["taxa_kudow"],
            valor_liquido_entidade=taxas["valor_liquido_entidade"],
            status="PENDENTE",
            status_repasse="AGUARDANDO_REPASSE",
            forma_pagamento=dados.metodo.upper(),
            created_at=datetime.now()
        )
        db.add(pagamento)
        db.flush()
    else:
        pagamento.valor_bruto = valor_bruto
        pagamento.taxa_kudow = taxas["taxa_kudow"]
        pagamento.valor_liquido_entidade = taxas["valor_liquido_entidade"]

    if pagamento.status == "PAGO":
        return {"mensagem": "Taxa de inscrição já está quitada!", "status": "PAGO"}

    payer_email = usuario_atleta.email if usuario_atleta else "atleta@kudow.com.br"
    payer_nome = atleta.nome if atleta else "Atleta Kudow"
    payer_cpf = dados.payer_cpf or (atleta.cpf if atleta else "00000000000")
    descricao = f"Inscrição Torneio: {evento.evento if evento else 'Kudow Championship'} - {atleta.nome if atleta else ''}"

    metodo = dados.metodo.upper()
    metadata = {"tipo": "INSCRICAO_TORNEIO", "id": pagamento.id, "inscricao_id": inscricao_id, "evento_id": inscricao.evento_id}

    if metodo == "PIX":
        res_mp = criar_pagamento_pix(
            valor=valor_bruto,
            descricao=descricao,
            payer_email=payer_email,
            payer_nome=payer_nome,
            payer_cpf=payer_cpf,
            metadata=metadata
        )
        pagamento.forma_pagamento = "PIX"
        pagamento.mp_payment_id = res_mp.get("payment_id")
        pagamento.qr_code_pix = res_mp.get("qr_code_pix")
        pagamento.qr_code_base64 = res_mp.get("qr_code_base64")
        pagamento.mp_status_detail = res_mp.get("status_detail")
        db.commit()

        return {
            "forma_pagamento": "PIX",
            "status": "PENDENTE",
            "valor_bruto": valor_bruto,
            "qr_code_pix": res_mp.get("qr_code_pix"),
            "qr_code_base64": res_mp.get("qr_code_base64"),
            "payment_id": res_mp.get("payment_id")
        }

    elif metodo == "CARTAO_CREDITO":
        if not dados.card_token:
            raise HTTPException(status_code=400, detail="Token do cartão de crédito é obrigatório.")

        res_mp = criar_pagamento_cartao(
            valor=valor_bruto,
            token=dados.card_token,
            installments=dados.installments or 1,
            payment_method_id=dados.payment_method_id or "visa",
            payer_email=payer_email,
            payer_nome=dados.card_holder_name or payer_nome,
            payer_cpf=dados.card_holder_cpf or payer_cpf,
            metadata=metadata
        )
        if not res_mp.get("success"):
            raise HTTPException(status_code=400, detail=res_mp.get("message") or "Erro ao processar cartão.")

        pagamento.forma_pagamento = "CARTAO_CREDITO"
        pagamento.mp_payment_id = res_mp.get("payment_id")
        pagamento.cartao_bandeira = res_mp.get("card_brand")
        pagamento.numero_parcelas = res_mp.get("installments")
        pagamento.valor_parcela = res_mp.get("installment_amount")
        pagamento.mp_status_detail = res_mp.get("status_detail")

        if res_mp.get("status") == "approved":
            pagamento.status = "PAGO"
            pagamento.pago_em = datetime.now()
            inscricao.status = "CONFIRMADA"

        db.commit()

        return {
            "forma_pagamento": "CARTAO_CREDITO",
            "status": pagamento.status,
            "status_detail": res_mp.get("status_detail"),
            "payment_id": res_mp.get("payment_id")
        }

    elif metodo == "BOLETO":
        res_mp = criar_pagamento_boleto(
            valor=valor_bruto,
            descricao=descricao,
            payer_email=payer_email,
            payer_nome=payer_nome,
            payer_cpf=payer_cpf,
            metadata=metadata
        )
        pagamento.forma_pagamento = "BOLETO"
        pagamento.mp_payment_id = res_mp.get("payment_id")
        pagamento.boleto_linha_digitavel = res_mp.get("boleto_linha_digitavel")
        pagamento.boleto_codigo_barras = res_mp.get("boleto_codigo_barras")
        pagamento.boleto_pdf_url = res_mp.get("boleto_pdf_url")
        db.commit()

        return {
            "forma_pagamento": "BOLETO",
            "status": "PENDENTE",
            "boleto_linha_digitavel": res_mp.get("boleto_linha_digitavel"),
            "boleto_codigo_barras": res_mp.get("boleto_codigo_barras"),
            "boleto_pdf_url": res_mp.get("boleto_pdf_url")
        }

@router.get("/status/{tipo}/{item_id}")
def verificar_status_pagamento(tipo: str, item_id: int, db: Session = Depends(get_db)):
    if tipo.lower() == "mensalidade":
        m = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.id == item_id).first()
        if not m:
            raise HTTPException(status_code=404, detail="Mensalidade não encontrada")
        return {
            "status": m.status_pagamento,
            "pago": m.status_pagamento == "PAGO",
            "data_pagamento": m.data_pagamento,
            "forma_pagamento": m.forma_pagamento
        }
    else:
        p = db.query(models.Pagamento).filter(models.Pagamento.inscricao_id == item_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Pagamento da inscrição não encontrado")
        return {
            "status": p.status,
            "pago": p.status == "PAGO",
            "data_pagamento": p.pago_em,
            "forma_pagamento": p.forma_pagamento
        }

@router.post("/simular-pagamento-teste/{tipo}/{item_id}")
def simular_pagamento_teste(
    tipo: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if os.getenv("ENVIRONMENT", "development").lower() == "production" and current_user.tipo_usuario != "MASTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulação de pagamentos de teste está desativada em ambiente de produção."
        )

    if tipo.lower() == "mensalidade":
        m = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.id == item_id).first()
        if not m:
            raise HTTPException(status_code=404, detail="Mensalidade não encontrada")
        if current_user.tipo_usuario == "ATLETA" and current_user.atleta_id != m.atleta_id:
            raise HTTPException(status_code=403, detail="Você só pode simular pagamento de suas próprias faturas.")
        if current_user.tipo_usuario == "ENTIDADE" and current_user.entidade_id != m.entidade_id:
            raise HTTPException(status_code=403, detail="Acesso negado a esta mensalidade.")
        m.status_pagamento = "PAGO"
        m.data_pagamento = datetime.now()
        m.mp_status_detail = "accredited"
        db.commit()
        return {"mensagem": "Pagamento da mensalidade simulado com sucesso!", "status": "PAGO"}
    else:
        p = db.query(models.Pagamento).filter(models.Pagamento.inscricao_id == item_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Inscrição não encontrada")
        if current_user.tipo_usuario == "ATLETA" and current_user.atleta_id != p.atleta_id:
            raise HTTPException(status_code=403, detail="Você só pode simular pagamento de suas próprias inscrições.")
        p.status = "PAGO"
        p.pago_em = datetime.now()
        p.mp_status_detail = "accredited"
        insc = db.query(models.Inscricao).filter(models.Inscricao.codinsc == item_id).first()
        if insc:
            insc.status = "CONFIRMADA"
        db.commit()
        return {"mensagem": "Pagamento da taxa do torneio simulado com sucesso!", "status": "PAGO"}

@router.post("/webhooks/mercadopago")
async def webhook_mercadopago(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except:
        body = {}

    topic = request.query_params.get("topic") or body.get("type")
    resource_id = request.query_params.get("id") or (body.get("data", {}).get("id"))

    mp_webhook_secret = os.getenv("MP_WEBHOOK_SECRET")
    if mp_webhook_secret:
        x_signature = request.headers.get("x-signature", "")
        x_request_id = request.headers.get("x-request-id", "")
        parts = dict(part.split("=", 1) for part in x_signature.split(",") if "=" in part)
        ts = parts.get("ts", "")
        v1 = parts.get("v1", "")
        manifest = f"id:{resource_id};request-id:{x_request_id};ts:{ts};"
        expected_sig = hmac.new(mp_webhook_secret.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()
        if not v1 or not hmac.compare_digest(expected_sig, v1):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Assinatura de webhook Mercado Pago inválida.")

    if topic in ["payment", "payment.updated"] and resource_id:
        payment_info = consultar_pagamento_mp(str(resource_id))
        if payment_info and payment_info.get("status") == "approved":
            metadata = payment_info.get("metadata", {})
            tipo = metadata.get("tipo")
            ref_id = metadata.get("id")

            if tipo == "MENSALIDADE" and ref_id:
                m = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.id == ref_id).first()
                if m and m.status_pagamento != "PAGO":
                    m.status_pagamento = "PAGO"
                    m.data_pagamento = datetime.now()
                    m.mp_status_detail = "accredited"
                    db.commit()

            elif tipo == "INSCRICAO_TORNEIO" and ref_id:
                p = db.query(models.Pagamento).filter(models.Pagamento.id == ref_id).first()
                if p and p.status != "PAGO":
                    p.status = "PAGO"
                    p.pago_em = datetime.now()
                    p.mp_status_detail = "accredited"
                    insc = db.query(models.Inscricao).filter(models.Inscricao.codinsc == p.inscricao_id).first()
                    if insc:
                        insc.status = "CONFIRMADA"
                    db.commit()

    return {"status": "ok"}

@router.get("/entidades/{entidade_id}/resumo")
def obter_resumo_financeiro_entidade(
    entidade_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER" and current_user.entidade_id != entidade_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar os dados financeiros desta entidade.")
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    mensalidades = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.entidade_id == entidade_id).all()

    eventos_ids = [e.codevent for e in db.query(models.Evento).filter(models.Evento.entidade_responsavel_id == entidade_id).all()]
    pagamentos_torneio = db.query(models.Pagamento).filter(models.Pagamento.evento_id.in_(eventos_ids)).all() if eventos_ids else []

    total_bruto = sum(float(m.valor_bruto) for m in mensalidades if m.status_pagamento == "PAGO") + \
                  sum(float(p.valor_bruto) for p in pagamentos_torneio if p.status == "PAGO")

    total_taxa_kudow = sum(float(m.taxa_kudow) for m in mensalidades if m.status_pagamento == "PAGO") + \
                       sum(float(p.taxa_kudow) for p in pagamentos_torneio if p.status == "PAGO")

    saldo_liquido_disponivel = sum(float(m.valor_liquido_entidade) for m in mensalidades if m.status_pagamento == "PAGO" and m.status_repasse == "AGUARDANDO_REPASSE") + \
                               sum(float(p.valor_liquido_entidade) for p in pagamentos_torneio if p.status == "PAGO" and p.status_repasse == "AGUARDANDO_REPASSE")

    saldo_ja_repassado = sum(float(m.valor_liquido_entidade) for m in mensalidades if m.status_repasse == "REPASSADO") + \
                         sum(float(p.valor_liquido_entidade) for p in pagamentos_torneio if p.status_repasse == "REPASSADO")

    mensalidades_pendentes = sum(1 for m in mensalidades if m.status_pagamento == "PENDENTE")
    mensalidades_pagas = sum(1 for m in mensalidades if m.status_pagamento == "PAGO")

    total_atletas = db.query(models.Atleta).filter(models.Atleta.entidade_id == entidade_id).count()

    return {
        "entidade_id": entidade.codenti,
        "entidade_nome": entidade.nome,
        "nome_entidade": entidade.nome,
        "chave_pix_repasse": entidade.chave_pix_repasse,
        "tipo_chave_pix_repasse": entidade.tipo_chave_pix_repasse,
        "titular_conta_repasse": entidade.titular_conta_repasse,
        "valor_mensalidade_padrao": float(entidade.valor_mensalidade_padrao or 120.00),
        "dia_vencimento_mensalidade": entidade.dia_vencimento_mensalidade or 10,
        "saldo_liquido_disponivel": round(saldo_liquido_disponivel, 2),
        "saldo_aguardando_repasse": round(saldo_liquido_disponivel, 2),
        "saldo_ja_repassado": round(saldo_ja_repassado, 2),
        "total_ja_repassado": round(saldo_ja_repassado, 2),
        "total_arrecadado_liquido": round(saldo_liquido_disponivel + saldo_ja_repassado, 2),
        "faturamento_bruto_total": round(total_bruto, 2),
        "taxa_kudow_retida_total": round(total_taxa_kudow, 2),
        "total_atletas": total_atletas,
        "mensalidades_pagas": mensalidades_pagas,
        "mensalidades_pendentes": mensalidades_pendentes
    }

@router.get("/entidades/{entidade_id}/extrato")
def obter_extrato_entidade(
    entidade_id: int,
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER" and current_user.entidade_id != entidade_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar o extrato desta entidade.")
    query_m = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.entidade_id == entidade_id)
    if mes:
        query_m = query_m.filter(models.MensalidadeAtleta.mes_referencia == mes)
    mensalidades = query_m.order_by(models.MensalidadeAtleta.id.desc()).all()

    extrato = []
    for m in mensalidades:
        atleta = db.query(models.Atleta).filter(models.Atleta.codatl == m.atleta_id).first()
        extrato.append({
            "id": m.id,
            "tipo": "MENSALIDADE",
            "referencia": f"Mensalidade {m.mes_referencia}",
            "atleta_id": m.atleta_id,
            "atleta_nome": atleta.nome if atleta else "Atleta Desconhecido",
            "valor_bruto": float(m.valor_bruto),
            "taxa_kudow": float(m.taxa_kudow),
            "valor_liquido_entidade": float(m.valor_liquido_entidade),
            "forma_pagamento": m.forma_pagamento,
            "status_pagamento": m.status_pagamento,
            "status_repasse": m.status_repasse,
            "data_vencimento": m.data_vencimento,
            "data_pagamento": m.data_pagamento,
            "created_at": m.created_at
        })

    eventos = db.query(models.Evento).filter(models.Evento.entidade_responsavel_id == entidade_id).all()
    for ev in eventos:
        pagamentos = db.query(models.Pagamento).filter(models.Pagamento.evento_id == ev.codevent).all()
        for p in pagamentos:
            atleta = db.query(models.Atleta).filter(models.Atleta.codatl == p.atleta_id).first()
            extrato.append({
                "id": p.id,
                "tipo": "INSCRICAO_TORNEIO",
                "referencia": f"Inscrição {ev.evento}",
                "atleta_id": p.atleta_id,
                "atleta_nome": atleta.nome if atleta else "Atleta",
                "valor_bruto": float(p.valor_bruto),
                "taxa_kudow": float(p.taxa_kudow),
                "valor_liquido_entidade": float(p.valor_liquido_entidade),
                "forma_pagamento": p.forma_pagamento,
                "status_pagamento": p.status,
                "status_repasse": p.status_repasse,
                "data_vencimento": ev.data_fim_inscricao or ev.data_inicio,
                "data_pagamento": p.pago_em,
                "created_at": p.created_at
            })

    extrato.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return extrato

@router.put("/entidades/{entidade_id}/dados-bancarios")
def atualizar_dados_bancarios_entidade(
    entidade_id: int,
    dados: DadosBancariosRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER" and current_user.entidade_id != entidade_id:
        raise HTTPException(status_code=403, detail="Apenas o gestor da entidade ou Master pode alterar dados bancários.")
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    entidade.chave_pix_repasse = dados.chave_pix_repasse
    entidade.tipo_chave_pix_repasse = dados.tipo_chave_pix_repasse
    entidade.titular_conta_repasse = dados.titular_conta_repasse
    if dados.valor_mensalidade_padrao is not None:
        entidade.valor_mensalidade_padrao = dados.valor_mensalidade_padrao
    if dados.dia_vencimento_mensalidade is not None:
        entidade.dia_vencimento_mensalidade = dados.dia_vencimento_mensalidade

    db.commit()
    db.refresh(entidade)
    return {"mensagem": "Dados bancários e configurações de cobrança atualizados com sucesso!"}

@router.post("/entidades/{entidade_id}/gerar-mensalidades-lote")
def gerar_mensalidades_lote(
    entidade_id: int,
    dados: GerarMensalidadesLoteRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER" and current_user.entidade_id != entidade_id:
        raise HTTPException(status_code=403, detail="Apenas o gestor da entidade ou Master pode emitir mensalidades.")
    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    atletas = db.query(models.Atleta).filter(
        models.Atleta.entidade_id == entidade_id,
        models.Atleta.status_bloqueio == False
    ).all()

    if not atletas:
        raise HTTPException(status_code=400, detail="Nenhum atleta ativo encontrado nesta entidade.")

    valor_cobrado = float(dados.valor or entidade.valor_mensalidade_padrao or 120.00)
    dia_venc = int(dados.dia_vencimento or entidade.dia_vencimento_mensalidade or 10)

    ano, mes = map(int, dados.mes_referencia.split("-"))
    ultimo_dia_mes = calendar.monthrange(ano, mes)[1]
    dia_venc_ajustado = min(dia_venc, ultimo_dia_mes)
    data_vencimento = date(ano, mes, dia_venc_ajustado)

    taxas = calcular_taxas(db, valor_cobrado, "MENSALIDADE")

    geradas = 0
    ignoradas = 0

    for atl in atletas:
        existente = db.query(models.MensalidadeAtleta).filter(
            models.MensalidadeAtleta.entidade_id == entidade_id,
            models.MensalidadeAtleta.atleta_id == atl.codatl,
            models.MensalidadeAtleta.mes_referencia == dados.mes_referencia
        ).first()

        if existente:
            ignoradas += 1
            continue

        nova_mensalidade = models.MensalidadeAtleta(
            entidade_id=entidade_id,
            atleta_id=atl.codatl,
            mes_referencia=dados.mes_referencia,
            valor_bruto=valor_cobrado,
            taxa_kudow=taxas["taxa_kudow"],
            valor_liquido_entidade=taxas["valor_liquido_entidade"],
            status_pagamento="PENDENTE",
            status_repasse="AGUARDANDO_REPASSE",
            forma_pagamento="PIX",
            data_vencimento=data_vencimento,
            created_at=datetime.now()
        )
        db.add(nova_mensalidade)
        geradas += 1

    db.commit()
    return {
        "mensagem": f"Processo concluído: {geradas} cobranças emitidas com sucesso ({ignoradas} já existiam).",
        "geradas": geradas,
        "ignoradas": ignoradas,
        "mes_referencia": dados.mes_referencia,
        "valor_unitario": valor_cobrado,
        "taxa_kudow_unitaria": taxas["taxa_kudow"],
        "valor_liquido_unitario": taxas["valor_liquido_entidade"]
    }

@router.post("/mensalidades/{mensalidade_id}/dar-baixa-manual")
def dar_baixa_manual_mensalidade(
    mensalidade_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    mensalidade = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.id == mensalidade_id).first()
    if not mensalidade:
        raise HTTPException(status_code=404, detail="Mensalidade não encontrada")
    if current_user.tipo_usuario != "MASTER" and current_user.entidade_id != mensalidade.entidade_id:
        raise HTTPException(status_code=403, detail="Apenas a própria entidade ou Master pode dar baixa manual.")

    mensalidade.status_pagamento = "PAGO"
    mensalidade.forma_pagamento = "DINHEIRO / MANUAL"
    mensalidade.data_pagamento = datetime.now()
    mensalidade.status_repasse = "REPASSADO"
    db.commit()

    return {"mensagem": "Baixa manual realizada com sucesso!", "status": "PAGO"}

@router.get("/atletas/{atleta_id}/faturas")
def obter_faturas_atleta(
    atleta_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    atleta = db.query(models.Atleta).filter(models.Atleta.codatl == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    if current_user.tipo_usuario == "ATLETA" and current_user.atleta_id != atleta_id:
        raise HTTPException(status_code=403, detail="Você só pode visualizar suas próprias faturas financeiras.")
    if current_user.tipo_usuario == "ENTIDADE" and atleta.entidade_id != current_user.entidade_id:
        raise HTTPException(status_code=403, detail="Sua entidade só pode visualizar faturas de atletas filiados à sua academia.")

    mensalidades = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.atleta_id == atleta_id).order_by(models.MensalidadeAtleta.id.desc()).all()

    pagamentos_torneio = db.query(models.Pagamento).filter(models.Pagamento.atleta_id == atleta_id).order_by(models.Pagamento.id.desc()).all()

    lista = []
    for m in mensalidades:
        entidade = db.query(models.Entidade).filter(models.Entidade.codenti == m.entidade_id).first()
        lista.append({
            "id": m.id,
            "tipo": "MENSALIDADE",
            "titulo": f"Mensalidade {m.mes_referencia}",
            "entidade_nome": entidade.nome if entidade else "Academia",
            "valor": float(m.valor_bruto),
            "status": m.status_pagamento,
            "forma_pagamento": m.forma_pagamento,
            "data_vencimento": m.data_vencimento,
            "data_pagamento": m.data_pagamento,
            "qr_code_pix": m.qr_code_pix,
            "qr_code_base64": m.qr_code_base64,
            "boleto_linha_digitavel": m.boleto_linha_digitavel,
            "boleto_pdf_url": m.boleto_pdf_url
        })

    for p in pagamentos_torneio:
        evento = db.query(models.Evento).filter(models.Evento.codevent == p.evento_id).first()
        lista.append({
            "id": p.id,
            "tipo": "INSCRICAO_TORNEIO",
            "inscricao_id": p.inscricao_id,
            "titulo": f"Taxa de Inscrição: {evento.evento if evento else 'Torneio Kudow'}",
            "entidade_nome": "Organização do Torneio",
            "valor": float(p.valor_bruto),
            "status": p.status,
            "forma_pagamento": p.forma_pagamento,
            "data_vencimento": evento.data_fim_inscricao if evento else None,
            "data_pagamento": p.pago_em,
            "qr_code_pix": p.qr_code_pix,
            "qr_code_base64": p.qr_code_base64,
            "boleto_linha_digitavel": p.boleto_linha_digitavel,
            "boleto_pdf_url": p.boleto_pdf_url
        })

    return lista

@router.get("/admin/repasses-pendentes")
def listar_repasses_pendentes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(status_code=403, detail="Acesso restrito à administração Master da Kudow.")

    entidades = db.query(models.Entidade).all()
    resultado = []

    for ent in entidades:
        mensalidades = db.query(models.MensalidadeAtleta).filter(
            models.MensalidadeAtleta.entidade_id == ent.codenti,
            models.MensalidadeAtleta.status_pagamento == "PAGO",
            models.MensalidadeAtleta.status_repasse == "AGUARDANDO_REPASSE"
        ).all()

        eventos_ids = [e.codevent for e in db.query(models.Evento).filter(models.Evento.entidade_responsavel_id == ent.codenti).all()]
        pagamentos_torneio = db.query(models.Pagamento).filter(
            models.Pagamento.evento_id.in_(eventos_ids),
            models.Pagamento.status == "PAGO",
            models.Pagamento.status_repasse == "AGUARDANDO_REPASSE"
        ).all() if eventos_ids else []

        saldo_pendente = sum(float(m.valor_liquido_entidade) for m in mensalidades) + \
                         sum(float(p.valor_liquido_entidade) for p in pagamentos_torneio)

        if saldo_pendente > 0:
            resultado.append({
                "entidade_id": ent.codenti,
                "entidade_nome": ent.nome,
                "chave_pix_repasse": ent.chave_pix_repasse or "Não cadastrada",
                "tipo_chave_pix_repasse": ent.tipo_chave_pix_repasse or "CPF",
                "titular_conta_repasse": ent.titular_conta_repasse or ent.respon or ent.nome,
                "total_itens": len(mensalidades) + len(pagamentos_torneio),
                "saldo_liquido_a_repassar": round(saldo_pendente, 2)
            })

    return resultado

@router.post("/admin/executar-repasse")
def executar_repasse_entidade(
    dados: ExecutarRepasseRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(status_code=403, detail="Acesso restrito à administração Master da Kudow.")

    entidade = db.query(models.Entidade).filter(models.Entidade.codenti == dados.entidade_id).first()
    if not entidade:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    novo_repasse = models.RepasseEntidade(
        entidade_id=dados.entidade_id,
        valor_total=dados.valor_total,
        data_repasse=datetime.now(),
        chave_pix_utilizada=dados.chave_pix_utilizada,
        comprovante_pix_url=dados.comprovante_pix_url,
        observacoes=dados.observacoes,
        executado_por_usuario_id=current_user.id
    )
    db.add(novo_repasse)
    db.flush()

    mensalidades = db.query(models.MensalidadeAtleta).filter(
        models.MensalidadeAtleta.entidade_id == dados.entidade_id,
        models.MensalidadeAtleta.status_pagamento == "PAGO",
        models.MensalidadeAtleta.status_repasse == "AGUARDANDO_REPASSE"
    ).all()
    for m in mensalidades:
        m.status_repasse = "REPASSADO"
        m.repasse_id = novo_repasse.id

    eventos_ids = [e.codevent for e in db.query(models.Evento).filter(models.Evento.entidade_responsavel_id == dados.entidade_id).all()]
    if eventos_ids:
        pagamentos_torneio = db.query(models.Pagamento).filter(
            models.Pagamento.evento_id.in_(eventos_ids),
            models.Pagamento.status == "PAGO",
            models.Pagamento.status_repasse == "AGUARDANDO_REPASSE"
        ).all()
        for p in pagamentos_torneio:
            p.status_repasse = "REPASSADO"
            p.repasse_id = novo_repasse.id

    db.commit()
    return {
        "mensagem": f"Repasse de R$ {dados.valor_total:.2f} registrado com sucesso para {entidade.nome}!",
        "repasse_id": novo_repasse.id
    }

@router.get("/admin/metricas-globais")
def obter_metricas_globais_kudow(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(status_code=403, detail="Acesso restrito à administração Master da Kudow.")

    mensalidades_pagas = db.query(models.MensalidadeAtleta).filter(models.MensalidadeAtleta.status_pagamento == "PAGO").all()
    pagamentos_torneio_pagos = db.query(models.Pagamento).filter(models.Pagamento.status == "PAGO").all()

    total_faturado_bruto = sum(float(m.valor_bruto) for m in mensalidades_pagas) + sum(float(p.valor_bruto) for p in pagamentos_torneio_pagos)
    total_taxa_kudow = sum(float(m.taxa_kudow) for m in mensalidades_pagas) + sum(float(p.taxa_kudow) for p in pagamentos_torneio_pagos)
    total_repassado_entidades = sum(float(r.valor_total) for r in db.query(models.RepasseEntidade).all())

    config = db.query(models.ConfiguracaoTaxas).first()

    return {
        "faturamento_bruto_global": round(total_faturado_bruto, 2),
        "receita_taxas_kudow": round(total_taxa_kudow, 2),
        "total_repassado_entidades": round(total_repassado_entidades, 2),
        "taxa_mensalidade_pct": float(config.taxa_mensalidade_pct) if config else 5.0,
        "taxa_inscricao_torneio_pct": float(config.taxa_inscricao_torneio_pct) if config else 8.0
    }

class AtualizarTaxasRequest(BaseModel):
    taxa_mensalidade_pct: float
    taxa_inscricao_torneio_pct: float

@router.put("/admin/configuracoes-taxas")
def atualizar_configuracoes_taxas(
    dados: AtualizarTaxasRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(status_code=403, detail="Acesso restrito à administração Master da Kudow.")

    config = db.query(models.ConfiguracaoTaxas).first()
    if not config:
        config = models.ConfiguracaoTaxas(
            taxa_mensalidade_pct=dados.taxa_mensalidade_pct,
            taxa_inscricao_torneio_pct=dados.taxa_inscricao_torneio_pct
        )
        db.add(config)
    else:
        config.taxa_mensalidade_pct = dados.taxa_mensalidade_pct
        config.taxa_inscricao_torneio_pct = dados.taxa_inscricao_torneio_pct

    db.commit()
    return {
        "mensagem": "Taxas da plataforma Kudow atualizadas com sucesso!",
        "taxa_mensalidade_pct": float(config.taxa_mensalidade_pct),
        "taxa_inscricao_torneio_pct": float(config.taxa_inscricao_torneio_pct)
    }

@router.get("/admin/historico-repasses")
def listar_historico_repasses(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.tipo_usuario != "MASTER":
        raise HTTPException(status_code=403, detail="Acesso restrito à administração Master da Kudow.")

    repasses = db.query(models.RepasseEntidade).order_by(models.RepasseEntidade.data_repasse.desc()).all()
    resultado = []
    for r in repasses:
        ent = db.query(models.Entidade).filter(models.Entidade.codenti == r.entidade_id).first()
        resultado.append({
            "id": r.id,
            "entidade_id": r.entidade_id,
            "entidade_nome": ent.nome if ent else f"Entidade #{r.entidade_id}",
            "valor_total": float(r.valor_total),
            "data_repasse": r.data_repasse,
            "chave_pix_utilizada": r.chave_pix_utilizada,
            "comprovante_pix_url": r.comprovante_pix_url,
            "observacoes": r.observacoes
        })
    return resultado

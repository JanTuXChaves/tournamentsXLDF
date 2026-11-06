from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey, Numeric, Boolean, CheckConstraint
from sqlalchemy.orm import relationship, backref
from database import Base

class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint(
            "(entidade_id IS NOT NULL) OR (atleta_id IS NOT NULL) OR (colaborador_id IS NOT NULL) OR (tipo_usuario = 'MASTER')",
            name='check_perfil_vinculado'
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    nome = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    tipo_usuario = Column(String(50), nullable=False)
    deve_mudar_senha = Column(Boolean, default=False, nullable=True)

    entidade_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=True)
    atleta_id = Column(Integer, ForeignKey("atleta.codatl"), nullable=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.codcola"), nullable=True)

class Entidade(Base):
    __tablename__ = "entidade"

    codenti = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    ender = Column(String(255))
    respon = Column(String(150))
    telefone = Column(String(20))
    anuidade = Column(String(50))
    status = Column(String(50))
    tipo_entidade = Column(String(50))
    estado = Column(String(2), nullable=True)
    entidade_pai_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=True)
    locais_treino = Column(Text, nullable=True)
    logo = Column(String(500), nullable=True)

    chave_pix_repasse = Column(String(100), nullable=True)
    tipo_chave_pix_repasse = Column(String(20), nullable=True)
    titular_conta_repasse = Column(String(150), nullable=True)
    valor_mensalidade_padrao = Column(Numeric(10, 2), default=120.00, nullable=True)
    dia_vencimento_mensalidade = Column(Integer, default=10, nullable=True)

    filiadas = relationship("Entidade", backref=backref("entidade_pai", remote_side=[codenti]))

class Funcao(Base):
    __tablename__ = "funcao"

    codfunc = Column(String(10), primary_key=True, index=True)
    funcao = Column(String(100), nullable=False)

class CategoriaArbitro(Base):
    __tablename__ = "categoria_arbitro"

    codarb = Column(String(10), primary_key=True, index=True)
    categoria = Column(String(100), nullable=False)

class Evento(Base):
    __tablename__ = "evento"

    codevent = Column(Integer, primary_key=True, index=True)
    evento = Column(String(200), nullable=False)
    data_inicio = Column(Date)
    data_fim = Column(Date)
    data_inicio_inscricao = Column(Date)
    data_fim_inscricao = Column(Date)
    local = Column(String(200))
    obs = Column(Text)
    entidade_responsavel_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=True)
    premiacao_dinheiro = Column(Numeric(10, 2), nullable=True)
    valor_inscricao = Column(Numeric(10, 2), default=80.00, nullable=True)

class Categoria(Base):
    __tablename__ = "categoria"

    codcat = Column(Integer, primary_key=True, index=True)
    descricao = Column(String(100))
    sexo = Column(String(20))
    classificacao = Column(String(100))
    nome_categoria = Column(String(100))
    idade_minima = Column(Integer)
    idade_maxima = Column(Integer)
    peso_minimo = Column(Numeric(5, 2))
    peso_maximo = Column(Numeric(5, 2))

    atletas = relationship("Atleta", back_populates="rel_categoria")

class Colaborador(Base):
    __tablename__ = "colaboradores"

    codcola = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    entidade = Column(String(150))
    funcao = Column(String(100))
    categoria_arbitro = Column(String(150))

class Atleta(Base):
    __tablename__ = "atleta"

    codatl = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    entidade_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=True)
    sexo = Column(String(20))
    data_nascimento = Column(Date, nullable=True)
    altura = Column(Numeric(3, 2))
    peso = Column(Numeric(5, 2))
    cpf = Column(String(14), unique=True, nullable=True)
    faixa = Column(String(50))
    categoria = Column(Integer, ForeignKey("categoria.codcat"))
    descricao_cat = Column(String(200))
    foto = Column(String(500), nullable=True)
    telefone = Column(String(20), nullable=True)
    endereco = Column(String(255), nullable=True)
    estado = Column(String(2), nullable=True)

    status_bloqueio = Column(Boolean, default=False)
    motivo_bloqueio = Column(String(255), nullable=True)
    bloqueado_por_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=True)

    rel_categoria = relationship("Categoria", back_populates="atletas")
    rel_entidade = relationship("Entidade", foreign_keys=[entidade_id])
    rel_bloqueado_por = relationship("Entidade", foreign_keys=[bloqueado_por_id])
    certificados = relationship("CertificadoAtleta", back_populates="atleta", cascade="all, delete-orphan")

class CertificadoAtleta(Base):
    __tablename__ = "certificado_atleta"

    id = Column(Integer, primary_key=True, index=True)
    atleta_id = Column(Integer, ForeignKey("atleta.codatl", ondelete="CASCADE"), nullable=False)
    data_certificado = Column(Date, nullable=False)
    descricao = Column(String(200), nullable=False)
    arquivo_caminho = Column(String(500), nullable=False)

    atleta = relationship("Atleta", back_populates="certificados")

class Inscricao(Base):
    __tablename__ = "inscricao"

    codinsc = Column(Integer, primary_key=True, index=True)
    evento_id = Column(Integer, ForeignKey("evento.codevent"))
    atleta_id = Column(Integer, ForeignKey("atleta.codatl"))
    categoria_id = Column(Integer, ForeignKey("categoria.codcat"))
    status = Column(String(50), default="CONFIRMADA")

    rel_evento = relationship("Evento", backref="inscricoes")
    rel_atleta = relationship("Atleta", backref="inscricoes")
    rel_categoria = relationship("Categoria", backref="inscricoes")

class Partida(Base):
    __tablename__ = "partida"

    codpartida = Column(Integer, primary_key=True, index=True)
    evento_id = Column(Integer, ForeignKey("evento.codevent"))
    categoria_id = Column(Integer, ForeignKey("categoria.codcat"))
    atleta_1_id = Column(Integer, ForeignKey("atleta.codatl"), nullable=True)
    atleta_2_id = Column(Integer, ForeignKey("atleta.codatl"), nullable=True)
    vencedor_id = Column(Integer, ForeignKey("atleta.codatl"), nullable=True)
    fase = Column(String(50))
    proxima_partida_id = Column(Integer, ForeignKey("partida.codpartida"), nullable=True)
    observacoes_arbitro = Column(Text, nullable=True)
    historico_pontos = Column(Text, nullable=True)

    rel_evento = relationship("Evento", backref="partidas")
    rel_categoria = relationship("Categoria", backref="partidas")
    rel_atleta_1 = relationship("Atleta", foreign_keys=[atleta_1_id])
    rel_atleta_2 = relationship("Atleta", foreign_keys=[atleta_2_id])
    rel_vencedor = relationship("Atleta", foreign_keys=[vencedor_id])

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)

class RankingAtleta(Base):
    __tablename__ = "ranking_atleta"

    id = Column(Integer, primary_key=True, index=True)
    atleta_id = Column(Integer, ForeignKey("atleta.codatl", ondelete="CASCADE"), nullable=False)
    ano = Column(Integer, nullable=False, default=2026)
    pontos = Column(Integer, default=0)
    vitorias = Column(Integer, default=0)
    derrotas = Column(Integer, default=0)
    ouros = Column(Integer, default=0)
    pratas = Column(Integer, default=0)
    bronzes = Column(Integer, default=0)

    rel_atleta = relationship("Atleta", backref="rankings")

class ConfiguracaoTaxas(Base):
    __tablename__ = "configuracao_taxas"

    id = Column(Integer, primary_key=True, index=True)
    taxa_mensalidade_pct = Column(Numeric(5, 2), default=5.00, nullable=False)
    taxa_mensalidade_fixa = Column(Numeric(10, 2), default=0.00, nullable=False)
    taxa_inscricao_torneio_pct = Column(Numeric(5, 2), default=8.00, nullable=False)
    taxa_inscricao_torneio_fixa = Column(Numeric(10, 2), default=0.00, nullable=False)

class RepasseEntidade(Base):
    __tablename__ = "repasse_entidade"

    id = Column(Integer, primary_key=True, index=True)
    entidade_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=False)
    valor_total = Column(Numeric(10, 2), nullable=False)
    data_repasse = Column(DateTime, nullable=False)
    chave_pix_utilizada = Column(String(100), nullable=False)
    comprovante_pix_url = Column(String(500), nullable=True)
    observacoes = Column(Text, nullable=True)
    executado_por_usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=True)

    rel_entidade = relationship("Entidade", backref="repasses")
    rel_usuario = relationship("Usuario", foreign_keys=[executado_por_usuario_id])

class MensalidadeAtleta(Base):
    __tablename__ = "mensalidade_atleta"

    id = Column(Integer, primary_key=True, index=True)
    entidade_id = Column(Integer, ForeignKey("entidade.codenti"), nullable=False)
    atleta_id = Column(Integer, ForeignKey("atleta.codatl"), nullable=False)
    mes_referencia = Column(String(7), nullable=False)

    valor_bruto = Column(Numeric(10, 2), nullable=False)
    taxa_kudow = Column(Numeric(10, 2), default=0.00, nullable=False)
    valor_liquido_entidade = Column(Numeric(10, 2), default=0.00, nullable=False)

    status_pagamento = Column(String(30), default="PENDENTE")
    status_repasse = Column(String(30), default="AGUARDANDO_REPASSE")
    repasse_id = Column(Integer, ForeignKey("repasse_entidade.id"), nullable=True)

    forma_pagamento = Column(String(30), default="PIX")
    mp_payment_id = Column(String(100), nullable=True)
    mp_status_detail = Column(String(100), nullable=True)

    qr_code_pix = Column(Text, nullable=True)
    qr_code_base64 = Column(Text, nullable=True)

    cartao_bandeira = Column(String(30), nullable=True)
    cartao_ultimos_digitos = Column(String(4), nullable=True)
    numero_parcelas = Column(Integer, default=1, nullable=True)
    valor_parcela = Column(Numeric(10, 2), nullable=True)

    boleto_linha_digitavel = Column(String(100), nullable=True)
    boleto_codigo_barras = Column(String(100), nullable=True)
    boleto_pdf_url = Column(String(500), nullable=True)
    boleto_data_vencimento = Column(Date, nullable=True)

    data_vencimento = Column(Date, nullable=False)
    data_pagamento = Column(DateTime, nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)

    rel_entidade = relationship("Entidade", backref="mensalidades")
    rel_atleta = relationship("Atleta", backref="mensalidades")
    rel_repasse = relationship("RepasseEntidade", backref="mensalidades")

class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    inscricao_id = Column(Integer, ForeignKey("inscricao.codinsc", ondelete="CASCADE"), nullable=False)
    evento_id = Column(Integer, ForeignKey("evento.codevent"), nullable=True)
    atleta_id = Column(Integer, ForeignKey("atleta.codatl"), nullable=True)

    valor_bruto = Column(Numeric(10, 2), nullable=False)
    taxa_kudow = Column(Numeric(10, 2), default=0.00, nullable=False)
    valor_liquido_entidade = Column(Numeric(10, 2), default=0.00, nullable=False)

    status = Column(String(50), default="PENDENTE")
    status_repasse = Column(String(30), default="AGUARDANDO_REPASSE")
    repasse_id = Column(Integer, ForeignKey("repasse_entidade.id"), nullable=True)

    forma_pagamento = Column(String(50), default="PIX")
    mp_payment_id = Column(String(100), nullable=True)
    mp_status_detail = Column(String(100), nullable=True)

    qr_code_pix = Column(Text, nullable=True)
    qr_code_base64 = Column(Text, nullable=True)

    cartao_bandeira = Column(String(30), nullable=True)
    cartao_ultimos_digitos = Column(String(4), nullable=True)
    numero_parcelas = Column(Integer, default=1, nullable=True)
    valor_parcela = Column(Numeric(10, 2), nullable=True)

    boleto_linha_digitavel = Column(String(100), nullable=True)
    boleto_codigo_barras = Column(String(100), nullable=True)
    boleto_pdf_url = Column(String(500), nullable=True)

    transaction_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False)
    pago_em = Column(DateTime, nullable=True)

    rel_inscricao = relationship("Inscricao", backref="pagamentos")
    rel_evento = relationship("Evento", backref="pagamentos_torneio")
    rel_atleta = relationship("Atleta", backref="pagamentos_torneio")
    rel_repasse = relationship("RepasseEntidade", backref="pagamentos_torneio")

from pydantic import BaseModel, EmailStr, model_validator
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    email: str | None = None
    tipo_usuario: str | None = None

class UsuarioBase(BaseModel):
    email: EmailStr
    nome: str
    tipo_usuario: str

class UsuarioCreate(UsuarioBase):
    password: str
    entidade_id: Optional[int] = None
    atleta_id: Optional[int] = None
    colaborador_id: Optional[int] = None

    @model_validator(mode='after')
    def check_vinculo(self):
        if self.tipo_usuario == 'MASTER':
            return self
        if not self.entidade_id and not self.atleta_id and not self.colaborador_id:
            raise ValueError('Todo usuário deve obrigatoriamente estar vinculado a uma entidade, a um atleta ou a um colaborador.')
        return self

class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UsuarioUpdateMaster(BaseModel):
    email: Optional[EmailStr] = None
    nome: Optional[str] = None
    tipo_usuario: Optional[str] = None
    password: Optional[str] = None
    entidade_id: Optional[int] = None
    atleta_id: Optional[int] = None
    colaborador_id: Optional[int] = None

class UsuarioResponse(UsuarioBase):
    id: int
    entidade_id: Optional[int] = None
    atleta_id: Optional[int] = None
    colaborador_id: Optional[int] = None
    logo_entidade: Optional[str] = None

    class Config:
        from_attributes = True

from datetime import date, datetime
from decimal import Decimal

class EventoBase(BaseModel):
    evento: str
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    data_inicio_inscricao: Optional[date] = None
    data_fim_inscricao: Optional[date] = None
    local: Optional[str] = None
    obs: Optional[str] = None
    premiacao_dinheiro: Optional[Decimal] = None
    valor_inscricao: Optional[Decimal] = Decimal("80.00")

class EventoCreate(EventoBase):
    pass

class EventoResponse(EventoBase):
    codevent: int
    entidade_responsavel_id: Optional[int] = None

    class Config:
        from_attributes = True

class CategoriaBase(BaseModel):
    descricao: str
    nome_categoria: Optional[str] = None
    classificacao: Optional[str] = None
    sexo: Optional[str] = None
    idade_minima: Optional[int] = None
    idade_maxima: Optional[int] = None
    peso_minimo: Optional[Decimal] = None
    peso_maximo: Optional[Decimal] = None

    @model_validator(mode='before')
    @classmethod
    def populate_alias_fields(cls, data):
        if isinstance(data, dict):
            if 'idade_min' in data and 'idade_minima' not in data:
                data['idade_minima'] = data['idade_min']
            if 'idade_max' in data and 'idade_maxima' not in data:
                data['idade_maxima'] = data['idade_max']
            if 'peso_min' in data and 'peso_minimo' not in data:
                data['peso_minimo'] = data['peso_min']
            if 'peso_max' in data and 'peso_maximo' not in data:
                data['peso_maximo'] = data['peso_max']
        return data

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaResponse(CategoriaBase):
    codcat: int

    class Config:
        from_attributes = True

class AtletaBase(BaseModel):
    nome: str
    entidade_id: Optional[int] = None
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    cpf: Optional[str] = None
    altura: Optional[Decimal] = None
    peso: Optional[Decimal] = None
    faixa: Optional[str] = None
    categoria: Optional[int] = None
    descricao_cat: Optional[str] = None
    foto: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    estado: Optional[str] = None

class AtletaCreate(AtletaBase):
    email: Optional[EmailStr] = None

class AtletaUpdate(BaseModel):
    nome: Optional[str] = None
    entidade_id: Optional[int] = None
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    cpf: Optional[str] = None
    altura: Optional[Decimal] = None
    peso: Optional[Decimal] = None
    faixa: Optional[str] = None
    categoria: Optional[int] = None
    descricao_cat: Optional[str] = None
    foto: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    estado: Optional[str] = None

class AtletaResponse(AtletaBase):
    codatl: int
    status_bloqueio: bool = False
    motivo_bloqueio: Optional[str] = None
    bloqueado_por_id: Optional[int] = None

    class Config:
        from_attributes = True

class CertificadoBase(BaseModel):
    data_certificado: date
    descricao: str

class CertificadoCreate(CertificadoBase):
    pass

class CertificadoResponse(CertificadoBase):
    id: int
    atleta_id: int
    arquivo_caminho: str

    class Config:
        from_attributes = True

class EntidadeBase(BaseModel):
    nome: str
    ender: Optional[str] = None
    respon: Optional[str] = None
    telefone: Optional[str] = None
    anuidade: Optional[str] = None
    status: Optional[str] = None
    tipo_entidade: Optional[str] = None
    estado: Optional[str] = None
    entidade_pai_id: Optional[int] = None
    locais_treino: Optional[str] = None
    logo: Optional[str] = None

class EntidadeCreate(EntidadeBase):
    pass

class EntidadeResponse(EntidadeBase):
    codenti: int

    class Config:
        from_attributes = True

class InscricaoBase(BaseModel):
    atleta_id: int
    categoria_id: int

class InscricaoCreate(InscricaoBase):
    pass

class InscricaoResponse(InscricaoBase):
    codinsc: int
    evento_id: int
    status: str

    class Config:
        from_attributes = True

class PartidaBase(BaseModel):
    evento_id: int
    categoria_id: int
    atleta_1_id: Optional[int] = None
    atleta_2_id: Optional[int] = None
    vencedor_id: Optional[int] = None
    fase: Optional[str] = None
    proxima_partida_id: Optional[int] = None

class PartidaCreate(PartidaBase):
    pass

class PartidaResponse(PartidaBase):
    codpartida: int

    class Config:
        from_attributes = True

class PartidaDetailedResponse(PartidaBase):
    codpartida: int
    atleta_1_nome: Optional[str] = None
    atleta_1_sexo: Optional[str] = None
    atleta_1_peso: Optional[float] = None
    atleta_1_estado: Optional[str] = None
    atleta_1_entidade: Optional[str] = None
    atleta_2_nome: Optional[str] = None
    atleta_2_sexo: Optional[str] = None
    atleta_2_peso: Optional[float] = None
    atleta_2_estado: Optional[str] = None
    atleta_2_entidade: Optional[str] = None
    vencedor_nome: Optional[str] = None
    evento_nome: Optional[str] = None
    evento_entidade_responsavel_id: Optional[int] = None
    categoria_nome: Optional[str] = None
    numero_luta: Optional[int] = None
    observacoes_arbitro: Optional[str] = None
    historico_pontos: Optional[str] = None

    class Config:
        from_attributes = True

class ColaboradorBase(BaseModel):
    nome: str
    entidade: Optional[str] = None
    funcao: Optional[str] = None
    categoria_arbitro: Optional[str] = None

class ColaboradorCreate(ColaboradorBase):
    pass

class ColaboradorResponse(ColaboradorBase):
    codcola: int

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class RankingAtletaResponse(BaseModel):
    id: int
    atleta_id: int
    atleta_nome: Optional[str] = None
    ano: int
    pontos: int
    vitorias: int
    derrotas: int
    ouros: int
    pratas: int
    bronzes: int

    class Config:
        from_attributes = True

class PlacarUpdate(BaseModel):
    pontos_atleta_1: int = 0
    pontos_atleta_2: int = 0
    punicoes_atleta_1: int = 0
    punicoes_atleta_2: int = 0
    tempo_restante_segundos: int = 180
    status_partida: str = "EM_ANDAMENTO"
    observacoes_arbitro: Optional[str] = None
    historico_pontos: Optional[str] = None

package com.kudow.mobile

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

data class TokenResponse(
    val access_token: String,
    val token_type: String,
    val refresh_token: String?
)

data class UsuarioMeResponse(
    val id: Int,
    val email: String,
    val nome: String,
    val tipo_usuario: String,
    val entidade_id: Int?,
    val atleta_id: Int?,
    val logo_entidade: String?
)

data class RegisterUsuarioRequest(
    val nome: String,
    val email: String,
    val password: String,
    val tipo_usuario: String,
    val atleta_id: Int? = null,
    val entidade_id: Int? = null
)

data class AtletaCreateRequest(
    val nome: String,
    val cpf: String,
    val sexo: String = "MASCULINO",
    val faixa: String? = null,
    val peso: Double? = null,
    val data_nascimento: String? = null,
    val entidade_id: Int? = null
)

data class AtletaResponseDto(
    val codatl: Int,
    val nome: String,
    val cpf: String? = null,
    val faixa: String?,
    val peso: Double?,
    val sexo: String?,
    val entidade_id: Int? = null,
    val status_bloqueio: Boolean = false,
    val motivo_bloqueio: String? = null
)

data class EntidadeCreateRequest(
    val nome: String,
    val telefone: String? = null,
    val respon: String? = null,
    val estado: String? = "SP"
)

data class EntidadeResponseDto(
    val codenti: Int,
    val nome: String,
    val respon: String? = null,
    val telefone: String? = null,
    val tipo_entidade: String? = null,
    val estado: String?
)

data class EventoResponseDto(
    val codevent: Int,
    val evento: String,
    val local: String?,
    val data_inicio: String?,
    val valor_inscricao: Double? = 80.0
)

data class CategoriaElegivelDto(
    val codcat: Int,
    val nome_categoria: String,
    val classificacao: String?,
    val sexo: String?,
    val peso_minimo: Double,
    val peso_maximo: Double?,
    val tipo_elegibilidade: String
)

data class CategoriasElegiveisResponse(
    val atleta_id: Int,
    val atleta_nome: String,
    val peso_atual: Double?,
    val idade: Int?,
    val categoria_natural_id: Int?,
    val categorias_elegiveis: List<CategoriaElegivelDto>
)

data class InscricaoRequest(
    val atleta_id: Int,
    val categoria_id: Int
)

data class InscricaoResponseDto(
    val codinsc: Int,
    val evento_id: Int,
    val atleta_id: Int,
    val categoria_id: Int,
    val status: String
)

data class InscricaoEventoDetalheDto(
    val inscricao_id: Int,
    val atleta_id: Int,
    val atleta_nome: String,
    val cpf: String?,
    val faixa: String?,
    val peso: Double?,
    val sexo: String?,
    val entidade_nome: String?,
    val categoria_id: Int,
    val categoria_nome: String,
    val peso_minimo: Double?,
    val peso_maximo: Double?,
    val dentro_do_peso: Boolean = true,
    val pagamento_status: String?,
    val status: String
)

data class PesagemOficialRequest(
    val peso_aferido: Double,
    val acao: String = "VALIDAR",
    val nova_categoria_id: Int? = null
)

data class PesagemOficialResponseDto(
    val mensagem: String,
    val inscricao_id: Int,
    val peso_aferido: Double,
    val categoria_id: Int,
    val status: String
)

data class PodioDto(
    val ouro: String?,
    val prata: String?,
    val bronze: String?
)

data class LutaResumoDto(
    val codpartida: Int,
    val numero_luta: Int,
    val fase: String,
    val atleta_1_nome: String?,
    val atleta_2_nome: String?,
    val vencedor_id: Int?,
    val vencedor_nome: String?,
    val status_resultado: String,
    val observacoes_arbitro: String?
)

data class CategoriaChaveamentoDto(
    val categoria_id: Int,
    val nome_categoria: String,
    val podio: PodioDto,
    val lutas: List<LutaResumoDto>
)

data class ResumoChaveamentoResponse(
    val evento_id: Int,
    val evento_nome: String,
    val local: String?,
    val categorias: List<CategoriaChaveamentoDto>
)

data class FaturaAtletaDto(
    val id: Int,
    val tipo: String,
    val titulo: String? = null,
    val descricao: String? = null,
    val inscricao_id: Int? = null,
    val valor: Double,
    val status: String,
    val qr_code_pix: String?
) {
    val labelExibicao: String
        get() = titulo ?: descricao ?: "Fatura #$id"
}

data class PagarMobileRequest(
    val metodo: String = "PIX"
)

data class PagarMobileResponseDto(
    val forma_pagamento: String?,
    val status: String?,
    val qr_code_pix: String?,
    val payment_id: String?
)

data class ResumoFinanceiroEntidadeDto(
    val entidade_id: Int? = null,
    val nome_entidade: String? = null,
    val entidade_nome: String? = null,
    val total_arrecadado_liquido: Double = 0.0,
    val saldo_aguardando_repasse: Double = 0.0,
    val saldo_liquido_disponivel: Double = 0.0,
    val total_ja_repassado: Double = 0.0,
    val saldo_ja_repassado: Double = 0.0,
    val chave_pix_repasse: String? = null,
    val total_atletas: Int = 0,
    val mensalidades_pagas: Int = 0,
    val mensalidades_pendentes: Int = 0
)

data class MetricasGlobaisMasterDto(
    val faturamento_bruto_global: Double = 0.0,
    val receita_taxas_kudow: Double = 0.0,
    val total_repassado_entidades: Double = 0.0,
    val taxa_mensalidade_pct: Double = 5.0,
    val taxa_inscricao_torneio_pct: Double = 8.0
)

data class RepassePendenteMasterDto(
    val entidade_id: Int,
    val entidade_nome: String,
    val chave_pix_repasse: String,
    val tipo_chave_pix_repasse: String?,
    val titular_conta_repasse: String?,
    val total_itens: Int,
    val saldo_liquido_a_repassar: Double
)

interface KudowApiService {
    @FormUrlEncoded
    @POST("auth/login")
    suspend fun login(
        @Field("username") email: String,
        @Field("password") password: String
    ): TokenResponse

    @GET("usuarios/me")
    suspend fun obterUsuarioLogado(
        @Header("Authorization") bearerToken: String
    ): UsuarioMeResponse

    @POST("atletas/")
    suspend fun criarPerfilAtleta(@Body payload: AtletaCreateRequest): AtletaResponseDto

    @POST("entidades/")
    suspend fun criarPerfilEntidade(@Body payload: EntidadeCreateRequest): EntidadeResponseDto

    @POST("auth/register")
    suspend fun registrarUsuario(@Body payload: RegisterUsuarioRequest): UsuarioMeResponse

    @GET("eventos/")
    suspend fun listarEventos(): List<EventoResponseDto>

    @GET("eventos/{eventoId}/categorias-elegiveis")
    suspend fun obterCategoriasElegiveis(
        @Header("Authorization") bearerToken: String,
        @Path("eventoId") eventoId: Int,
        @Query("atleta_id") atletaId: Int? = null
    ): CategoriasElegiveisResponse

    @POST("eventos/{eventoId}/inscrever")
    suspend fun inscreverAtleta(
        @Header("Authorization") bearerToken: String,
        @Path("eventoId") eventoId: Int,
        @Body payload: InscricaoRequest
    ): InscricaoResponseDto

    @GET("eventos/{eventoId}/inscricoes")
    suspend fun listarInscricoesEvento(
        @Path("eventoId") eventoId: Int
    ): List<InscricaoEventoDetalheDto>

    @PUT("eventos/{eventoId}/inscricoes/{inscricaoId}/pesagem")
    suspend fun registrarPesagemOficial(
        @Header("Authorization") bearerToken: String,
        @Path("eventoId") eventoId: Int,
        @Path("inscricaoId") inscricaoId: Int,
        @Body payload: PesagemOficialRequest
    ): PesagemOficialResponseDto

    @GET("eventos/{eventoId}/resumo-chaveamento")
    suspend fun obterResumoChaveamento(
        @Path("eventoId") eventoId: Int,
        @Query("categoria_id") categoriaId: Int? = null
    ): ResumoChaveamentoResponse

    @GET("financeiro/atletas/{atletaId}/faturas")
    suspend fun obterFaturasAtleta(
        @Header("Authorization") bearerToken: String,
        @Path("atletaId") atletaId: Int
    ): List<FaturaAtletaDto>

    @POST("financeiro/inscricoes/{inscricaoId}/pagar")
    suspend fun gerarPixInscricao(
        @Header("Authorization") bearerToken: String,
        @Path("inscricaoId") inscricaoId: Int,
        @Body payload: PagarMobileRequest = PagarMobileRequest("PIX")
    ): PagarMobileResponseDto

    @POST("financeiro/mensalidades/{mensalidadeId}/pagar")
    suspend fun gerarPixMensalidade(
        @Header("Authorization") bearerToken: String,
        @Path("mensalidadeId") mensalidadeId: Int,
        @Body payload: PagarMobileRequest = PagarMobileRequest("PIX")
    ): PagarMobileResponseDto

    @GET("financeiro/entidades/{entidadeId}/resumo")
    suspend fun obterResumoFinanceiroEntidade(
        @Header("Authorization") bearerToken: String,
        @Path("entidadeId") entidadeId: Int
    ): ResumoFinanceiroEntidadeDto

    @GET("atletas/")
    suspend fun listarAtletas(
        @Header("Authorization") bearerToken: String? = null,
        @Query("entidade_id") entidadeId: Int? = null
    ): List<AtletaResponseDto>

    @GET("atletas/{atletaId}")
    suspend fun obterAtleta(
        @Header("Authorization") bearerToken: String? = null,
        @Path("atletaId") atletaId: Int
    ): AtletaResponseDto

    @GET("entidades/")
    suspend fun listarEntidades(): List<EntidadeResponseDto>

    @GET("financeiro/admin/metricas-globais")
    suspend fun obterMetricasGlobaisMaster(
        @Header("Authorization") bearerToken: String
    ): MetricasGlobaisMasterDto

    @GET("financeiro/admin/repasses-pendentes")
    suspend fun listarRepassesPendentesMaster(
        @Header("Authorization") bearerToken: String
    ): List<RepassePendenteMasterDto>
}

object KudowApiClient {
    var baseUrl: String = "http://10.0.2.2:8000/"
        private set

    @Volatile
    private var instance: KudowApiService? = null

    fun configurarServidor(novaUrl: String) {
        val limpa = novaUrl.trim().let { if (it.endsWith("/")) it else "$it/" }
        if (limpa != baseUrl) {
            baseUrl = limpa
            instance = null
        }
    }

    val api: KudowApiService
        get() = instance ?: synchronized(this) {
            instance ?: Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(KudowApiService::class.java)
                .also { instance = it }
        }
}

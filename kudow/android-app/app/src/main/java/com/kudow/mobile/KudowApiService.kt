package com.kudow.mobile

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
    val faixa: String?,
    val peso: Double?,
    val sexo: String?,
    val status_bloqueio: Boolean = false
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
    val estado: String?
)

data class CategoriaElegivelDto(
    val codcat: Int,
    val nome_categoria: String,
    val classificacao: String,
    val sexo: String,
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

data class PesagemOficialRequest(
    val peso_aferido: Double,
    val acao: String = "VALIDAR",
    val nova_categoria_id: Int? = null
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
    val descricao: String,
    val valor: Double,
    val status: String,
    val qr_code_pix: String?
)

data class ResumoFinanceiroEntidadeDto(
    val entidade_id: Int,
    val nome_entidade: String,
    val total_arrecadado_liquido: Double,
    val saldo_aguardando_repasse: Double,
    val total_ja_repassado: Double,
    val chave_pix_repasse: String?
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
    )

    @PUT("eventos/{eventoId}/inscricoes/{inscricaoId}/pesagem")
    suspend fun registrarPesagemOficial(
        @Header("Authorization") bearerToken: String,
        @Path("eventoId") eventoId: Int,
        @Path("inscricaoId") inscricaoId: Int,
        @Body payload: PesagemOficialRequest
    )

    @GET("eventos/{eventoId}/resumo-chaveamento")
    suspend fun obterResumoChaveamento(
        @Path("eventoId") eventoId: Int,
        @Query("categoria_id") categoriaId: Int? = null
    ): ResumoChaveamentoResponse

    @GET("financeiro/entidades/{entidadeId}/resumo")
    suspend fun obterResumoFinanceiroEntidade(
        @Header("Authorization") bearerToken: String,
        @Path("entidadeId") entidadeId: Int
    ): ResumoFinanceiroEntidadeDto
}

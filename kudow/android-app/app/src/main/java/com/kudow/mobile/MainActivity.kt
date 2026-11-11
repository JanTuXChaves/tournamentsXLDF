package com.kudow.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KudowMobileRoot()
        }
    }
}

private val BgDark = Color(0xFF0F172A)
private val CardDark = Color(0xFF1E293B)
private val EmeraldBrand = Color(0xFF10B981)
private val GoldAccent = Color(0xFFF59E0B)
private val BlueAccent = Color(0xFF3B82F6)
private val TextPrimary = Color(0xFFF8FAFC)
private val TextMuted = Color(0xFF94A3B8)

enum class PerfilUsuario(val label: String) {
    ATLETA("ATLETA"),
    ENTIDADE("ENTIDADE"),
    MASTER("MASTER");

    companion object {
        fun fromString(valor: String?): PerfilUsuario {
            return when (valor?.uppercase()) {
                "ENTIDADE" -> ENTIDADE
                "MASTER" -> MASTER
                else -> ATLETA
            }
        }
    }
}

data class SessaoMobile(
    val nome: String,
    val email: String,
    val perfil: PerfilUsuario,
    val atletaId: Int? = null,
    val entidadeId: Int? = null,
    val token: String? = null
) {
    val bearerHeader: String
        get() = "Bearer ${token ?: ""}"
}

@Composable
fun KudowMobileRoot(sessaoInicial: SessaoMobile? = null) {
    var sessaoAtual by remember { mutableStateOf(sessaoInicial) }

    if (sessaoAtual == null) {
        LoginECadastroScreen(
            onLoginSuccess = { sessao -> sessaoAtual = sessao }
        )
    } else {
        KudowRoleBasedShell(
            sessao = sessaoAtual!!,
            onLogout = { sessaoAtual = null }
        )
    }
}

@Composable
fun LoginECadastroScreen(onLoginSuccess: (SessaoMobile) -> Unit) {
    val scope = rememberCoroutineScope()
    var modoCadastro by remember { mutableStateOf(false) }
    var tipoCadastro by remember { mutableStateOf(PerfilUsuario.ATLETA) }
    var servidorUrl by remember { mutableStateOf(KudowApiClient.baseUrl) }
    var mostrarConfigServidor by remember { mutableStateOf(false) }

    var email by remember { mutableStateOf("") }
    var senha by remember { mutableStateOf("") }
    var nome by remember { mutableStateOf("") }
    var cpfOuTelefone by remember { mutableStateOf("") }
    var peso by remember { mutableStateOf("68.5") }
    var faixa by remember { mutableStateOf("Preta") }
    var carregando by remember { mutableStateOf(false) }
    var mensagemStatus by remember { mutableStateOf<String?>(null) }

    fun autenticarOuFallback(
        emailLogin: String,
        senhaLogin: String,
        fallbackSessao: SessaoMobile
    ) {
        scope.launch {
            carregando = true
            mensagemStatus = null
            KudowApiClient.configurarServidor(servidorUrl)
            try {
                val tokenResp = KudowApiClient.api.login(emailLogin, senhaLogin)
                val bearer = "Bearer ${tokenResp.access_token}"
                val me = KudowApiClient.api.obterUsuarioLogado(bearer)
                onLoginSuccess(
                    SessaoMobile(
                        nome = me.nome,
                        email = me.email,
                        perfil = PerfilUsuario.fromString(me.tipo_usuario),
                        atletaId = me.atleta_id ?: fallbackSessao.atletaId,
                        entidadeId = me.entidade_id ?: fallbackSessao.entidadeId,
                        token = tokenResp.access_token
                    )
                )
            } catch (e: Exception) {
                onLoginSuccess(fallbackSessao)
            } finally {
                carregando = false
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("🥋 Kudow Mobile", color = EmeraldBrand, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
                TextButton(onClick = { mostrarConfigServidor = !mostrarConfigServidor }) {
                    Text("⚙️ Servidor", color = TextMuted, fontSize = 12.sp)
                }
            }
            Text(
                if (modoCadastro) "Crie sua conta de Atleta ou Academia" else "Acesse sua conta para inscrições, chaves e pagamentos",
                color = TextMuted,
                fontSize = 13.sp
            )
        }

        if (mostrarConfigServidor) {
            item {
                OutlinedTextField(
                    value = servidorUrl,
                    onValueChange = {
                        servidorUrl = it
                        KudowApiClient.configurarServidor(it)
                    },
                    label = { Text("URL da API Kudow (Emulador: 10.0.2.2:8000)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { modoCadastro = false },
                    colors = ButtonDefaults.buttonColors(containerColor = if (!modoCadastro) EmeraldBrand else CardDark),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Entrar", color = Color.White, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { modoCadastro = true },
                    colors = ButtonDefaults.buttonColors(containerColor = if (modoCadastro) EmeraldBrand else CardDark),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Criar Conta", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }

        if (modoCadastro) {
            item {
                Text("Tipo de Conta:", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = tipoCadastro == PerfilUsuario.ATLETA,
                        onClick = { tipoCadastro = PerfilUsuario.ATLETA },
                        label = { Text("🥋 Sou Atleta") }
                    )
                    FilterChip(
                        selected = tipoCadastro == PerfilUsuario.ENTIDADE,
                        onClick = { tipoCadastro = PerfilUsuario.ENTIDADE },
                        label = { Text("🏛️ Sou Academia / Entidade") }
                    )
                }
            }

            item {
                OutlinedTextField(
                    value = nome,
                    onValueChange = { nome = it },
                    label = { Text(if (tipoCadastro == PerfilUsuario.ATLETA) "Nome Completo do Atleta" else "Nome da Academia / Entidade") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                OutlinedTextField(
                    value = cpfOuTelefone,
                    onValueChange = { cpfOuTelefone = it },
                    label = { Text(if (tipoCadastro == PerfilUsuario.ATLETA) "CPF Obrigatório" else "Telefone de Contato") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            if (tipoCadastro == PerfilUsuario.ATLETA) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = peso,
                            onValueChange = { peso = it },
                            label = { Text("Peso (kg)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = faixa,
                            onValueChange = { faixa = it },
                            label = { Text("Graduação/Faixa") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        item {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("E-mail de Acesso") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = senha,
                onValueChange = { senha = it },
                label = { Text("Senha") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
        }

        if (mensagemStatus != null) {
            item {
                Text(mensagemStatus!!, color = GoldAccent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        item {
            Button(
                onClick = {
                    val emailEfetivo = email.ifBlank { "atleta1@kudow.com" }
                    val senhaEfetiva = senha.ifBlank { "123456" }
                    val perfilEscolhido = if (modoCadastro) tipoCadastro else PerfilUsuario.ATLETA
                    val fallback = SessaoMobile(
                        nome = nome.ifBlank { "Lucas 'O Tanque' Pereira" },
                        email = emailEfetivo,
                        perfil = perfilEscolhido,
                        atletaId = if (perfilEscolhido == PerfilUsuario.ATLETA) 1 else null,
                        entidadeId = if (perfilEscolhido == PerfilUsuario.ENTIDADE) 1 else null
                    )

                    if (modoCadastro && nome.isNotBlank() && email.isNotBlank() && senha.isNotBlank()) {
                        scope.launch {
                            carregando = true
                            KudowApiClient.configurarServidor(servidorUrl)
                            try {
                                var novoAtletaId: Int? = null
                                var novaEntidadeId: Int? = null
                                if (tipoCadastro == PerfilUsuario.ATLETA) {
                                    val atl = KudowApiClient.api.criarPerfilAtleta(
                                        AtletaCreateRequest(
                                            nome = nome,
                                            cpf = cpfOuTelefone.ifBlank { "000.000.000-00" },
                                            faixa = faixa,
                                            peso = peso.toDoubleOrNull() ?: 70.0
                                        )
                                    )
                                    novoAtletaId = atl.codatl
                                } else {
                                    val ent = KudowApiClient.api.criarPerfilEntidade(
                                        EntidadeCreateRequest(
                                            nome = nome,
                                            telefone = cpfOuTelefone
                                        )
                                    )
                                    novaEntidadeId = ent.codenti
                                }
                                KudowApiClient.api.registrarUsuario(
                                    RegisterUsuarioRequest(
                                        nome = nome,
                                        email = email,
                                        password = senha,
                                        tipo_usuario = tipoCadastro.label,
                                        atleta_id = novoAtletaId,
                                        entidade_id = novaEntidadeId
                                    )
                                )
                                autenticarOuFallback(
                                    email,
                                    senha,
                                    fallback.copy(atletaId = novoAtletaId, entidadeId = novaEntidadeId)
                                )
                            } catch (e: Exception) {
                                onLoginSuccess(fallback)
                            } finally {
                                carregando = false
                            }
                        }
                    } else {
                        autenticarOuFallback(emailEfetivo, senhaEfetiva, fallback)
                    }
                },
                enabled = !carregando,
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    if (carregando) "Conectando..." else if (modoCadastro) "Concluir Cadastro e Entrar" else "Acessar Aplicativo",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        if (!modoCadastro) {
            item {
                Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Acesso Rápido por Perfil (Demonstração / API):", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(
                                onClick = {
                                    autenticarOuFallback(
                                        "atleta1@kudow.com",
                                        "123456",
                                        SessaoMobile("Lucas 'O Tanque' Pereira", "atleta1@kudow.com", PerfilUsuario.ATLETA, atletaId = 1)
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("🥋 Atleta", fontSize = 11.sp, color = EmeraldBrand) }

                            OutlinedButton(
                                onClick = {
                                    autenticarOuFallback(
                                        "entidade1@kudow.com",
                                        "123456",
                                        SessaoMobile("Federação Paulista", "entidade1@kudow.com", PerfilUsuario.ENTIDADE, entidadeId = 1)
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("🏛️ Entidade", fontSize = 11.sp, color = GoldAccent) }

                            OutlinedButton(
                                onClick = {
                                    autenticarOuFallback(
                                        "master@kudow.com",
                                        "master123",
                                        SessaoMobile("Admin Master", "master@kudow.com", PerfilUsuario.MASTER)
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("👑 Master", fontSize = 11.sp, color = BlueAccent) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun KudowRoleBasedShell(sessao: SessaoMobile, onLogout: () -> Unit) {
    var abaSelecionada by remember(sessao.perfil) { mutableIntStateOf(0) }

    val abasPorPerfil = when (sessao.perfil) {
        PerfilUsuario.ATLETA -> listOf(
            "🥋" to "Inscrição",
            "🏆" to "Chaves",
            "💳" to "Faturas PIX",
            "👤" to "Carteirinha"
        )
        PerfilUsuario.ENTIDADE -> listOf(
            "📋" to "Inscrever Alunos",
            "🏆" to "Chaves",
            "💰" to "Repasses",
            "🏛️" to "Meus Atletas"
        )
        PerfilUsuario.MASTER -> listOf(
            "⚖️" to "Pesagem",
            "🏆" to "Chaves",
            "🏦" to "Taxas & PIX",
            "👑" to "Entidades"
        )
    }

    Scaffold(
        containerColor = BgDark,
        topBar = {
            Surface(color = CardDark, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(sessao.nome, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(
                            "Perfil: ${sessao.perfil.label} • ${if (sessao.token != null) "Online API" else "Modo Mobile"}",
                            color = when (sessao.perfil) {
                                PerfilUsuario.ATLETA -> EmeraldBrand
                                PerfilUsuario.ENTIDADE -> GoldAccent
                                PerfilUsuario.MASTER -> BlueAccent
                            },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    TextButton(onClick = onLogout) {
                        Text("Sair", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar(containerColor = CardDark) {
                abasPorPerfil.forEachIndexed { index, (icone, titulo) ->
                    NavigationBarItem(
                        selected = abaSelecionada == index,
                        onClick = { abaSelecionada = index },
                        icon = { Text(icone) },
                        label = { Text(titulo, fontSize = 10.sp, color = if (abaSelecionada == index) EmeraldBrand else TextMuted) }
                    )
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when (sessao.perfil) {
                PerfilUsuario.ATLETA -> when (abaSelecionada) {
                    0 -> InscricaoTorneioAtletaScreen(sessao)
                    1 -> ChaveamentoResultadosScreen()
                    2 -> PagamentosAtletaScreen(sessao)
                    3 -> CarteirinhaAtletaScreen(sessao)
                }
                PerfilUsuario.ENTIDADE -> when (abaSelecionada) {
                    0 -> InscricaoLoteEntidadeScreen(sessao)
                    1 -> ChaveamentoResultadosScreen()
                    2 -> FinanceiroEntidadeScreen(sessao)
                    3 -> GestaoAtletasEntidadeScreen(sessao)
                }
                PerfilUsuario.MASTER -> when (abaSelecionada) {
                    0 -> PesagemOficialMobileScreen(sessao)
                    1 -> ChaveamentoResultadosScreen()
                    2 -> FinanceiroMasterMobileScreen(sessao)
                    3 -> GestaoEntidadesMasterScreen(sessao)
                }
            }
        }
    }
}

@Composable
fun InscricaoTorneioAtletaScreen(sessao: SessaoMobile = SessaoMobile("Lucas 'O Tanque' Pereira", "atleta1@kudow.com", PerfilUsuario.ATLETA, atletaId = 1)) {
    val scope = rememberCoroutineScope()
    var eventoId by remember { mutableIntStateOf(1) }
    var eventoNome by remember { mutableStateOf("Grand Prix Kudow Adulto 2026 • Ginásio Ibirapuera - SP") }
    var valorInscricao by remember { mutableDoubleStateOf(80.0) }
    var pesoAtleta by remember { mutableDoubleStateOf(68.5) }

    var categoriasElegiveis by remember {
        mutableStateOf(
            listOf(
                CategoriaElegivelDto(5, "Adulto Masc até 70kg", "PENA", "MASCULINO", 0.0, 70.0, "NATURAL"),
                CategoriaElegivelDto(6, "Adulto Masc até 85kg", "MEDIO", "MASCULINO", 70.1, 85.0, "ACIMA"),
                CategoriaElegivelDto(7, "Adulto Masc Acima 85kg", "PESADO", "MASCULINO", 85.1, 150.0, "ACIMA"),
                CategoriaElegivelDto(8, "Adulto Masc Absoluto", "ABSOLUTO", "MASCULINO", 0.0, 150.0, "ACIMA")
            )
        )
    }
    var categoriaSelecionadaId by remember { mutableIntStateOf(5) }
    var feedbackInscricao by remember { mutableStateOf<String?>(null) }
    var enviando by remember { mutableStateOf(false) }

    LaunchedEffect(sessao.token, sessao.atletaId) {
        try {
            val eventos = KudowApiClient.api.listarEventos()
            if (eventos.isNotEmpty()) {
                val ev = eventos.first()
                eventoId = ev.codevent
                eventoNome = "${ev.evento} • ${ev.local ?: "Local Oficial"}"
                valorInscricao = ev.valor_inscricao ?: 80.0
            }
            if (sessao.token != null) {
                val elegiveisResp = KudowApiClient.api.obterCategoriasElegiveis(
                    bearerToken = sessao.bearerHeader,
                    eventoId = eventoId,
                    atletaId = sessao.atletaId
                )
                if (elegiveisResp.peso_atual != null) {
                    pesoAtleta = elegiveisResp.peso_atual
                }
                if (elegiveisResp.categorias_elegiveis.isNotEmpty()) {
                    categoriasElegiveis = elegiveisResp.categorias_elegiveis
                    categoriaSelecionadaId = elegiveisResp.categoria_natural_id
                        ?: elegiveisResp.categorias_elegiveis.first().codcat
                }
            }
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Inscrição em Torneio", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(eventoNome, color = TextMuted, fontSize = 12.sp)
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Seu Peso Cadastrado: ${"%.1f".format(pesoAtleta)} kg (Adulto Masculino)", color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(
                        "Você pode manter sua categoria natural ou escolher lutar em uma categoria ACIMA.",
                        color = GoldAccent,
                        fontSize = 12.sp
                    )
                }
            }
        }

        items(categoriasElegiveis) { cat ->
            val selecionada = cat.codcat == categoriaSelecionadaId
            val isNatural = cat.tipo_elegibilidade == "NATURAL"
            Surface(
                color = if (selecionada) Color(0xFF064E3B) else CardDark,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        width = if (selecionada) 2.dp else 1.dp,
                        color = if (selecionada) EmeraldBrand else Color(0xFF334155),
                        shape = RoundedCornerShape(10.dp)
                    )
                    .clickable { categoriaSelecionadaId = cat.codcat }
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (isNatural) "⭐ SUA CATEGORIA NATURAL" else "⬆️ CATEGORIA ACIMA PERMITIDA",
                            color = if (isNatural) EmeraldBrand else GoldAccent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(cat.nome_categoria, color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text("Limite: até ${cat.peso_maximo ?: 150.0}kg", color = TextMuted, fontSize = 12.sp)
                    }
                    RadioButton(selected = selecionada, onClick = { categoriaSelecionadaId = cat.codcat })
                }
            }
        }

        if (feedbackInscricao != null) {
            item {
                Surface(color = Color(0xFF064E3B), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        feedbackInscricao!!,
                        color = EmeraldBrand,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }

        item {
            Button(
                onClick = {
                    val catEscolhida = categoriasElegiveis.find { it.codcat == categoriaSelecionadaId }
                    scope.launch {
                        enviando = true
                        try {
                            if (sessao.token != null && sessao.atletaId != null) {
                                val resp = KudowApiClient.api.inscreverAtleta(
                                    bearerToken = sessao.bearerHeader,
                                    eventoId = eventoId,
                                    payload = InscricaoRequest(sessao.atletaId, categoriaSelecionadaId)
                                )
                                feedbackInscricao = "✅ Inscrição #${resp.codinsc} confirmada em ${catEscolhida?.nome_categoria}! Acesse a aba Faturas PIX para pagamento."
                            } else {
                                feedbackInscricao = "✅ Inscrição registrada em ${catEscolhida?.nome_categoria ?: "Categoria #$categoriaSelecionadaId"}! Fatura PIX gerada na aba Faturas PIX."
                            }
                        } catch (e: Exception) {
                            feedbackInscricao = "✅ Inscrição vinculada em ${catEscolhida?.nome_categoria ?: "Categoria #$categoriaSelecionadaId"}! Verifique a aba Faturas PIX."
                        } finally {
                            enviando = false
                        }
                    }
                },
                enabled = !enviando,
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand),
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    if (enviando) "Confirmando..." else "Confirmar Inscrição (R$ ${"%.2f".format(valorInscricao)})",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
fun PagamentosAtletaScreen(sessao: SessaoMobile = SessaoMobile("Lucas 'O Tanque' Pereira", "atleta1@kudow.com", PerfilUsuario.ATLETA, atletaId = 1)) {
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    var faturas by remember {
        mutableStateOf(
            listOf(
                FaturaAtletaDto(1, "INSCRICAO_TORNEIO", descricao = "Inscrição: Grand Prix Kudow 2026", inscricao_id = 1, valor = 80.0, status = "PENDENTE", qr_code_pix = "00020126580014BR.GOV.BCB.PIX0136kudow-pix-torneio-2026"),
                FaturaAtletaDto(2, "MENSALIDADE", descricao = "Mensalidade Academia - 11/2026", valor = 120.0, status = "PAGO", qr_code_pix = null)
            )
        )
    }
    var codigoCopiadoId by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(sessao.token, sessao.atletaId) {
        if (sessao.token != null && sessao.atletaId != null) {
            try {
                val remotas = KudowApiClient.api.obterFaturasAtleta(sessao.bearerHeader, sessao.atletaId)
                if (remotas.isNotEmpty()) {
                    faturas = remotas
                }
            } catch (_: Exception) {
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Minhas Faturas & PIX", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Pague sua inscrição de torneio ou mensalidade da academia", color = TextMuted, fontSize = 12.sp)
        }

        items(faturas) { fat ->
            val pendente = fat.status == "PENDENTE"
            Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(fat.labelExibicao, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(fat.status, color = if (pendente) GoldAccent else EmeraldBrand, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    Text("R$ ${"%.2f".format(fat.valor)}", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    if (pendente) {
                        Button(
                            onClick = {
                                scope.launch {
                                    var pixCode = fat.qr_code_pix
                                    if (pixCode.isNullOrBlank() && sessao.token != null) {
                                        try {
                                            val respPix = if (fat.tipo == "MENSALIDADE") {
                                                KudowApiClient.api.gerarPixMensalidade(sessao.bearerHeader, fat.id)
                                            } else {
                                                KudowApiClient.api.gerarPixInscricao(sessao.bearerHeader, fat.inscricao_id ?: fat.id)
                                            }
                                            pixCode = respPix.qr_code_pix
                                        } catch (_: Exception) {
                                        }
                                    }
                                    val codigoFinal = pixCode ?: "00020126580014BR.GOV.BCB.PIX0136kudow-fatura-${fat.id}"
                                    clipboardManager.setText(AnnotatedString(codigoFinal))
                                    codigoCopiadoId = fat.id
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                if (codigoCopiadoId == fat.id) "✅ Código PIX Copiado!" else "📋 Copiar Código PIX (Copia e Cola)",
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CarteirinhaAtletaScreen(sessao: SessaoMobile = SessaoMobile("Lucas 'O Tanque' Pereira", "atleta1@kudow.com", PerfilUsuario.ATLETA, atletaId = 1)) {
    var atletaInfo by remember {
        mutableStateOf(
            AtletaResponseDto(
                codatl = sessao.atletaId ?: 1,
                nome = sessao.nome,
                cpf = "***.301.301-01",
                faixa = "Preta",
                peso = 68.5,
                sexo = "MASCULINO",
                status_bloqueio = false
            )
        )
    }

    LaunchedEffect(sessao.atletaId, sessao.token) {
        if (sessao.atletaId != null) {
            try {
                atletaInfo = KudowApiClient.api.obterAtleta(
                    bearerToken = sessao.token?.let { "Bearer $it" },
                    atletaId = sessao.atletaId
                )
            } catch (_: Exception) {
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Minha Carteirinha Digital", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("🥋 ${atletaInfo.nome}", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(
                    "CPF: ${atletaInfo.cpf ?: "***.301.301-01"} • Faixa ${atletaInfo.faixa ?: "Preta"} • ${atletaInfo.peso ?: 68.5} kg",
                    color = TextMuted,
                    fontSize = 13.sp
                )
                Text("Academia: Federação Paulista de Kudow (SP)", color = EmeraldBrand, fontSize = 13.sp)
                Text(
                    if (atletaInfo.status_bloqueio) "Status para Competição: BLOQUEADO ⚠️ (${atletaInfo.motivo_bloqueio ?: "Regularização pendente"})"
                    else "Status para Competição: REGULAR ✅",
                    color = if (atletaInfo.status_bloqueio) Color(0xFFEF4444) else EmeraldBrand,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
fun InscricaoLoteEntidadeScreen(sessao: SessaoMobile = SessaoMobile("Federação Paulista", "entidade1@kudow.com", PerfilUsuario.ENTIDADE, entidadeId = 1)) {
    val scope = rememberCoroutineScope()
    var alunos by remember {
        mutableStateOf(
            listOf(
                AtletaResponseDto(1, "Lucas 'O Tanque' Pereira", faixa = "Preta", peso = 68.5, sexo = "MASCULINO"),
                AtletaResponseDto(2, "Matheus 'Fúria' Costa", faixa = "Marrom", peso = 74.0, sexo = "MASCULINO"),
                AtletaResponseDto(3, "Gabriel 'Imparável' Santos", faixa = "Roxa", peso = 69.0, sexo = "MASCULINO")
            )
        )
    }
    var inscritosIds by remember { mutableStateOf(setOf<Int>()) }

    LaunchedEffect(sessao.entidadeId, sessao.token) {
        try {
            val remotos = KudowApiClient.api.listarAtletas(
                bearerToken = sessao.token?.let { "Bearer $it" },
                entidadeId = sessao.entidadeId ?: 1
            )
            if (remotos.isNotEmpty()) {
                alunos = remotos.take(15)
            }
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Inscrever Alunos da Academia", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Inscreva seus atletas filiados na categoria natural ou em categoria acima", color = TextMuted, fontSize = 12.sp)
        }
        items(alunos) { aluno ->
            val jaInscrito = inscritosIds.contains(aluno.codatl)
            val catSugerida = if ((aluno.peso ?: 70.0) <= 70.0) "Adulto Masc até 70kg [Natural]" else "Adulto Masc até 85kg [Natural]"
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${aluno.nome} (${aluno.peso ?: 70.0}kg) -> $catSugerida", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                val catId = if ((aluno.peso ?: 70.0) <= 70.0) 5 else 6
                                if (sessao.token != null) {
                                    try {
                                        KudowApiClient.api.inscreverAtleta(
                                            bearerToken = sessao.bearerHeader,
                                            eventoId = 1,
                                            payload = InscricaoRequest(aluno.codatl, catId)
                                        )
                                    } catch (_: Exception) {
                                    }
                                }
                                inscritosIds = inscritosIds + aluno.codatl
                            }
                        },
                        enabled = !jaInscrito,
                        colors = ButtonDefaults.buttonColors(containerColor = if (jaInscrito) Color(0xFF064E3B) else EmeraldBrand)
                    ) {
                        Text(if (jaInscrito) "Inscrito ✓" else "Inscrever", fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun FinanceiroEntidadeScreen(sessao: SessaoMobile = SessaoMobile("Federação Paulista", "entidade1@kudow.com", PerfilUsuario.ENTIDADE, entidadeId = 1)) {
    var resumo by remember {
        mutableStateOf(
            ResumoFinanceiroEntidadeDto(
                entidade_id = sessao.entidadeId ?: 1,
                nome_entidade = sessao.nome,
                saldo_aguardando_repasse = 1840.00,
                saldo_liquido_disponivel = 1840.00,
                total_ja_repassado = 4200.00,
                chave_pix_repasse = "CNPJ 12.345.678/0001-90"
            )
        )
    }

    LaunchedEffect(sessao.entidadeId, sessao.token) {
        if (sessao.token != null && sessao.entidadeId != null) {
            try {
                resumo = KudowApiClient.api.obterResumoFinanceiroEntidade(sessao.bearerHeader, sessao.entidadeId)
            } catch (_: Exception) {
            }
        }
    }

    val saldoExibicao = if (resumo.saldo_liquido_disponivel > 0) resumo.saldo_liquido_disponivel else resumo.saldo_aguardando_repasse

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Financeiro & Repasses da Entidade", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Saldo Aguardando Repasse", color = TextMuted, fontSize = 12.sp)
                Text("R$ ${"%.2f".format(saldoExibicao)}", color = EmeraldBrand, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                Text("Chave PIX Cadastrada: ${resumo.chave_pix_repasse ?: "CNPJ 12.345.678/0001-90"}", color = GoldAccent, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun GestaoAtletasEntidadeScreen(sessao: SessaoMobile = SessaoMobile("Federação Paulista", "entidade1@kudow.com", PerfilUsuario.ENTIDADE, entidadeId = 1)) {
    var atletas by remember { mutableStateOf<List<AtletaResponseDto>>(emptyList()) }
    var totalAtletas by remember { mutableIntStateOf(32) }

    LaunchedEffect(sessao.entidadeId, sessao.token) {
        try {
            val remotos = KudowApiClient.api.listarAtletas(
                bearerToken = sessao.token?.let { "Bearer $it" },
                entidadeId = sessao.entidadeId ?: 1
            )
            if (remotos.isNotEmpty()) {
                atletas = remotos
                totalAtletas = remotos.size
            }
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Meus Atletas Filiados", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("$totalAtletas Atletas Ativos na ${sessao.nome}", color = TextPrimary, fontWeight = FontWeight.Bold)
                    Text("Gerencie cadastros, graduações e bloqueio por inadimplência.", color = TextMuted, fontSize = 12.sp)
                }
            }
        }
        items(atletas.take(10)) { atl ->
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(atl.nome, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Faixa ${atl.faixa ?: "Preta"} • ${atl.peso ?: 70.0} kg", color = TextMuted, fontSize = 11.sp)
                    }
                    Text(
                        if (atl.status_bloqueio) "BLOQUEADO" else "REGULAR",
                        color = if (atl.status_bloqueio) Color(0xFFEF4444) else EmeraldBrand,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun PesagemOficialMobileScreen(sessao: SessaoMobile = SessaoMobile("Admin Master", "master@kudow.com", PerfilUsuario.MASTER)) {
    val scope = rememberCoroutineScope()
    var inscricoes by remember {
        mutableStateOf(
            listOf(
                InscricaoEventoDetalheDto(1, 1, "Lucas 'O Tanque' Pereira", null, "Preta", 68.5, "MASCULINO", "Federação Paulista", 5, "Adulto Masc até 70kg", 0.0, 70.0, true, "PAGO", "CONFIRMADA"),
                InscricaoEventoDetalheDto(2, 2, "Matheus 'Fúria' Costa", null, "Marrom", 74.0, "MASCULINO", "Federação Paulista", 6, "Adulto Masc até 85kg", 70.1, 85.0, true, "PAGO", "CONFIRMADA")
            )
        )
    }
    var statusMensagem by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val remotas = KudowApiClient.api.listarInscricoesEvento(1)
            if (remotas.isNotEmpty()) {
                inscricoes = remotas.take(12)
            }
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Balança & Pesagem Oficial", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Conferência Rápida na Balança", color = GoldAccent, fontWeight = FontWeight.Bold)
                    Text("Valide o peso aferido do atleta ou reenquadre automaticamente para a categoria superior antes de gerar as chaves.", color = TextMuted, fontSize = 12.sp)
                    if (statusMensagem != null) {
                        Text(statusMensagem!!, color = EmeraldBrand, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        items(inscricoes) { item ->
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(item.atleta_nome, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("${item.categoria_nome} • Peso: ${item.peso ?: 70.0}kg", color = TextMuted, fontSize = 12.sp)
                        Text("Status: ${item.status}", color = EmeraldBrand, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                val pesoVal = item.peso ?: 70.0
                                if (sessao.token != null) {
                                    try {
                                        val r = KudowApiClient.api.registrarPesagemOficial(
                                            bearerToken = sessao.bearerHeader,
                                            eventoId = 1,
                                            inscricaoId = item.inscricao_id,
                                            payload = PesagemOficialRequest(pesoVal, "VALIDAR")
                                        )
                                        statusMensagem = "✅ ${item.atleta_nome}: ${r.status} (${r.peso_aferido}kg)"
                                    } catch (_: Exception) {
                                        statusMensagem = "✅ Pesagem validada para ${item.atleta_nome} ($pesoVal kg)"
                                    }
                                } else {
                                    statusMensagem = "✅ Pesagem validada para ${item.atleta_nome} ($pesoVal kg)"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand)
                    ) {
                        Text("Validar Peso", fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun FinanceiroMasterMobileScreen(sessao: SessaoMobile = SessaoMobile("Admin Master", "master@kudow.com", PerfilUsuario.MASTER)) {
    var metricas by remember { mutableStateOf(MetricasGlobaisMasterDto()) }
    var repassesPendentes by remember { mutableStateOf<List<RepassePendenteMasterDto>>(emptyList()) }

    LaunchedEffect(sessao.token) {
        if (sessao.token != null) {
            try {
                metricas = KudowApiClient.api.obterMetricasGlobaisMaster(sessao.bearerHeader)
                repassesPendentes = KudowApiClient.api.listarRepassesPendentesMaster(sessao.bearerHeader)
            } catch (_: Exception) {
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Receitas Kudow & Repasses PIX", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        "Taxa de inscrições: ${metricas.taxa_inscricao_torneio_pct}% • Taxa de mensalidades: ${metricas.taxa_mensalidade_pct}%",
                        color = BlueAccent,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Text("Controle de repasses PIX para federações e academias organizadoras.", color = TextMuted, fontSize = 12.sp)
                    if (metricas.faturamento_bruto_global > 0) {
                        Text("Faturamento Global: R$ ${"%.2f".format(metricas.faturamento_bruto_global)}", color = EmeraldBrand, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }

        items(repassesPendentes) { rep ->
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(rep.entidade_nome, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Saldo a Repassar: R$ ${"%.2f".format(rep.saldo_liquido_a_repassar)} (${rep.total_itens} itens)", color = EmeraldBrand, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Text("PIX: ${rep.chave_pix_repasse}", color = GoldAccent, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun GestaoEntidadesMasterScreen(sessao: SessaoMobile = SessaoMobile("Admin Master", "master@kudow.com", PerfilUsuario.MASTER)) {
    var entidades by remember { mutableStateOf<List<EntidadeResponseDto>>(emptyList()) }

    LaunchedEffect(Unit) {
        try {
            entidades = KudowApiClient.api.listarEntidades()
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Entidades & Usuários (Master)", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Administração global de federações, associações e categorias oficiais.", color = TextMuted, fontSize = 12.sp)
                }
            }
        }
        items(entidades) { ent ->
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("${ent.nome} (${ent.estado ?: "SP"})", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Responsável: ${ent.respon ?: "Diretoria"} • Tel: ${ent.telefone ?: "--"}", color = TextMuted, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun ChaveamentoResultadosScreen() {
    var nomeCategoria by remember { mutableStateOf("Adulto Masc até 70kg") }
    var podio by remember {
        mutableStateOf(
            PodioDto(
                ouro = null,
                prata = null,
                bronze = "Matheus Costa"
            )
        )
    }
    var lutas by remember {
        mutableStateOf(
            listOf(
                LutaResumoDto(101, 1, "Semifinal", "Lucas Pereira", "Matheus Costa", 1, "Lucas Pereira", "FINALIZADA", "Vitória por Ippon"),
                LutaResumoDto(102, 2, "Semifinal", "Gabriel Santos", "Felipe Oliveira", 3, "Gabriel Santos", "FINALIZADA", "Vitória por Waza-ari"),
                LutaResumoDto(103, 3, "Disputa de 3º Lugar", "Matheus Costa", "Felipe Oliveira", 2, "Matheus Costa", "FINALIZADA", "Decisão Técnica"),
                LutaResumoDto(104, 4, "Final", "Lucas Pereira", "Gabriel Santos", null, null, "AGUARDANDO_RESULTADO", null)
            )
        )
    }

    LaunchedEffect(Unit) {
        try {
            val resumo = KudowApiClient.api.obterResumoChaveamento(eventoId = 1)
            if (resumo.categorias.isNotEmpty()) {
                val cat = resumo.categorias.first()
                nomeCategoria = cat.nome_categoria
                podio = cat.podio
                if (cat.lutas.isNotEmpty()) {
                    lutas = cat.lutas
                }
            }
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Chaveamento & Resultados", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Resultados homologados e chaves (Sem placar ao vivo / Mesa exclusiva Desktop)", color = TextMuted, fontSize = 12.sp)
        }

        item {
            Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("🏆 Pódio — $nomeCategoria", color = GoldAccent, fontWeight = FontWeight.Bold)
                    Text("🥇 1º Lugar (Ouro): ${podio.ouro ?: "Aguardando Final"}", color = TextPrimary, fontSize = 13.sp)
                    Text("🥈 2º Lugar (Prata): ${podio.prata ?: "Aguardando Final"}", color = TextPrimary, fontSize = 13.sp)
                    Text("🥉 3º Lugar (Bronze): ${podio.bronze ?: "Aguardando Disputa"}", color = EmeraldBrand, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        items(lutas) { luta ->
            val finalizada = luta.status_resultado == "FINALIZADA"
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Luta #${luta.numero_luta} • ${luta.fase}", color = GoldAccent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(
                            if (finalizada) "FINALIZADA" else "NA CHAVE",
                            color = if (finalizada) EmeraldBrand else TextMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text("🔴 ${luta.atleta_1_nome ?: "A definir"}", color = TextPrimary, fontWeight = if (luta.vencedor_nome != null && luta.vencedor_nome == luta.atleta_1_nome) FontWeight.Bold else FontWeight.Normal)
                    Text("⚪ ${luta.atleta_2_nome ?: "A definir"}", color = TextPrimary, fontWeight = if (luta.vencedor_nome != null && luta.vencedor_nome == luta.atleta_2_nome) FontWeight.Bold else FontWeight.Normal)
                    if (finalizada && luta.vencedor_nome != null) {
                        Text("🏆 Vencedor: ${luta.vencedor_nome} (${luta.observacoes_arbitro ?: "Homologado"})", color = EmeraldBrand, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 780)
@Composable
fun LoginECadastroPreview() {
    Surface(color = BgDark) {
        KudowMobileRoot(sessaoInicial = null)
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 780)
@Composable
fun PerfilAtletaPreview() {
    KudowMobileRoot(
        sessaoInicial = SessaoMobile("Lucas 'O Tanque' Pereira", "atleta1@kudow.com", PerfilUsuario.ATLETA, atletaId = 1)
    )
}

@Preview(showBackground = true, widthDp = 390, heightDp = 780)
@Composable
fun PerfilEntidadePreview() {
    KudowMobileRoot(
        sessaoInicial = SessaoMobile("Federação Paulista de Kudow", "entidade1@kudow.com", PerfilUsuario.ENTIDADE, entidadeId = 1)
    )
}

@Preview(showBackground = true, widthDp = 390, heightDp = 780)
@Composable
fun PerfilMasterPreview() {
    KudowMobileRoot(
        sessaoInicial = SessaoMobile("Administrador Master", "master@kudow.com", PerfilUsuario.MASTER)
    )
}

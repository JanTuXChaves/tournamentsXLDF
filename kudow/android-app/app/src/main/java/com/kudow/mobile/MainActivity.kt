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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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
    MASTER("MASTER")
}

data class SessaoMobile(
    val nome: String,
    val email: String,
    val perfil: PerfilUsuario,
    val atletaId: Int? = null,
    val entidadeId: Int? = null
)

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
    var modoCadastro by remember { mutableStateOf(false) }
    var tipoCadastro by remember { mutableStateOf(PerfilUsuario.ATLETA) }
    var email by remember { mutableStateOf("") }
    var senha by remember { mutableStateOf("") }
    var nome by remember { mutableStateOf("") }
    var cpfOuTelefone by remember { mutableStateOf("") }
    var peso by remember { mutableStateOf("68.5") }
    var faixa by remember { mutableStateOf("Preta") }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Text("🥋 Kudow Mobile", color = EmeraldBrand, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
            Text(
                if (modoCadastro) "Crie sua conta de Atleta ou Academia" else "Acesse sua conta para inscrições, chaves e pagamentos",
                color = TextMuted,
                fontSize = 13.sp
            )
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

        item {
            Button(
                onClick = {
                    val perfilEscolhido = if (modoCadastro) tipoCadastro else PerfilUsuario.ATLETA
                    onLoginSuccess(
                        SessaoMobile(
                            nome = nome.ifBlank { "Lucas 'O Tanque' Pereira" },
                            email = email.ifBlank { "atleta1@kudow.com" },
                            perfil = perfilEscolhido,
                            atletaId = if (perfilEscolhido == PerfilUsuario.ATLETA) 1 else null,
                            entidadeId = if (perfilEscolhido == PerfilUsuario.ENTIDADE) 1 else null
                        )
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    if (modoCadastro) "Concluir Cadastro e Entrar" else "Acessar Aplicativo",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        if (!modoCadastro) {
            item {
                Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Acesso Rápido por Perfil (Demonstração):", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(
                                onClick = {
                                    onLoginSuccess(SessaoMobile("Lucas 'O Tanque' Pereira", "atleta1@kudow.com", PerfilUsuario.ATLETA, atletaId = 1))
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("🥋 Atleta", fontSize = 11.sp, color = EmeraldBrand) }

                            OutlinedButton(
                                onClick = {
                                    onLoginSuccess(SessaoMobile("Federação Paulista", "entidade1@kudow.com", PerfilUsuario.ENTIDADE, entidadeId = 1))
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("🏛️ Entidade", fontSize = 11.sp, color = GoldAccent) }

                            OutlinedButton(
                                onClick = {
                                    onLoginSuccess(SessaoMobile("Admin Master", "master@kudow.com", PerfilUsuario.MASTER))
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
                            "Perfil: ${sessao.perfil.label} • Modo Mobile",
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
                    0 -> InscricaoTorneioAtletaScreen()
                    1 -> ChaveamentoResultadosScreen()
                    2 -> PagamentosAtletaScreen()
                    3 -> CarteirinhaAtletaScreen()
                }
                PerfilUsuario.ENTIDADE -> when (abaSelecionada) {
                    0 -> InscricaoLoteEntidadeScreen()
                    1 -> ChaveamentoResultadosScreen()
                    2 -> FinanceiroEntidadeScreen()
                    3 -> GestaoAtletasEntidadeScreen()
                }
                PerfilUsuario.MASTER -> when (abaSelecionada) {
                    0 -> PesagemOficialMobileScreen()
                    1 -> ChaveamentoResultadosScreen()
                    2 -> FinanceiroMasterMobileScreen()
                    3 -> GestaoEntidadesMasterScreen()
                }
            }
        }
    }
}

@Composable
fun InscricaoTorneioAtletaScreen() {
    val categoriasElegiveis = remember {
        listOf(
            CategoriaElegivelDto(5, "Adulto Masc até 70kg", "PENA", "MASCULINO", 0.0, 70.0, "NATURAL"),
            CategoriaElegivelDto(6, "Adulto Masc até 85kg", "MEDIO", "MASCULINO", 70.1, 85.0, "ACIMA"),
            CategoriaElegivelDto(7, "Adulto Masc Acima 85kg", "PESADO", "MASCULINO", 85.1, 150.0, "ACIMA"),
            CategoriaElegivelDto(8, "Adulto Masc Absoluto", "ABSOLUTO", "MASCULINO", 0.0, 150.0, "ACIMA")
        )
    }
    var categoriaSelecionadaId by remember { mutableIntStateOf(5) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Inscrição em Torneio", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Grand Prix Kudow Adulto 2026 • Ginásio Ibirapuera - SP", color = TextMuted, fontSize = 12.sp)
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Seu Peso Cadastrado: 68.5 kg (Adulto Masculino)", color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
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
                        Text("Limite: até ${cat.peso_maximo}kg", color = TextMuted, fontSize = 12.sp)
                    }
                    RadioButton(selected = selecionada, onClick = { categoriaSelecionadaId = cat.codcat })
                }
            }
        }

        item {
            Button(
                onClick = {},
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand),
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Confirmar Inscrição (R$ 80,00)", fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

@Composable
fun PagamentosAtletaScreen() {
    val faturas = remember {
        listOf(
            FaturaAtletaDto(1, "INSCRICAO_TORNEIO", "Inscrição: Grand Prix Kudow 2026", 80.0, "PENDENTE", "00020126580014BR.GOV.BCB.PIX..."),
            FaturaAtletaDto(2, "MENSALIDADE", "Mensalidade Academia - 11/2026", 120.0, "PAGO", null)
        )
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
                        Text(fat.descricao, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(fat.status, color = if (pendente) GoldAccent else EmeraldBrand, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    Text("R$ ${"%.2f".format(fat.valor)}", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    if (pendente) {
                        Button(
                            onClick = {},
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("📋 Copiar Código PIX (Copia e Cola)", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CarteirinhaAtletaScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Minha Carteirinha Digital", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("🥋 Lucas 'O Tanque' Pereira", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("CPF: ***.301.301-01 • Faixa Preta • 68.5 kg", color = TextMuted, fontSize = 13.sp)
                Text("Academia: Federação Paulista de Kudow (SP)", color = EmeraldBrand, fontSize = 13.sp)
                Text("Status para Competição: REGULAR ✅", color = EmeraldBrand, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun InscricaoLoteEntidadeScreen() {
    val alunos = listOf(
        "Lucas 'O Tanque' Pereira (68.5kg) -> Adulto Masc até 70kg [Natural]",
        "Matheus 'Fúria' Costa (74.0kg) -> Adulto Masc até 85kg [Natural]",
        "Gabriel 'Imparável' Santos (69.0kg) -> Adulto Masc até 85kg [Categoria Acima]"
    )
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Inscrever Alunos da Academia", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Inscreva seus atletas filiados na categoria natural ou em categoria acima", color = TextMuted, fontSize = 12.sp)
        }
        items(alunos) { aluno ->
            Surface(color = CardDark, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(aluno, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Button(
                        onClick = {},
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldBrand)
                    ) { Text("Inscrever", fontSize = 11.sp, color = Color.White) }
                }
            }
        }
    }
}

@Composable
fun FinanceiroEntidadeScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Financeiro & Repasses da Entidade", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Saldo Aguardando Repasse", color = TextMuted, fontSize = 12.sp)
                Text("R$ 1.840,00", color = EmeraldBrand, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                Text("Chave PIX Cadastrada: CNPJ 12.345.678/0001-90", color = GoldAccent, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun GestaoAtletasEntidadeScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Meus Atletas Filiados", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("32 Atletas Ativos na Federação Paulista", color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Gerencie cadastros, graduações e bloqueio por inadimplência.", color = TextMuted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun PesagemOficialMobileScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Balança & Pesagem Oficial", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Conferência Rápida na Balança", color = GoldAccent, fontWeight = FontWeight.Bold)
                Text("Valide o peso aferido do atleta ou reenquadre automaticamente para a categoria superior antes de gerar as chaves.", color = TextMuted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun FinanceiroMasterMobileScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Receitas Kudow & Repasses PIX", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Taxa de inscrições: 8% • Taxa de mensalidades: 5%", color = BlueAccent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text("Controle de repasses PIX para federações e academias organizadoras.", color = TextMuted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun GestaoEntidadesMasterScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Entidades & Usuários (Master)", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Surface(color = CardDark, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Administração global de federações, associações e categorias oficiais.", color = TextMuted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun ChaveamentoResultadosScreen() {
    val lutas = remember {
        listOf(
            LutaResumoDto(101, 1, "Semifinal", "Lucas Pereira", "Matheus Costa", 1, "Lucas Pereira", "FINALIZADA", "Vitória por Ippon"),
            LutaResumoDto(102, 2, "Semifinal", "Gabriel Santos", "Felipe Oliveira", 3, "Gabriel Santos", "FINALIZADA", "Vitória por Waza-ari"),
            LutaResumoDto(103, 3, "Disputa de 3º Lugar", "Matheus Costa", "Felipe Oliveira", 2, "Matheus Costa", "FINALIZADA", "Decisão Técnica"),
            LutaResumoDto(104, 4, "Final", "Lucas Pereira", "Gabriel Santos", null, null, "AGUARDANDO_RESULTADO", null)
        )
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
                    Text("🏆 Pódio — Adulto Masc até 70kg", color = GoldAccent, fontWeight = FontWeight.Bold)
                    Text("🥇 1º Lugar (Ouro): Aguardando Final", color = TextPrimary, fontSize = 13.sp)
                    Text("🥈 2º Lugar (Prata): Aguardando Final", color = TextPrimary, fontSize = 13.sp)
                    Text("🥉 3º Lugar (Bronze): Matheus Costa", color = EmeraldBrand, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
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
                    Text("🔴 ${luta.atleta_1_nome ?: "A definir"}", color = TextPrimary, fontWeight = if (luta.vencedor_nome == luta.atleta_1_nome) FontWeight.Bold else FontWeight.Normal)
                    Text("⚪ ${luta.atleta_2_nome ?: "A definir"}", color = TextPrimary, fontWeight = if (luta.vencedor_nome == luta.atleta_2_nome) FontWeight.Bold else FontWeight.Normal)
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

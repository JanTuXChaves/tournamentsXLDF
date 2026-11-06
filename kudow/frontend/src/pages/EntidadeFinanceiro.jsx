import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DollarSign, ArrowLeft, TrendingUp, Calendar, CreditCard, CheckCircle2, Clock, AlertCircle, Send, Landmark, Receipt, Zap, UserCheck, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const EntidadeFinanceiro = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const entidadeId = id ? parseInt(id, 10) : user?.entidade_id;

    const [activeTab, setActiveTab] = useState('extrato');
    const [resumo, setResumo] = useState(null);
    const [extrato, setExtrato] = useState([]);
    const [loading, setLoading] = useState(true);

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const [mesReferencia, setMesReferencia] = useState(mesAtual);
    const [valorEmissao, setValorEmissao] = useState('');
    const [diaVencimentoEmissao, setDiaVencimentoEmissao] = useState(10);
    const [gerandoLote, setGerandoLote] = useState(false);

    const [dadosBancarios, setDadosBancarios] = useState({
        chave_pix_repasse: '',
        tipo_chave_pix_repasse: 'CNPJ',
        titular_conta_repasse: '',
        valor_mensalidade_padrao: 120,
        dia_vencimento_mensalidade: 10
    });
    const [salvandoBancarios, setSalvandoBancarios] = useState(false);

    const carregarDados = async () => {
        if (!entidadeId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [resumoRes, extratoRes] = await Promise.all([
                api.get(`/financeiro/entidades/${entidadeId}/resumo`),
                api.get(`/financeiro/entidades/${entidadeId}/extrato`)
            ]);

            setResumo(resumoRes.data);
            setExtrato(extratoRes.data);

            setDadosBancarios({
                chave_pix_repasse: resumoRes.data.chave_pix_repasse || '',
                tipo_chave_pix_repasse: resumoRes.data.tipo_chave_pix_repasse || 'CNPJ',
                titular_conta_repasse: resumoRes.data.titular_conta_repasse || '',
                valor_mensalidade_padrao: resumoRes.data.valor_mensalidade_padrao || 120,
                dia_vencimento_mensalidade: resumoRes.data.dia_vencimento_mensalidade || 10
            });
            setValorEmissao(resumoRes.data.valor_mensalidade_padrao || 120);
            setDiaVencimentoEmissao(resumoRes.data.dia_vencimento_mensalidade || 10);
        } catch (error) {
            console.error("Erro ao carregar módulo financeiro:", error);
            alert("Erro ao carregar dados financeiros da entidade.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [entidadeId]);

    const handleSalvarBancarios = async (e) => {
        e.preventDefault();
        setSalvandoBancarios(true);
        try {
            await api.put(`/financeiro/entidades/${entidadeId}/dados-bancarios`, dadosBancarios);
            alert("Dados bancários e configurações atualizadas com sucesso!");
            carregarDados();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao salvar dados bancários.");
        } finally {
            setSalvandoBancarios(false);
        }
    };

    const handleGerarLote = async (e) => {
        e.preventDefault();
        setGerandoLote(true);
        try {
            const res = await api.post(`/financeiro/entidades/${entidadeId}/gerar-mensalidades-lote`, {
                mes_referencia: mesReferencia,
                valor: parseFloat(valorEmissao),
                dia_vencimento: parseInt(diaVencimentoEmissao)
            });
            alert(res.data.mensagem);
            carregarDados();
            setActiveTab('extrato');
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao emitir cobranças em lote.");
        } finally {
            setGerandoLote(false);
        }
    };

    const handleBaixaManual = async (mensalidadeId) => {
        if (!window.confirm("Confirmar baixa manual desta mensalidade como recebida no balcão/dinheiro?")) return;
        try {
            await api.post(`/financeiro/mensalidades/${mensalidadeId}/dar-baixa-manual`);
            alert("Baixa manual registrada com sucesso!");
            carregarDados();
        } catch (error) {
            alert("Erro ao dar baixa manual.");
        }
    };

    const formatarMoeda = (val) => `R$ ${parseFloat(val || 0).toFixed(2).replace('.', ',')}`;

    const formatarData = (dt) => {
        if (!dt) return '-';
        const d = new Date(dt);
        return d.toLocaleDateString('pt-BR');
    };

    if (loading) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando painel financeiro da academia...</div>;
    }

    return (
        <div style={{ maxWidth: '1250px', margin: '0 auto' }}>

            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate(-1)}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem', background: 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="card glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Gestão Financeira & Repasses Kudow
                        </div>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: '2rem', margin: '0.2rem 0 0 0', fontWeight: 800 }}>
                            {resumo?.entidade_nome || 'Academia'}
                        </h1>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Recebimento centralizado com repasses automáticos via PIX para sua conta.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setActiveTab('emissao')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                        >
                            <Zap size={18} /> Emitir Mensalidades do Mês
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

                <div className="card glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981', position: 'relative' }}>
                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Landmark size={18} /> Saldo Líquido a Receber
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#10b981', margin: '0.4rem 0' }}>
                        {formatarMoeda(resumo?.saldo_liquido_disponivel)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Pronto para repasse PIX da Kudow
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CreditCard size={18} /> Faturamento Bruto
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                        {formatarMoeda(resumo?.faturamento_bruto_total)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Total pago por atletas
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Receipt size={18} /> Taxa Plataforma (5% / 8%)
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', margin: '0.4rem 0' }}>
                        {formatarMoeda(resumo?.taxa_kudow_retida_total)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Intermediação Mercado Pago + Sistema
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={18} /> Total Já Repassado
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-secondary)', margin: '0.4rem 0' }}>
                        {formatarMoeda(resumo?.saldo_ja_repassado)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Transferido via PIX para sua conta
                    </div>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('extrato')}
                        style={{
                            flex: 1,
                            padding: '1.1rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'extrato' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                            color: activeTab === 'extrato' ? 'var(--brand-primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'extrato' ? 700 : 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Receipt size={18} /> Extrato & Cobranças ({extrato.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('emissao')}
                        style={{
                            flex: 1,
                            padding: '1.1rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'emissao' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                            color: activeTab === 'emissao' ? 'var(--brand-primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'emissao' ? 700 : 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Zap size={18} /> Emissão de Mensalidades em Lote
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('bancarios')}
                        style={{
                            flex: 1,
                            padding: '1.1rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'bancarios' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                            color: activeTab === 'bancarios' ? 'var(--brand-primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'bancarios' ? 700 : 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Landmark size={18} /> Chave PIX & Dados de Repasse
                    </button>
                </div>

                {activeTab === 'extrato' && (
                    <div style={{ padding: '0' }}>
                        {extrato.length === 0 ? (
                            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Receipt size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                                <h3>Nenhuma cobrança ou transação encontrada</h3>
                                <p>Clique na aba "Emissão em Lote" para gerar as primeiras mensalidades dos atletas.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Data / Ref</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Atleta</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Tipo</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Valor Bruto</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Taxa Kudow</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#10b981' }}>Seu Ganho Líquido</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Forma</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Status Pagamento</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Status Repasse</th>
                                            <th style={{ padding: '1rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extrato.map((item) => {
                                            const isPago = item.status_pagamento === 'PAGO';
                                            const isRepassado = item.status_repasse === 'REPASSADO';

                                            return (
                                                <tr key={`${item.tipo}_${item.id}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        <div>{item.referencia}</div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatarData(item.created_at)}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                                                        {item.atleta_nome}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem' }}>
                                                        <span style={{
                                                            backgroundColor: item.tipo === 'MENSALIDADE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                            color: item.tipo === 'MENSALIDADE' ? '#3b82f6' : '#f59e0b',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            fontWeight: 700
                                                        }}>
                                                            {item.tipo === 'MENSALIDADE' ? 'MENSALIDADE' : 'TORNEIO'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>
                                                        {formatarMoeda(item.valor_bruto)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', color: '#ef4444', fontSize: '0.85rem' }}>
                                                        - {formatarMoeda(item.taxa_kudow)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                                                        {formatarMoeda(item.valor_liquido_entidade)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {item.forma_pagamento || 'PIX'}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        {isPago ? (
                                                            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                                ✓ PAGO
                                                            </span>
                                                        ) : (
                                                            <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                                PENDENTE
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        {isRepassado ? (
                                                            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                                                                ✓ Repassado
                                                            </span>
                                                        ) : isPago ? (
                                                            <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700 }}>
                                                                ⏳ A Repassar
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                                -
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                        {!isPago && item.tipo === 'MENSALIDADE' && (
                                                            <button
                                                                className="btn btn-secondary"
                                                                onClick={() => handleBaixaManual(item.id)}
                                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                                                title="Dar baixa caso o atleta tenha pago em dinheiro no balcão"
                                                            >
                                                                Baixa Manual
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'emissao' && (
                    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <Zap size={40} color="var(--brand-primary)" style={{ marginBottom: '0.5rem' }} />
                            <h2 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Emissão de Mensalidades em Lote</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                O sistema gerará automaticamente uma fatura para todos os <strong>{resumo?.total_atletas || 0} atletas ativos</strong> vinculados à sua academia, com QR Code PIX oficial do Mercado Pago.
                            </p>
                        </div>

                        <form onSubmit={handleGerarLote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Mês de Referência (Ano-Mês)</label>
                                <input
                                    type="month"
                                    required
                                    value={mesReferencia}
                                    onChange={e => setMesReferencia(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Valor da Mensalidade (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={valorEmissao}
                                        onChange={e => setValorEmissao(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Dia do Vencimento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required
                                        value={diaVencimentoEmissao}
                                        onChange={e => setDiaVencimentoEmissao(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '1rem 1.25rem', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                    Simulação de Ganhos por Atleta:
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Valor Cobrado do Atleta:</span>
                                    <strong>{formatarMoeda(valorEmissao)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#ef4444' }}>
                                    <span>Taxa de Plataforma Kudow (5%):</span>
                                    <span>- {formatarMoeda(parseFloat(valorEmissao || 0) * 0.05)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: '#10b981', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                    <span>Seu Repasse Líquido por Atleta:</span>
                                    <span>{formatarMoeda(parseFloat(valorEmissao || 0) * 0.95)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={gerandoLote}
                                style={{ padding: '0.9rem', fontSize: '1.05rem', fontWeight: 800, marginTop: '0.5rem' }}
                            >
                                {gerandoLote ? 'Emitindo cobranças...' : `⚡ Emitir Mensalidades para ${resumo?.total_atletas || 0} Atletas`}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'bancarios' && (
                    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <Landmark size={40} color="var(--brand-primary)" style={{ marginBottom: '0.5rem' }} />
                            <h2 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Chave PIX de Recebimento de Repasses</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                Cadastre a chave PIX onde você deseja receber as transferências dos saldos líquidos das mensalidades e taxas da sua academia.
                            </p>
                        </div>

                        <form onSubmit={handleSalvarBancarios} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Tipo de Chave PIX</label>
                                <select
                                    value={dadosBancarios.tipo_chave_pix_repasse}
                                    onChange={e => setDadosBancarios({ ...dadosBancarios, tipo_chave_pix_repasse: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                >
                                    <option value="CNPJ">CNPJ</option>
                                    <option value="CPF">CPF</option>
                                    <option value="EMAIL">E-mail</option>
                                    <option value="TELEFONE">Telefone Celular</option>
                                    <option value="ALEATORIA">Chave Aleatória (EVP)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Chave PIX</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Informe sua chave PIX"
                                    value={dadosBancarios.chave_pix_repasse}
                                    onChange={e => setDadosBancarios({ ...dadosBancarios, chave_pix_repasse: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Nome do Titular da Conta Bancária</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Associação de Judô Kudow"
                                    value={dadosBancarios.titular_conta_repasse}
                                    onChange={e => setDadosBancarios({ ...dadosBancarios, titular_conta_repasse: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Mensalidade Padrão (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={dadosBancarios.valor_mensalidade_padrao}
                                        onChange={e => setDadosBancarios({ ...dadosBancarios, valor_mensalidade_padrao: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Vencimento Padrão (Dia)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required
                                        value={dadosBancarios.dia_vencimento_mensalidade}
                                        onChange={e => setDadosBancarios({ ...dadosBancarios, dia_vencimento_mensalidade: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={salvandoBancarios}
                                style={{ padding: '0.9rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}
                            >
                                {salvandoBancarios ? 'Salvando...' : 'Salvar Dados de Repasse'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntidadeFinanceiro;

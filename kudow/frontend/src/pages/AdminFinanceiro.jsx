import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Landmark, Send, CheckCircle2, Receipt, ShieldCheck, ArrowLeft, Building2, UploadCloud, X } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const AdminFinanceiro = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [metricas, setMetricas] = useState(null);
    const [repassesPendentes, setRepassesPendentes] = useState([]);
    const [historicoRepasses, setHistoricoRepasses] = useState([]);
    const [taxaMensalidade, setTaxaMensalidade] = useState(5.0);
    const [taxaTorneio, setTaxaTorneio] = useState(8.0);
    const [salvandoTaxas, setSalvandoTaxas] = useState(false);
    const [loading, setLoading] = useState(true);

    const [modalRepasse, setModalRepasse] = useState(null);
    const [comprovanteUrl, setComprovanteUrl] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [executando, setExecutando] = useState(false);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [metricasRes, pendentesRes, historicoRes] = await Promise.all([
                api.get('/financeiro/admin/metricas-globais'),
                api.get('/financeiro/admin/repasses-pendentes'),
                api.get('/financeiro/admin/historico-repasses').catch(() => ({ data: [] }))
            ]);
            setMetricas(metricasRes.data);
            setTaxaMensalidade(metricasRes.data?.taxa_mensalidade_pct ?? 5.0);
            setTaxaTorneio(metricasRes.data?.taxa_inscricao_torneio_pct ?? 8.0);
            setRepassesPendentes(pendentesRes.data);
            setHistoricoRepasses(historicoRes.data || []);
        } catch (error) {
            console.error("Erro ao carregar módulo financeiro master:", error);
            alert("Erro ao carregar dados financeiros da administração.");
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarTaxas = async (e) => {
        e.preventDefault();
        setSalvandoTaxas(true);
        try {
            await api.put('/financeiro/admin/configuracoes-taxas', {
                taxa_mensalidade_pct: parseFloat(taxaMensalidade),
                taxa_inscricao_torneio_pct: parseFloat(taxaTorneio)
            });
            alert("Taxas de split da plataforma Kudow atualizadas com sucesso!");
            carregarDados();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao atualizar taxas.");
        } finally {
            setSalvandoTaxas(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const handleConfirmarRepasse = async (e) => {
        e.preventDefault();
        setExecutando(true);
        try {
            await api.post('/financeiro/admin/executar-repasse', {
                entidade_id: modalRepasse.entidade_id,
                valor_total: modalRepasse.saldo_liquido_a_repassar,
                chave_pix_utilizada: modalRepasse.chave_pix_repasse,
                comprovante_pix_url: comprovanteUrl,
                observacoes: observacoes
            });
            alert(`Repasse de R$ ${modalRepasse.saldo_liquido_a_repassar.toFixed(2)} registrado com sucesso!`);
            setModalRepasse(null);
            setComprovanteUrl('');
            setObservacoes('');
            carregarDados();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao executar repasse.");
        } finally {
            setExecutando(false);
        }
    };

    const formatarMoeda = (val) => `R$ ${parseFloat(val || 0).toFixed(2).replace('.', ',')}`;

    if (loading) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados financeiros da plataforma...</div>;
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

                <div className="card glass-panel" style={{ padding: '1.5rem 2rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Administração Central Kudow
                    </div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '2.1rem', margin: '0.2rem 0 0 0', fontWeight: 800 }}>
                        Gestão Global de Repasses & Receita
                    </h1>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        Receita Kudow (Taxas Retidas)
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#10b981', margin: '0.4rem 0' }}>
                        {formatarMoeda(metricas?.receita_taxas_kudow)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Taxas de {metricas?.taxa_mensalidade_pct ?? 5}% mensalidades / {metricas?.taxa_inscricao_torneio_pct ?? 8}% torneios
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        Volume Total Transacionado
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                        {formatarMoeda(metricas?.faturamento_bruto_global)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Recebido via Mercado Pago
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Já Repassado a Academias
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-secondary)', margin: '0.4rem 0' }}>
                        {formatarMoeda(metricas?.total_repassado_entidades)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Transferências PIX liquidadas
                    </div>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <Landmark size={20} color="var(--brand-primary)" />
                        Academias com Saldos Líquidos Aguardando Repasse PIX ({repassesPendentes.length})
                    </h3>
                </div>

                <div style={{ padding: 0 }}>
                    {repassesPendentes.length === 0 ? (
                        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '0.75rem' }} />
                            <h3>Todos os repasses estão em dia!</h3>
                            <p>Nenhuma academia possui saldo líquido acumulado pendente de transferência.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Academia / Entidade</th>
                                        <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Titular da Conta</th>
                                        <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Chave PIX Cadastrada</th>
                                        <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Itens Quitados</th>
                                        <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#10b981' }}>Saldo Líquido a Transferir</th>
                                        <th style={{ padding: '1rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {repassesPendentes.map((ent) => (
                                        <tr key={ent.entidade_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {ent.entidade_nome}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                                                {ent.titular_conta_repasse}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    {ent.tipo_chave_pix_repasse}: {ent.chave_pix_repasse}
                                                </code>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                                                {ent.total_itens} faturas
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', color: '#10b981', fontWeight: 900, fontSize: '1.1rem' }}>
                                                {formatarMoeda(ent.saldo_liquido_a_repassar)}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => setModalRepasse(ent)}
                                                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                                                >
                                                    <Send size={14} /> Realizar Repasse PIX
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <ShieldCheck size={20} color="var(--brand-primary)" /> Configurar Split & Taxas da Plataforma
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                        Defina os percentuais retidos automaticamente pela Kudow em cada cobrança liquidada via Mercado Pago.
                    </p>
                    <form onSubmit={handleSalvarTaxas} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Taxa s/ Mensalidades (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="50"
                                    value={taxaMensalidade}
                                    onChange={(e) => setTaxaMensalidade(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Taxa s/ Inscrição de Torneios (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="50"
                                    value={taxaTorneio}
                                    onChange={(e) => setTaxaTorneio(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700 }}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={salvandoTaxas} style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', fontWeight: 700 }}>
                            {salvandoTaxas ? 'Salvando...' : 'Salvar Percentuais de Taxa'}
                        </button>
                    </form>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <Receipt size={20} color="#10b981" /> Histórico de Repasses Liquidados ({historicoRepasses.length})
                    </h3>
                    {historicoRepasses.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum lote de repasse registrado até o momento.</p>
                    ) : (
                        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {historicoRepasses.map(rep => (
                                <div key={rep.id} style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                            #{rep.id} • {rep.entidade_nome}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            PIX: {rep.chave_pix_utilizada} • {rep.data_repasse ? new Date(rep.data_repasse).toLocaleDateString('pt-BR') : ''}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                                            {formatarMoeda(rep.valor_total)}
                                        </div>
                                        {rep.comprovante_pix_url && (
                                            <a href={rep.comprovante_pix_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}>
                                                Ver Comprovante
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {modalRepasse && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '520px',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Liquidar Repasse PIX</h3>
                            <button onClick={() => setModalRepasse(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmarRepasse} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Academia Beneficiária:</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>{modalRepasse.entidade_nome}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Titular: {modalRepasse.titular_conta_repasse}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', fontWeight: 700, marginTop: '0.25rem' }}>
                                    Chave PIX: {modalRepasse.chave_pix_repasse} ({modalRepasse.tipo_chave_pix_repasse})
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Valor Total a Transferir:</span>
                                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                                    {formatarMoeda(modalRepasse.saldo_liquido_a_repassar)}
                                </span>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Link do Comprovante de Transferência PIX (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={comprovanteUrl}
                                    onChange={e => setComprovanteUrl(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Observações Internas</label>
                                <textarea
                                    rows="2"
                                    placeholder="Ex: Transferência efetuada via conta PJ Kudow..."
                                    value={observacoes}
                                    onChange={e => setObservacoes(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setModalRepasse(null)}
                                    style={{ flex: 1, padding: '0.75rem' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={executando}
                                    style={{ flex: 2, padding: '0.75rem', fontWeight: 800 }}
                                >
                                    {executando ? 'Registrando...' : 'Confirmar Repasse PIX'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFinanceiro;

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, RefreshCw, Award, Search } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const Ranking = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const anoAtual = new Date().getFullYear();

    const [ano, setAno] = useState(2026);
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recalculando, setRecalculando] = useState(false);
    const [busca, setBusca] = useState('');

    const canRecalcular = user?.tipo_usuario === 'MASTER' || user?.tipo_usuario === 'ENTIDADE';

    const carregarRanking = async (anoSelecionado = ano) => {
        setLoading(true);
        try {
            const res = await api.get(`/ranking/?ano=${anoSelecionado}`);
            setRanking(res.data || []);
        } catch (err) {
            console.error('Erro ao carregar ranking:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarRanking(ano);
    }, [ano]);

    const handleRecalcular = async () => {
        setRecalculando(true);
        try {
            await api.post(`/ranking/recalcular?ano=${ano}`);
            await carregarRanking(ano);
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao recalcular o ranking.');
        } finally {
            setRecalculando(false);
        }
    };

    const rankingFiltrado = ranking.filter(item =>
        (item.atleta_nome || '').toLowerCase().includes(busca.toLowerCase())
    );

    const top3 = rankingFiltrado.slice(0, 3);

    return (
        <div className="ranking-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Trophy size={28} color="#f59e0b" /> Ranking Oficial & Quadro de Medalhas
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                        Pontuação acumulada em lutas oficiais: Título (+10 pts), Vice (+5 pts), Bronze (+2 pts) e Vitória em combate (+3 pts).
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={ano}
                        onChange={(e) => setAno(Number(e.target.value))}
                        style={{
                            padding: '0.55rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: 600
                        }}
                    >
                        {[anoAtual - 1, anoAtual, 2026, 2027].filter((v, i, a) => a.indexOf(v) === i).sort().map(a => (
                            <option key={a} value={a}>Temporada {a}</option>
                        ))}
                    </select>

                    {canRecalcular && (
                        <button
                            className="btn btn-primary"
                            onClick={handleRecalcular}
                            disabled={recalculando}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RefreshCw size={16} className={recalculando ? 'spin-animation' : ''} />
                            {recalculando ? 'Recalculando...' : 'Atualizar Pontuação'}
                        </button>
                    )}
                </div>
            </div>

            {!loading && top3.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                    {top3.map((item, idx) => {
                        const cores = [
                            { cor: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: '1º Lugar Geral' },
                            { cor: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', label: '2º Lugar Geral' },
                            { cor: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', label: '3º Lugar Geral' }
                        ][idx];
                        return (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/atletas/${item.atleta_id}`)}
                                className="card glass-panel"
                                style={{
                                    borderTop: `3px solid ${cores.cor}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cores.cor, backgroundColor: cores.bg, padding: '0.25rem 0.65rem', borderRadius: '20px' }}>
                                        {cores.label}
                                    </span>
                                    <Award size={22} color={cores.cor} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{item.atleta_nome}</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.25rem' }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: cores.cor }}>{item.pontos} pts</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        🥇 {item.ouros} • 🥈 {item.pratas} • 🥉 {item.bronzes}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Classificação Completa ({rankingFiltrado.length})</h3>
                    <div style={{ position: 'relative', minWidth: '260px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar atleta no ranking..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Carregando classificação...</p>
                ) : rankingFiltrado.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                        <Medal size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                        <p style={{ margin: 0 }}>Nenhum resultado pontuado encontrado para a temporada {ano}.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '1rem 1.5rem' }}>Pos.</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Atleta</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Pontos</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Vitórias</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Derrotas</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>🥇 Ouro</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>🥈 Prata</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>🥉 Bronze</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingFiltrado.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/atletas/${item.atleta_id}`)}
                                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 800, color: index < 3 ? '#f59e0b' : 'var(--text-muted)' }}>
                                            #{index + 1}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {item.atleta_nome}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1.05rem' }}>
                                            {item.pontos}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                                            {item.vitorias}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {item.derrotas}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>
                                            {item.ouros}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 700, color: '#94a3b8' }}>
                                            {item.pratas}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 700, color: '#d97706' }}>
                                            {item.bronzes}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Ranking;


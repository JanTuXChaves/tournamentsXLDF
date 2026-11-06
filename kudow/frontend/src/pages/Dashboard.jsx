import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, Activity } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.tipo_usuario === 'ATLETA') {
            navigate('/eventos', { replace: true });
        }
    }, [user, navigate]);
    const [stats, setStats] = useState({
        totalAtletas: 0,
        totalEventos: 0,
        eventos: [],
        loading: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [atletasRes, eventosRes] = await Promise.all([
                    api.get('/atletas/'),
                    api.get('/eventos/')
                ]);

                setStats({
                    totalAtletas: atletasRes.data.length,
                    totalEventos: eventosRes.data.length,
                    eventos: eventosRes.data,
                    loading: false
                });
            } catch (error) {
                console.error("Erro ao buscar dados do Dashboard", error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();
    }, []);

    return (
        <div className="dashboard-page">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem' }}>Visão Geral</h1>
                <p style={{ color: 'var(--text-muted)' }}>Resumo das suas operações, atletas e torneios</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

                <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '0.75rem', color: 'var(--brand-primary)' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total de Atletas</p>
                        <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
                            {stats.loading ? '...' : stats.totalAtletas}
                        </h3>
                    </div>
                </div>

                <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: '0.75rem', color: 'var(--status-success)' }}>
                        <Trophy size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Eventos Criados</p>
                        <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
                            {stats.loading ? '...' : stats.totalEventos}
                        </h3>
                    </div>
                </div>

                <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: '0.75rem', color: 'var(--status-warning)' }}>
                        <Calendar size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Torneios Abertos</p>
                        <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
                            {stats.loading ? '...' : stats.eventos.filter(e => !e.data_fim || new Date(e.data_fim) >= new Date()).length}
                        </h3>
                    </div>
                </div>

                <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(6, 182, 212, 0.15)', borderRadius: '0.75rem', color: 'var(--brand-secondary)' }}>
                        <Activity size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Integração API</p>
                        <h3 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--status-success)' }}>
                            {stats.loading ? 'Aguardando..' : 'Online'}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Eventos Recentes</h3>
                    <button className="btn btn-secondary" onClick={() => navigate('/eventos')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Ver todos</button>
                </div>

                <div style={{ padding: '0' }}>
                    {stats.loading ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Sincronizando com o Backend FastAPI...</p>
                    ) : stats.eventos.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Nenhum evento cadastrado ainda no Kudow.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nome do Torneio</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Local</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Datas de Inscrição</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.eventos.slice(0, 5).map(evt => (
                                    <tr
                                        key={evt.codevent}
                                        onClick={() => navigate(`/eventos/${evt.codevent}`)}
                                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--brand-primary)' }}>{evt.evento}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{evt.local || '-'}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                                            {evt.data_inicio_inscricao ? `${evt.data_inicio_inscricao} a ${evt.data_fim_inscricao || 'N/A'}` : 'Indefinido'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span className="badge badge-success">Ativo</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

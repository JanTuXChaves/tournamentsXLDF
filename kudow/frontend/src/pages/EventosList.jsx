import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, MoreVertical, Calendar } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const EventosList = () => {
    const { user } = useContext(AuthContext);
    const isAtleta = user?.tipo_usuario === 'ATLETA';
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const carregarEventos = async () => {
            try {
                const response = await api.get('/eventos/');
                setEventos(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Erro ao carregar eventos", error);
                setLoading(false);
            }
        };
        carregarEventos();
    }, []);

    const eventosFiltrados = eventos.filter(evento =>
        evento.evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (evento.local && evento.local.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="eventos-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem' }}>Gestão de Torneios</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Crie campeonatos, gerencie as chaves e inscrições</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!isAtleta && (
                        <button className="btn btn-primary" onClick={() => navigate('/eventos/novo')} style={{ padding: '0.6rem 1.2rem' }}>
                            <Plus size={18} /> Novo Torneio
                        </button>
                    )}
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou local do evento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem',
                                backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.95rem'
                            }}
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <Filter size={18} /> Filtrar
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nome do Torneio</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Local</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Datas do Evento</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Inscrições</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados...</td></tr>
                            ) : eventosFiltrados.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum torneio encontrado.</td></tr>
                            ) : (
                                eventosFiltrados.map((evento) => (
                                    <tr key={evento.codevent} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                                                    <Calendar size={20} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 500, margin: 0 }}>{evento.evento}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>ID #{evento.codevent}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{evento.local || 'Não definido'}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <p style={{ fontSize: '0.9rem', margin: 0 }}>{evento.data_inicio} até {evento.data_fim || 'N/A'}</p>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>De {evento.data_inicio_inscricao || '-'} até {evento.data_fim_inscricao || '-'}</p>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--brand-secondary)' }}>Status: Aberto</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}
                                                onClick={() => navigate(`/eventos/${evento.codevent}`)}
                                                title="Ver / Gerenciar Evento"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EventosList;

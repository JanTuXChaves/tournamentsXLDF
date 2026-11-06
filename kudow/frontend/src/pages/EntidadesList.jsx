import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, Search, Trash2, Edit2, Shield, MapPin, Phone, User, X, Users, DollarSign } from 'lucide-react';
import api, { getMediaUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const EntidadesList = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [entidades, setEntidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [creating, setCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAtletasModal, setShowAtletasModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [atletasDoModal, setAtletasDoModal] = useState([]);
    const [loadingAtletasDoModal, setLoadingAtletasDoModal] = useState(false);
    const [atletaSearchTerm, setAtletaSearchTerm] = useState('');

    const [newEntityData, setNewEntityData] = useState({
        nome: '',
        ender: '',
        respon: '',
        telefone: '',
        tipo_entidade: 'ASSOCIACAO',
        estado: '',
        locais_treino: ''
    });

    useEffect(() => {

        if (user?.tipo_usuario !== 'MASTER') {
            navigate('/');
            return;
        }

        carregarEntidades();
    }, [user, navigate]);

    const carregarEntidades = async () => {
        setLoading(true);
        try {
            const response = await api.get('/entidades/');
            setEntidades(response.data);
        } catch (error) {
            console.error("Erro ao carregar entidades", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEntity = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/entidades/', newEntityData);
            setShowCreateModal(false);
            setNewEntityData({
                nome: '',
                ender: '',
                respon: '',
                telefone: '',
                tipo_entidade: 'ASSOCIACAO',
                estado: '',
                locais_treino: ''
            });
            alert("Entidade criada com sucesso!");
            carregarEntidades();
        } catch (error) {
            console.error("Erro ao criar entidade", error);
            if (error.response?.data?.detail) {
                alert(error.response.data.detail);
            } else {
                alert("Erro ao criar entidade.");
            }
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteEntity = async (codenti, nome) => {
        if (!window.confirm(`Tem certeza que deseja excluir a entidade "${nome}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            await api.delete(`/entidades/${codenti}`);
            alert("Entidade excluída com sucesso!");
            carregarEntidades();
        } catch (error) {
            console.error("Erro ao excluir entidade", error);
            if (error.response?.data?.detail) {
                alert(error.response.data.detail);
            } else {
                alert("Erro ao excluir entidade. Verifique se existem atletas vinculados.");
            }
        }
    };

    const abrirModalAtletas = async (entidade) => {
        setSelectedEntity(entidade);
        setShowAtletasModal(true);
        setLoadingAtletasDoModal(true);
        try {
            const response = await api.get(`/atletas/?entidade_id=${entidade.codenti}`);
            setAtletasDoModal(response.data);
        } catch (error) {
            console.error("Erro ao carregar atletas da entidade", error);
            alert("Não foi possível carregar os atletas desta entidade.");
        } finally {
            setLoadingAtletasDoModal(false);
        }
    };

    const filteredEntidades = entidades.filter(ent =>
        (ent.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ent.respon && ent.respon.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ent.estado && ent.estado.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredAtletasDoModal = atletasDoModal.filter(atleta =>
        (atleta.nome || '').toLowerCase().includes(atletaSearchTerm.toLowerCase())
    );

    if (user?.tipo_usuario !== 'MASTER') {
        return null;
    }

    return (
        <div className="entidades-list-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem' }}>Gerenciar Entidades</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Cadastre, edite e gerencie as academias e federações do sistema Kudow.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ padding: '0.6rem 1.2rem' }}>
                    <Plus size={18} /> Nova Entidade
                </button>
            </div>

            <div className="card glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nome da academia, responsável ou estado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem',
                            backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.95rem'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Carregando entidades...</div>
            ) : filteredEntidades.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Nenhuma entidade encontrada.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredEntidades.map((entidade) => (
                        <div key={entidade.codenti} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', position: 'relative' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '60px', height: '60px', minWidth: '60px', minHeight: '60px',
                                        borderRadius: '0.5rem', backgroundColor: 'white', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'
                                    }}>
                                        {entidade.logo ? (
                                            <img src={getMediaUrl(entidade.logo)} alt={entidade.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Building size={30} color="var(--brand-primary)" />
                                        )}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{entidade.nome}</h3>
                                        <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            <Shield size={10} /> {entidade.tipo_entidade || 'ASSOCIACAO'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    {entidade.respon && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <User size={14} /> <span>{entidade.respon}</span>
                                        </div>
                                    )}
                                    {entidade.telefone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Phone size={14} /> <span>{entidade.telefone}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MapPin size={14} /> <span>{entidade.estado ? `${entidade.ender || ''} - ${entidade.estado}` : (entidade.ender || 'Sem endereço')}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => abrirModalAtletas(entidade)}
                                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                >
                                    <Users size={14} /> Atletas
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => navigate(`/entidades/${entidade.codenti}/financeiro`)}
                                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                    title="Painel Financeiro & Repasses"
                                >
                                    <DollarSign size={14} /> Financeiro
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => navigate(`/entidades/${entidade.codenti}`)}
                                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                >
                                    <Edit2 size={14} /> Editar
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleDeleteEntity(entidade.codenti, entidade.nome)}
                                    style={{ padding: '0.5rem 0.7rem', color: 'var(--status-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card glass-panel" style={{
                        width: '90%', maxWidth: '600px', padding: '2rem',
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <button
                            onClick={() => setShowCreateModal(false)}
                            style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={24} color="var(--brand-primary)" />
                            Nova Entidade
                        </h2>

                        <form onSubmit={handleCreateEntity} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Nome da Academia / Entidade *</label>
                                <input
                                    type="text"
                                    required
                                    value={newEntityData.nome}
                                    onChange={(e) => setNewEntityData({ ...newEntityData, nome: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Responsável Legal</label>
                                    <input
                                        type="text"
                                        value={newEntityData.respon}
                                        onChange={(e) => setNewEntityData({ ...newEntityData, respon: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Telefone</label>
                                    <input
                                        type="text"
                                        value={newEntityData.telefone}
                                        onChange={(e) => setNewEntityData({ ...newEntityData, telefone: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Tipo Oficial da Entidade</label>
                                    <select
                                        value={newEntityData.tipo_entidade}
                                        onChange={(e) => setNewEntityData({ ...newEntityData, tipo_entidade: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="ASSOCIACAO">Associação / Academia</option>
                                        <option value="CLUBE">Clube Esportivo</option>
                                        <option value="ESTADUAL">Federação Estadual</option>
                                        <option value="FEDERAL">Confederação Federal</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Estado (UF)</label>
                                    <select
                                        value={newEntityData.estado}
                                        onChange={(e) => setNewEntityData({ ...newEntityData, estado: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione</option>
                                        {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Endereço Completo</label>
                                <input
                                    type="text"
                                    value={newEntityData.ender}
                                    onChange={(e) => setNewEntityData({ ...newEntityData, ender: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Locais de Treino</label>
                                <textarea
                                    value={newEntityData.locais_treino}
                                    onChange={(e) => setNewEntityData({ ...newEntityData, locais_treino: e.target.value })}
                                    rows="2"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyItems: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creating} style={{ flex: 1 }}>
                                    {creating ? 'Criando...' : 'Criar Entidade'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAtletasModal && selectedEntity && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card glass-panel" style={{
                        width: '90%', maxWidth: '700px', padding: '2rem',
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <button
                            onClick={() => {
                                setShowAtletasModal(false);
                                setSelectedEntity(null);
                                setAtletasDoModal([]);
                                setAtletaSearchTerm('');
                            }}
                            style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                            <Building size={24} color="var(--brand-primary)" />
                            Atletas - {selectedEntity.nome}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Gerencie os lutadores vinculados a esta academia/entidade.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar atleta por nome..."
                                    value={atletaSearchTerm}
                                    onChange={(e) => setAtletaSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setShowAtletasModal(false);
                                    navigate(`/atletas/novo?entidade_id=${selectedEntity.codenti}`);
                                }}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                            >
                                <Plus size={16} /> Novo Atleta
                            </button>
                        </div>

                        {loadingAtletasDoModal ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando atletas...</div>
                        ) : filteredAtletasDoModal.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                Nenhum atleta encontrado.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {filteredAtletasDoModal.map((atleta) => (
                                    <div key={atleta.codatl} className="glass-panel" style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                {atleta.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{atleta.nome}</h4>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {atleta.faixa ? `${atleta.faixa}` : 'Sem faixa'} • {atleta.sexo === 'M' ? 'Masculino' : atleta.sexo === 'F' ? 'Feminino' : 'Não Informado'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => navigate(`/atletas/${atleta.codatl}`)}
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                        >
                                            Ver Perfil
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowAtletasModal(false);
                                    setSelectedEntity(null);
                                    setAtletasDoModal([]);
                                    setAtletaSearchTerm('');
                                }}
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntidadesList;

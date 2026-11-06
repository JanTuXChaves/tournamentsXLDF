import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Trash2, Edit2, Shield, Mail, Key, User, X, Check, Link } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const USER_ROLES = [
    { value: 'MASTER', label: 'Administrador Master' },
    { value: 'ENTIDADE', label: 'Entidade / Academia' },
    { value: 'ATLETA', label: 'Atleta' },
    { value: 'ARBITRO', label: 'Árbitro' },
    { value: 'TECNICO', label: 'Técnico' }
];

const UsuariosList = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [usuarios, setUsuarios] = useState([]);
    const [entidades, setEntidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        nome: '',
        tipo_usuario: 'ENTIDADE',
        password: '',
        entidade_id: '',
        atleta_id: '',
        colaborador_id: ''
    });

    useEffect(() => {
        if (user?.tipo_usuario !== 'MASTER') {
            navigate('/');
            return;
        }

        carregarDados();
    }, [user, navigate]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [usersRes, entRes] = await Promise.all([
                api.get('/usuarios/'),
                api.get('/entidades/')
            ]);
            setUsuarios(usersRes.data);
            setEntidades(entRes.data);
        } catch (error) {
            console.error("Erro ao carregar dados", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedUser(null);
        setFormData({
            email: '',
            nome: '',
            tipo_usuario: 'ENTIDADE',
            password: '',
            entidade_id: '',
            atleta_id: '',
            colaborador_id: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (usuario) => {
        setModalMode('edit');
        setSelectedUser(usuario);
        setFormData({
            email: usuario.email || '',
            nome: usuario.nome || '',
            tipo_usuario: usuario.tipo_usuario || 'ENTIDADE',
            password: '',
            entidade_id: usuario.entidade_id || '',
            atleta_id: usuario.atleta_id || '',
            colaborador_id: usuario.colaborador_id || ''
        });
        setShowModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            email: formData.email,
            nome: formData.nome,
            tipo_usuario: formData.tipo_usuario,
            entidade_id: formData.entidade_id ? parseInt(formData.entidade_id, 10) : null,
            atleta_id: formData.atleta_id ? parseInt(formData.atleta_id, 10) : null,
            colaborador_id: formData.colaborador_id ? parseInt(formData.colaborador_id, 10) : null
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        if (formData.tipo_usuario === 'MASTER') {
            payload.entidade_id = null;
            payload.atleta_id = null;
            payload.colaborador_id = null;
        }

        try {
            if (modalMode === 'create') {
                if (!formData.password) {
                    alert("A senha é obrigatória para a criação de um novo usuário.");
                    setSubmitting(false);
                    return;
                }
                await api.post('/usuarios/', payload);
                alert("Usuário criado com sucesso!");
            } else {
                await api.put(`/usuarios/${selectedUser.id}`, payload);
                alert("Usuário atualizado com sucesso!");
            }
            setShowModal(false);
            carregarDados();
        } catch (error) {
            console.error("Erro ao salvar usuário", error);
            if (error.response?.data?.detail) {
                alert(error.response.data.detail);
            } else {
                alert("Ocorreu um erro ao salvar o usuário. Verifique as restrições.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (usuarioId, email) => {
        if (usuarioId === user.id) {
            alert("Você não pode excluir a si mesmo.");
            return;
        }

        if (!window.confirm(`Tem certeza que deseja excluir o usuário "${email}"?`)) {
            return;
        }

        try {
            await api.delete(`/usuarios/${usuarioId}`);
            alert("Usuário excluído com sucesso!");
            carregarDados();
        } catch (error) {
            console.error("Erro ao excluir usuário", error);
            if (error.response?.data?.detail) {
                alert(error.response.data.detail);
            } else {
                alert("Erro ao excluir usuário.");
            }
        }
    };

    const getEntidadeNome = (id) => {
        const ent = entidades.find(e => e.codenti === id);
        return ent ? ent.nome : `Entidade ID: ${id}`;
    };

    const filteredUsuarios = usuarios.filter(u =>
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.tipo_usuario !== 'MASTER') {
        return null;
    }

    return (
        <div className="usuarios-list-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem' }}>Gerenciar Usuários</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gerencie os acessos, altere senhas e altere perfis de usuários do Kudow.</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenCreate} style={{ padding: '0.6rem 1.2rem' }}>
                    <Plus size={18} /> Novo Usuário
                </button>
            </div>

            <div className="card glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
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

            <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nome / E-mail</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Perfil</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Vínculo</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando usuários...</td></tr>
                            ) : filteredUsuarios.length === 0 ? (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário cadastrado.</td></tr>
                            ) : (
                                filteredUsuarios.map((u) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    backgroundColor: u.tipo_usuario === 'MASTER' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: u.tipo_usuario === 'MASTER' ? 'var(--status-warning)' : 'var(--brand-primary)'
                                                }}>
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 500, margin: 0, color: 'var(--text-dark)' }}>{u.nome}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span className={`badge ${u.tipo_usuario === 'MASTER' ? 'badge-warning' : 'badge-success'}`}>
                                                {u.tipo_usuario}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {u.tipo_usuario === 'MASTER' ? (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Administração Global</span>
                                            ) : u.entidade_id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Building size={14} color="var(--brand-secondary)" />
                                                    <span>{getEntidadeNome(u.entidade_id)}</span>
                                                </div>
                                            ) : u.atleta_id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Link size={14} color="var(--brand-secondary)" />
                                                    <span>Atleta ID: {u.atleta_id}</span>
                                                </div>
                                            ) : u.colaborador_id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Link size={14} color="var(--brand-secondary)" />
                                                    <span>Colaborador ID: {u.colaborador_id}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--status-danger)' }}>Sem vínculo cadastrado</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleOpenEdit(u)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 0.6rem', border: 'none', background: 'transparent' }}
                                                    title="Editar Usuário"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 0.6rem', border: 'none', background: 'transparent', color: u.id === user.id ? 'var(--text-muted)' : 'var(--status-danger)' }}
                                                    disabled={u.id === user.id}
                                                    title={u.id === user.id ? "Você não pode excluir seu próprio usuário" : "Deletar Usuário"}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card glass-panel" style={{
                        width: '90%', maxWidth: '550px', padding: '2rem',
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        maxHeight: '95vh', overflowY: 'auto'
                    }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={24} color="var(--brand-primary)" />
                            {modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
                        </h2>

                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Nome Completo *</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>E-mail *</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Senha {modalMode === 'edit' && '(deixe em branco para não alterar)'} {modalMode === 'create' && '*'}</label>
                                <div style={{ position: 'relative' }}>
                                    <Key size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        required={modalMode === 'create'}
                                        placeholder={modalMode === 'edit' ? 'Digite para redefinir a senha' : ''}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Perfil / Papel *</label>
                                <select
                                    value={formData.tipo_usuario}
                                    onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                >
                                    {USER_ROLES.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.tipo_usuario !== 'MASTER' && (
                                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Link size={14} /> Vínculo Obrigatório
                                    </h4>

                                    {formData.tipo_usuario === 'ENTIDADE' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Vincular a uma Entidade / Academia *</label>
                                            <select
                                                required
                                                value={formData.entidade_id}
                                                onChange={(e) => setFormData({ ...formData, entidade_id: e.target.value, atleta_id: '', colaborador_id: '' })}
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">-- Selecione uma Entidade --</option>
                                                {entidades.map(ent => (
                                                    <option key={ent.codenti} value={ent.codenti}>{ent.nome} (ID: {ent.codenti})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {formData.tipo_usuario === 'ATLETA' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Código do Atleta vinculado (atleta_id) *</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="Ex: 5"
                                                value={formData.atleta_id}
                                                onChange={(e) => setFormData({ ...formData, atleta_id: e.target.value, entidade_id: '', colaborador_id: '' })}
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    )}

                                    {formData.tipo_usuario !== 'ENTIDADE' && formData.tipo_usuario !== 'ATLETA' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Código do Colaborador vinculado (colaborador_id) *</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="Ex: 1"
                                                value={formData.colaborador_id}
                                                onChange={(e) => setFormData({ ...formData, colaborador_id: e.target.value, entidade_id: '', atleta_id: '' })}
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyItems: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                                    {submitting ? 'Salvando...' : 'Salvar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsuariosList;

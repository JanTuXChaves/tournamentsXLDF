import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shield, Building, Edit, Save, X, Upload, Download, Search, Users, MoreVertical, Plus, DollarSign } from 'lucide-react';
import api, { getMediaUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const EntidadeProfile = () => {
    const { user, updateUserContext } = useContext(AuthContext);
    const { id } = useParams();
    const navigate = useNavigate();

    const entidadeId = id ? parseInt(id, 10) : user?.entidade_id;

    const [entidade, setEntidade] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        nome: '',
        ender: '',
        respon: '',
        telefone: '',
        tipo_entidade: '',
        estado: '',
        locais_treino: ''
    });

    const [atletas, setAtletas] = useState([]);
    const [loadingAtletas, setLoadingAtletas] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const isMaster = user?.tipo_usuario === 'MASTER';
    const isEntidade = user?.tipo_usuario === 'ENTIDADE';
    const isAuthorized = isMaster || (isEntidade && entidadeId === user?.entidade_id);

    const calcularIdade = (dataNascimento) => {
        if (!dataNascimento) return null;
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    };

    const formatarData = (dataString) => {
        if (!dataString) return '-';
        const data = new Date(dataString + 'T12:00:00Z');
        const dia = String(data.getUTCDate()).padStart(2, '0');
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        const ano = data.getUTCFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    useEffect(() => {
        if (!isAuthorized) {
            navigate('/');
        }
    }, [isAuthorized, navigate]);

    useEffect(() => {
        if (!isAuthorized || !entidadeId) {
            setLoading(false);
            setLoadingAtletas(false);
            return;
        }

        const fetchDados = async () => {
            try {
                const [entidadeRes, atletasRes] = await Promise.all([
                    api.get(`/entidades/${entidadeId}`),
                    api.get(`/atletas/?entidade_id=${entidadeId}`).catch(() => ({ data: [] }))
                ]);
                setEntidade(entidadeRes.data);
                setFormData({
                    nome: entidadeRes.data.nome || '',
                    ender: entidadeRes.data.ender || '',
                    respon: entidadeRes.data.respon || '',
                    telefone: entidadeRes.data.telefone || '',
                    tipo_entidade: entidadeRes.data.tipo_entidade || '',
                    estado: entidadeRes.data.estado || '',
                    locais_treino: entidadeRes.data.locais_treino || ''
                });
                setAtletas(atletasRes.data);
            } catch (error) {
                console.error("Erro ao carregar dados da Entidade", error);
            } finally {
                setLoading(false);
                setLoadingAtletas(false);
            }
        };

        fetchDados();
    }, [entidadeId, isAuthorized]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!entidadeId) return;
        setSaving(true);
        try {
            const response = await api.put(`/entidades/${entidadeId}`, formData);
            setEntidade(response.data);
            setIsEditing(false);
            alert("Perfil da Entidade atualizado com sucesso.");
        } catch (error) {
            console.error("Erro ao salvar Entidade", error);
            if (error.response?.data?.detail) {
                alert(error.response.data.detail);
            } else {
                alert("Ocorreu um erro ao tentar salvar as alterações.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleLogoClick = () => {
        if (!isEditing && !uploadingLogo) {
            fileInputRef.current?.click();
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !entidadeId) return;

        setUploadingLogo(true);
        const logoFormData = new FormData();
        logoFormData.append('file', file);

        try {
            const response = await api.post(`/entidades/${entidadeId}/logo`, logoFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setEntidade(response.data);
            if (updateUserContext && response.data.logo && user?.entidade_id === entidadeId) {
                updateUserContext({ logo_entidade: response.data.logo });
            }
            alert("Logo atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao fazer upload do logo:", error);
            alert("Ocorreu um erro ao enviar a imagem.");
        } finally {
            setUploadingLogo(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setFormData({
            nome: entidade.nome || '',
            ender: entidade.ender || '',
            respon: entidade.respon || '',
            telefone: entidade.telefone || '',
            tipo_entidade: entidade.tipo_entidade || '',
            estado: entidade.estado || '',
            locais_treino: entidade.locais_treino || ''
        });
    };

    if (!isAuthorized) {
        return null;
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando perfil da entidade...</div>;
    }

    if (!entidade) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-danger)' }}>Erro ao encontrar a Entidade logada.</div>;
    }

    const atletasFiltrados = atletas.filter(atleta =>
        (atleta.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="entidade-profile">

            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
            />

            {isMaster && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => navigate('/entidades')}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        &larr; Voltar para Gerenciar Entidades
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div
                        onClick={handleLogoClick}
                        title={isEditing ? "Salve o perfil primeiro para trocar o logo" : "Clique para alterar a logo"}
                        style={{
                            width: '80px', height: '80px', minWidth: '80px', minHeight: '80px', borderRadius: '1rem',
                            backgroundColor: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                            cursor: (!isEditing && !uploadingLogo) ? 'pointer' : 'default',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {uploadingLogo ? (
                            <div style={{ backgroundColor: 'var(--brand-primary)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                                <Upload size={30} color="white" className="spin-animation" style={{ margin: 'auto' }} />
                            </div>
                        ) : entidade.logo ? (
                            <img src={getMediaUrl(entidade.logo)} alt="Logo Entidade" style={{ width: '80px', height: '80px', objectFit: 'cover', display: 'block' }} />
                        ) : (
                            <div style={{ backgroundColor: 'var(--brand-primary)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                                <Building size={40} color="white" style={{ margin: 'auto' }} />
                            </div>
                        )}

                        {!isEditing && !uploadingLogo && (
                            <div className="logo-overlay" style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', opacity: 0,
                                transition: 'opacity 0.2s', borderRadius: '1rem'
                            }}>
                                <Upload size={24} color="white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: '2rem', margin: '0 0 0.25rem 0' }}>{entidade.nome}</h1>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <span className="badge badge-primary" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                ID: {entidade.codenti}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Responsável: {entidade.respon || 'Não Informado'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <a href="/template_atletas.csv" download style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Download size={16} /> Baixar template CSV
                    </a>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/entidades/${entidade.codenti}/financeiro`)}
                        style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                    >
                        <DollarSign size={18} /> Financeiro & Repasses
                    </button>
                    {isEditing ? (
                        <>
                            <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving} style={{ padding: '0.6rem 1.2rem' }}>
                                <X size={18} /> Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '0.6rem 1.2rem' }}>
                                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-secondary" onClick={() => setIsEditing(true)} style={{ padding: '0.6rem 1.2rem' }}>
                            <Edit size={18} /> Editar Perfil
                        </button>
                    )}
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    Informações Cadastrais
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 2fr)', gap: '2rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Nome da Entidade / Fantasia</label>
                            {isEditing ? (
                                <input type="text" name="nome" value={formData.nome} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                            ) : (
                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{entidade.nome || '-'}</div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Responsável Legal</label>
                            {isEditing ? (
                                <input type="text" name="respon" value={formData.respon} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                            ) : (
                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{entidade.respon || '-'}</div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Telefone / Contato</label>
                            {isEditing ? (
                                <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                            ) : (
                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{entidade.telefone || '-'}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 3 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Endereço Matriz</label>
                                {isEditing ? (
                                    <input type="text" name="ender" value={formData.ender} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                ) : (
                                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{entidade.ender || '-'}</div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>UF</label>
                                {isEditing ? (
                                    <select name="estado" value={formData.estado} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                        <option value="">--</option>
                                        {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{entidade.estado || '-'}</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Locais de Treino Associados</label>
                            {isEditing ? (
                                <textarea name="locais_treino" value={formData.locais_treino} onChange={handleChange} rows="3" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }} />
                            ) : (
                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, minHeight: '3rem' }}>{entidade.locais_treino || '-'}</div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Tipo Oficial da Entidade</label>
                            {isEditing ? (
                                <input type="text" name="tipo_entidade" value={formData.tipo_entidade} onChange={handleChange} placeholder="Ex: Federação, Confederação, Academia, Clube" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                            ) : (
                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={16} color="var(--brand-secondary)" />
                                    {entidade.tipo_entidade || 'Não Especificado'}
                                </div>
                            )}
                        </div>
                </div>
            </div>
            </div>

            <div className="card glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={22} color="var(--brand-primary)" /> Atletas Vinculados ({atletas.length})
                    </h3>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/atletas/novo?entidade_id=${entidadeId}`)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <Plus size={16} /> Novo Atleta
                        </button>
                        <div style={{ position: 'relative', width: '280px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar atleta por nome..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {loadingAtletas ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando atletas...</div>
                ) : atletasFiltrados.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum atleta cadastrado nesta entidade.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nome</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nascimento / Idade</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Peso/Altura</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Faixa</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Status</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atletasFiltrados.map((atleta) => (
                                    <tr key={atleta.codatl} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                                    {atleta.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 500, margin: 0 }}>{atleta.nome}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                                        {atleta.sexo === 'M' ? 'Masculino' : atleta.sexo === 'F' ? 'Feminino' : 'Não Informado'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                                            {atleta.data_nascimento ? `${formatarData(atleta.data_nascimento)} (${calcularIdade(atleta.data_nascimento)} anos)` : '-'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                                            {atleta.peso ? `${atleta.peso}kg` : '-'} / {atleta.altura ? `${atleta.altura}m` : '-'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.85rem' }}>
                                                {atleta.faixa || 'Branca'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {atleta.status_bloqueio ? (
                                                <span className="badge badge-warning">Bloqueado</span>
                                            ) : (
                                                <span className="badge badge-success">Ativo</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}
                                                onClick={() => navigate(`/atletas/${atleta.codatl}`)}
                                                title="Ver Perfil"
                                            >
                                                <MoreVertical size={18} />
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
    );
};

export default EntidadeProfile;

import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Activity, ShieldBan, ShieldCheck, FileText, Trash2, UploadCloud, Trophy, Swords, Zap, CheckCircle2, XCircle, Clock, Award, ExternalLink, Calendar, MapPin, DollarSign, CreditCard } from 'lucide-react';
import api, { getMediaUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import CheckoutModal from '../components/CheckoutModal';

const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const AtletaProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [atleta, setAtleta] = useState(null);
    const [historico, setHistorico] = useState([]);
    const [lutasData, setLutasData] = useState({ estatisticas: null, lutas: [] });
    const [entidades, setEntidades] = useState([]);
    const [certificados, setCertificados] = useState([]);
    const [faturas, setFaturas] = useState([]);
    const [checkoutData, setCheckoutData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('lutas');

    const [uploadingCert, setUploadingCert] = useState(false);
    const [novoCertificado, setNovoCertificado] = useState({
        data: '',
        descricao: '',
        arquivo: null
    });

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        data_nascimento: '',
        faixa: '',
        sexo: '',
        peso: '',
        altura: '',
        cpf: '',
        telefone: '',
        endereco: '',
        estado: '',
        entidade_id: ''
    });
    const [saving, setSaving] = useState(false);

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

    const carregarDados = async () => {
        try {
            const [atletaRes, histRes, lutasRes, entidadesRes, certsRes, faturasRes] = await Promise.all([
                api.get(`/atletas/${id}`),
                api.get(`/atletas/${id}/historico`).catch(() => ({ data: [] })),
                api.get(`/atletas/${id}/lutas`).catch(() => ({ data: { estatisticas: null, lutas: [] } })),
                api.get('/entidades/').catch(() => ({ data: [] })),
                api.get(`/atletas/${id}/certificados`).catch(() => ({ data: [] })),
                api.get(`/financeiro/atletas/${id}/faturas`).catch(() => ({ data: [] }))
            ]);

            setAtleta(atletaRes.data);

            setFormData({
                data_nascimento: atletaRes.data.data_nascimento || '',
                faixa: atletaRes.data.faixa || '',
                sexo: atletaRes.data.sexo || '',
                peso: atletaRes.data.peso || '',
                altura: atletaRes.data.altura || '',
                cpf: atletaRes.data.cpf || '',
                telefone: atletaRes.data.telefone || '',
                endereco: atletaRes.data.endereco || '',
                estado: atletaRes.data.estado || '',
                entidade_id: atletaRes.data.entidade_id || ''
            });

            setHistorico(histRes.data || []);
            setLutasData(lutasRes.data || { estatisticas: null, lutas: [] });
            setEntidades(entidadesRes.data || []);
            setCertificados(certsRes.data || []);
            setFaturas(faturasRes.data || []);
            setLoading(false);
        } catch (error) {
            console.error("Erro ao carregar perfil", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [id]);

    if (loading) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados e histórico do atleta...</div>;
    }

    if (!atleta) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--status-danger)' }}>Atleta não encontrado.</div>;
    }

    const canEdit =
        (user?.tipo_usuario !== 'ATLETA' && user?.tipo_usuario !== 'ENTIDADE') ||
        (user?.tipo_usuario === 'ATLETA' && user?.atleta_id == atleta.codatl) ||
        (user?.tipo_usuario === 'ENTIDADE' && user?.entidade_id == atleta.entidade_id);

    const startEdit = () => {
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setFormData({
            data_nascimento: atleta.data_nascimento || '',
            faixa: atleta.faixa || '',
            sexo: atleta.sexo || '',
            peso: atleta.peso || '',
            altura: atleta.altura || '',
            cpf: atleta.cpf || '',
            telefone: atleta.telefone || '',
            endereco: atleta.endereco || '',
            estado: atleta.estado || '',
            entidade_id: atleta.entidade_id || ''
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { ...formData };
            if (!payload.peso) payload.peso = null;
            if (!payload.altura) payload.altura = null;
            if (!payload.entidade_id) payload.entidade_id = null;
            if (!payload.cpf) {
                alert("O CPF é obrigatório.");
                setSaving(false);
                return;
            }

            const res = await api.put(`/atletas/${id}`, payload);
            setAtleta(res.data);
            setIsEditing(false);
            alert("Ficha do atleta atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar atleta", error);
            alert(error.response?.data?.detail || "Não foi possível salvar as alterações.");
        } finally {
            setSaving(false);
        }
    };

    const handleUploadCertificado = async (e) => {
        e.preventDefault();
        if (!novoCertificado.arquivo || !novoCertificado.data || !novoCertificado.descricao) {
            alert("Por favor, preencha todos os campos do certificado e anexe o arquivo PDF.");
            return;
        }

        setUploadingCert(true);
        const data = new FormData();
        data.append('file', novoCertificado.arquivo);
        data.append('data_certificado', novoCertificado.data);
        data.append('descricao', novoCertificado.descricao);

        try {
            const res = await api.post(`/atletas/${id}/certificados`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCertificados([...certificados, res.data]);
            setNovoCertificado({ data: '', descricao: '', arquivo: null });
            alert("Certificado anexado com sucesso!");
        } catch (error) {
            console.error("Erro ao fazer upload do certificado", error);
            alert(error.response?.data?.detail || "Erro ao enviar certificado.");
        } finally {
            setUploadingCert(false);
        }
    };

    const handleDeletarCertificado = async (certId) => {
        if (!window.confirm("Deseja realmente excluir este certificado?")) return;

        try {
            await api.delete(`/atletas/${id}/certificados/${certId}`);
            setCertificados(certificados.filter(c => c.id !== certId));
        } catch (error) {
            console.error("Erro ao deletar certificado", error);
            alert("Erro ao excluir certificado.");
        }
    };

    const entidadesFiltradas = formData.estado
        ? entidades.filter(e => e.estado === formData.estado)
        : entidades;

    const handleUploadFotoAtleta = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await api.post(`/atletas/${id}/foto`, form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAtleta(res.data);
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao enviar foto do atleta.');
        }
    };

    const stats = lutasData.estatisticas || {
        total_lutas: 0,
        lutas_finalizadas: 0,
        vitorias: 0,
        derrotas: 0,
        vitorias_ippon: 0,
        taxa_vitoria: 0
    };

    return (
        <div className="profile-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>

            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate(-1)}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem', background: 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="card glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <label
                            title={canEdit ? "Clique para alterar a foto do atleta" : atleta.nome}
                            style={{
                                width: '84px',
                                height: '84px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '2px solid var(--brand-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--brand-primary)',
                                boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)',
                                overflow: 'hidden',
                                cursor: canEdit ? 'pointer' : 'default',
                                position: 'relative'
                            }}
                        >
                            {atleta.foto ? (
                                <img src={getMediaUrl(atleta.foto)} alt={atleta.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                <User size={44} />
                            )}
                            {canEdit && (
                                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleUploadFotoAtleta} style={{ display: 'none' }} />
                            )}
                        </label>
                        <div>
                            <h1 style={{ color: 'var(--text-primary)', fontSize: '2.1rem', margin: '0 0 0.35rem 0', fontWeight: 800 }}>
                                {atleta.nome}
                            </h1>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-primary)',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    🥋 {atleta.faixa || 'Faixa Geral'}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {atleta.data_nascimento ? `${formatarData(atleta.data_nascimento)} (${calcularIdade(atleta.data_nascimento)} anos)` : 'Idade não informada'} • {atleta.peso ? `${atleta.peso}kg` : 'Peso não informado'} • UF: {atleta.estado || 'SP'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {atleta.status_bloqueio ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger)', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: '0.6rem 1.2rem', borderRadius: '30px', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700 }}>
                                <ShieldBan size={18} />
                                <span>Bloqueado</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.6rem 1.2rem', borderRadius: '30px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
                                <ShieldCheck size={18} />
                                <span>Atleta Regular</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total de Lutas
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                        {stats.total_lutas}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {stats.lutas_finalizadas} concluídas
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '3px solid #10b981' }}>
                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Vitórias
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', margin: '0.25rem 0' }}>
                        {stats.vitorias}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                        {stats.taxa_vitoria}% de aproveitamento
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '3px solid #ef4444' }}>
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Derrotas
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ef4444', margin: '0.25rem 0' }}>
                        {stats.derrotas}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        em torneios oficiais
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '3px solid #f59e0b' }}>
                    <div style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Vitórias por Ippon
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b', margin: '0.25rem 0' }}>
                        {stats.vitorias_ippon}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        pontuação máxima
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Torneios Disputados
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--brand-primary)', margin: '0.25rem 0' }}>
                        {historico.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        chaves oficiais
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                <div className="card glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Ficha Técnica</h3>
                        {!isEditing && canEdit && (
                            <button className="btn btn-secondary" onClick={startEdit} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                                Editar
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Data de Nascimento</label>
                                    <input
                                        type="date"
                                        value={formData.data_nascimento}
                                        onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Faixa / Graduação</label>
                                    <input
                                        type="text"
                                        value={formData.faixa}
                                        onChange={(e) => setFormData({ ...formData, faixa: e.target.value })}
                                        placeholder="Ex: Faixa Preta"
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Sexo</label>
                                    <select
                                        value={formData.sexo}
                                        onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Não Informado</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Peso (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.peso}
                                        onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>CPF (Obrigatório)</label>
                                    <input
                                        type="text"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Telefone</label>
                                    <input
                                        type="text"
                                        value={formData.telefone}
                                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Estado (UF)</label>
                                    <select
                                        value={formData.estado}
                                        onChange={(e) => setFormData({ ...formData, estado: e.target.value, entidade_id: '' })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione o Estado</option>
                                        {ESTADOS_BR.map(uf => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Entidade / Academia</label>
                                    <select
                                        value={formData.entidade_id}
                                        onChange={(e) => setFormData({ ...formData, entidade_id: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        disabled={!formData.estado}
                                    >
                                        <option value="">{formData.estado ? "Selecione a Entidade" : "Selecione o Estado primeiro"}</option>
                                        {entidadesFiltradas.map(ent => (
                                            <option key={ent.codenti} value={ent.codenti}>{ent.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button className="btn btn-primary" style={{ flex: 1, padding: '0.45rem' }} onClick={handleSave} disabled={saving}>
                                        {saving ? 'Salvando...' : 'Salvar'}
                                    </button>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.45rem' }} onClick={cancelEdit} disabled={saving}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Nascimento</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.data_nascimento ? `${formatarData(atleta.data_nascimento)} (${calcularIdade(atleta.data_nascimento)} anos)` : '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Sexo</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.sexo === 'M' ? 'Masculino' : atleta.sexo === 'F' ? 'Feminino' : 'Não Inf.'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Peso Cravado</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.peso ? `${atleta.peso}kg` : '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Altura</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.altura ? `${atleta.altura}m` : '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>CPF</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.cpf || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Telefone</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.telefone || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Estado</span>
                                    <span style={{ fontWeight: 600 }}>{atleta.estado || 'SP'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Entidade</span>
                                    <span style={{ fontWeight: 600, color: 'var(--brand-primary)', textAlign: 'right', maxWidth: '60%' }}>
                                        {atleta.entidade_id ? (entidades.find(e => e.codenti == atleta.entidade_id)?.nome || `#${atleta.entidade_id} Kudow`) : 'Avulso'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>

                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('lutas')}
                            style={{
                                flex: 1,
                                padding: '1rem 1.5rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'lutas' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                color: activeTab === 'lutas' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'lutas' ? 700 : 500,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Swords size={18} />
                            Histórico de Lutas ({lutasData.lutas.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('torneios')}
                            style={{
                                flex: 1,
                                padding: '1rem 1.5rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'torneios' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                color: activeTab === 'torneios' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'torneios' ? 700 : 500,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trophy size={18} />
                            Torneios Disputados ({historico.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('certificados')}
                            style={{
                                flex: 1,
                                padding: '1rem 1.5rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'certificados' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                color: activeTab === 'certificados' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'certificados' ? 700 : 500,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <FileText size={18} />
                            Certificados ({certificados.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('financeiro')}
                            style={{
                                flex: 1,
                                padding: '1rem 1.5rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'financeiro' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                color: activeTab === 'financeiro' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'financeiro' ? 700 : 500,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <DollarSign size={18} />
                            Mensalidades & Faturas ({faturas.length})
                        </button>
                    </div>

                    {activeTab === 'lutas' && (
                        <div style={{ padding: '1.5rem' }}>
                            {lutasData.lutas.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                                    <Swords size={44} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>Nenhum combate registrado para este atleta ainda.</p>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>As lutas aparecerão automaticamente assim que os chaveamentos forem gerados e disputados.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {lutasData.lutas.map((luta) => {
                                        const isVitoria = luta.status_luta === 'VITORIA';
                                        const isDerrota = luta.status_luta === 'DERROTA';
                                        const isEmAberto = luta.status_luta === 'EM_ABERTO';

                                        return (
                                            <div
                                                key={luta.partida_id}
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: `1.5px solid ${isVitoria ? 'rgba(16, 185, 129, 0.4)' : isDerrota ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                                                    borderRadius: '12px',
                                                    padding: '1.25rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.85rem',
                                                    boxShadow: isVitoria ? '0 4px 20px rgba(16, 185, 129, 0.06)' : 'none'
                                                }}
                                            >

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            fontWeight: 800,
                                                            fontSize: '0.8rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            backgroundColor: isVitoria ? 'rgba(16, 185, 129, 0.15)' : isDerrota ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                            color: isVitoria ? '#10b981' : isDerrota ? '#ef4444' : '#f59e0b',
                                                            border: `1px solid ${isVitoria ? 'rgba(16, 185, 129, 0.3)' : isDerrota ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                                        }}>
                                                            {isVitoria && <CheckCircle2 size={14} />}
                                                            {isDerrota && <XCircle size={14} />}
                                                            {isEmAberto && <Clock size={14} />}
                                                            {isVitoria ? 'VITÓRIA' : isDerrota ? 'DERROTA' : 'EM ABERTO'}
                                                        </span>

                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                            {luta.fase} • Luta #{luta.numero_luta}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            Canto: <strong style={{ color: luta.canto.includes('VERMELHO') ? '#ef4444' : '#ffffff' }}>{luta.canto}</strong>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/eventos/${luta.evento_id}`)}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}
                                                            title="Ver Torneio"
                                                        >
                                                            Ver Chave <ExternalLink size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr auto 1fr',
                                                    gap: '1rem',
                                                    alignItems: 'center',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)'
                                                }}>

                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Atleta</div>
                                                        <div style={{ fontWeight: 800, color: isVitoria ? '#10b981' : 'var(--text-primary)', fontSize: '1rem' }}>
                                                            {atleta.nome}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                            {atleta.faixa || 'Geral'} • {atleta.estado || 'SP'}
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'var(--bg-tertiary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 900,
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-muted)'
                                                    }}>
                                                        VS
                                                    </div>

                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Oponente</div>
                                                        {luta.oponente?.id ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/atletas/${luta.oponente.id}`)}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    cursor: 'pointer',
                                                                    fontWeight: 800,
                                                                    color: isDerrota ? '#ef4444' : 'var(--brand-primary)',
                                                                    fontSize: '1rem',
                                                                    textAlign: 'right',
                                                                    textDecoration: 'underline',
                                                                    textUnderlineOffset: '3px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.35rem',
                                                                    transition: 'opacity 0.2s ease'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                                title={`Ver perfil completo de ${luta.oponente.nome}`}
                                                            >
                                                                {luta.oponente.nome}
                                                                <ExternalLink size={13} />
                                                            </button>
                                                        ) : (
                                                            <div style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '1rem' }}>
                                                                {luta.oponente?.nome || 'Bye / A Definir'}
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                            {luta.oponente?.entidade || 'Federação'} • {luta.oponente?.estado || 'SP'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <Trophy size={14} color="var(--brand-primary)" /> {luta.evento_nome}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{luta.categoria_nome}</span>
                                                    </div>

                                                    {luta.evento_data && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <Calendar size={13} /> {formatarData(luta.evento_data)}
                                                        </div>
                                                    )}
                                                </div>

                                                {luta.observacoes_arbitro && (
                                                    <div style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                        borderLeft: '3px solid var(--brand-primary)',
                                                        padding: '0.6rem 0.85rem',
                                                        borderRadius: '0 6px 6px 0',
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-secondary)',
                                                        whiteSpace: 'pre-line'
                                                    }}>
                                                        <strong style={{ color: 'var(--text-primary)' }}>📋 Súmula Oficial:</strong>
                                                        <div>{luta.observacoes_arbitro}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'torneios' && (
                        <div style={{ padding: 0 }}>
                            {historico.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3.5rem 0' }}>O atleta ainda não participou de nenhum evento/torneio oficial.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Evento / Torneio</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Categoria Disputada</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'center' }}>V / D (Chaves)</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Situação</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historico.map((hist, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <div>{hist.evento_nome}</div>
                                                    {hist.evento_data && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatarData(hist.evento_data)}</span>}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{hist.categoria_nome}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{hist.desempenho.vitorias}V</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{hist.desempenho.derrotas}D</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    {hist.status_inscricao === 'CONFIRMADA' ? (
                                                        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            ✓ Inscrito/Chaveado
                                                        </span>
                                                    ) : (
                                                        <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            {hist.status_inscricao}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    {hist.evento_id && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={() => navigate(`/eventos/${hist.evento_id}`)}
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                        >
                                                            Ver Chaves
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'certificados' && (
                        <div style={{ padding: '1.5rem' }}>
                            {isEditing && (
                                <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Adicionar Novo Certificado (PDF)</h4>
                                    <form onSubmit={handleUploadCertificado} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Data</label>
                                            <input
                                                type="date"
                                                required
                                                value={novoCertificado.data}
                                                onChange={e => setNovoCertificado({ ...novoCertificado, data: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição</label>
                                            <input
                                                type="text"
                                                required
                                                value={novoCertificado.descricao}
                                                onChange={e => setNovoCertificado({ ...novoCertificado, descricao: e.target.value })}
                                                placeholder="Ex: Diploma de Faixa Preta 1º Dan"
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Arquivo (PDF)</label>
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                required
                                                onChange={e => setNovoCertificado({ ...novoCertificado, arquivo: e.target.files[0] })}
                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={uploadingCert} style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 600 }}>
                                            <UploadCloud size={16} />
                                            {uploadingCert ? 'Enviando...' : 'Anexar'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {certificados.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '2rem 0' }}>Nenhum certificado anexado a este atleta.</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                    {certificados.map(cert => (
                                        <div key={cert.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ height: '180px', backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                                                <iframe
                                                    src={`${getMediaUrl(cert.arquivo_caminho)}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                                    title={cert.descricao}
                                                    style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                                                />
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, cursor: 'pointer' }} onClick={() => window.open(getMediaUrl(cert.arquivo_caminho), '_blank')} />
                                            </div>

                                            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>{cert.descricao}</div>
                                                    <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>Adicionado em: {formatarData(cert.data_certificado)}</div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                                    <a
                                                        href={getMediaUrl(cert.arquivo_caminho)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none' }}
                                                    >
                                                        Abrir PDF
                                                    </a>
                                                    {isEditing && (
                                                        <button
                                                            className="btn"
                                                            onClick={() => handleDeletarCertificado(cert.id)}
                                                            style={{ padding: '0.3rem', backgroundColor: 'transparent', color: 'var(--status-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%' }}
                                                            title="Excluir Certificado"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'financeiro' && (
                        <div style={{ padding: '1.5rem' }}>
                            {faturas.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                                    <CreditCard size={44} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>Nenhuma mensalidade ou fatura encontrada para este atleta.</p>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>As cobranças emitidas pela academia ou inscrições de torneios aparecerão aqui.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {faturas.map((fat) => {
                                        const isPago = fat.status === 'PAGO';
                                        return (
                                            <div
                                                key={`${fat.tipo}_${fat.id}`}
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: `1.5px solid ${isPago ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                                                    borderRadius: '12px',
                                                    padding: '1.25rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: '1rem'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                                                        <span style={{
                                                            padding: '3px 10px',
                                                            borderRadius: '20px',
                                                            fontWeight: 800,
                                                            fontSize: '0.75rem',
                                                            backgroundColor: isPago ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                            color: isPago ? '#10b981' : '#f59e0b',
                                                            border: `1px solid ${isPago ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                                        }}>
                                                            {isPago ? '✓ QUITADO' : '⏳ PENDENTE'}
                                                        </span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {fat.tipo === 'MENSALIDADE' ? 'Mensalidade de Afiliação' : 'Taxa de Inscrição em Torneio'}
                                                        </span>
                                                    </div>

                                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                                        {fat.titulo}
                                                    </h4>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {fat.entidade_nome} • Vencimento: {formatarData(fat.data_vencimento)}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor</div>
                                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: isPago ? '#10b981' : 'var(--text-primary)' }}>
                                                            R$ {parseFloat(fat.valor || 0).toFixed(2).replace('.', ',')}
                                                        </div>
                                                    </div>

                                                    {!isPago && (
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => setCheckoutData({
                                                                tipo: fat.tipo,
                                                                itemId: fat.tipo === 'MENSALIDADE' ? fat.id : fat.inscricao_id,
                                                                titulo: fat.titulo,
                                                                valor: fat.valor
                                                            })}
                                                            style={{ padding: '0.6rem 1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                        >
                                                            <CreditCard size={16} /> Pagar Agora
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {checkoutData && (
                <CheckoutModal
                    isOpen={!!checkoutData}
                    onClose={() => setCheckoutData(null)}
                    tipo={checkoutData.tipo}
                    itemId={checkoutData.itemId}
                    titulo={checkoutData.titulo}
                    valor={checkoutData.valor}
                    onPaymentSuccess={carregarDados}
                />
            )}
        </div>
    );
};

export default AtletaProfile;

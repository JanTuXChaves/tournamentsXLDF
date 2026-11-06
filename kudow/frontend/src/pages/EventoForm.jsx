import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, MapPin, FileText, Users, UserPlus, Trash2, RefreshCw, CheckCircle, Shield, UploadCloud, Download, FileSpreadsheet, AlertCircle, DollarSign } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const EventoForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const { user } = useContext(AuthContext);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        evento: '',
        local: '',
        obs: '',
        data_inicio: '',
        data_fim: '',
        data_inicio_inscricao: '',
        data_fim_inscricao: '',
        premiacao_dinheiro: '',
        valor_inscricao: '80.00'
    });

    const [inscricoes, setInscricoes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [todosAtletas, setTodosAtletas] = useState([]);
    const [loadingInscricoes, setLoadingInscricoes] = useState(false);

    const [showAddAtletaModal, setShowAddAtletaModal] = useState(false);
    const [atletaSelecionadoId, setAtletaSelecionadoId] = useState('');
    const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState('');
    const [inscrevendo, setInscrevendo] = useState(false);

    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [uploadingCsv, setUploadingCsv] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const fileInputRef = useRef(null);

    const isAtleta = user?.tipo_usuario === 'ATLETA';

    useEffect(() => {
        if (isAtleta) {
            navigate('/eventos', { replace: true });
        }
    }, [isAtleta, navigate]);

    const carregarInscricoes = async () => {
        if (!id) return;
        setLoadingInscricoes(true);
        try {
            const res = await api.get(`/eventos/${id}/inscricoes`);
            setInscricoes(res.data || []);
        } catch (error) {
            console.error("Erro ao carregar inscrições", error);
        } finally {
            setLoadingInscricoes(false);
        }
    };

    useEffect(() => {
        if (isEdit) {
            const carregarEvento = async () => {
                try {
                    const [resEvento, resCats, resAtletas] = await Promise.all([
                        api.get(`/eventos/${id}`),
                        api.get('/categorias/').catch(() => ({ data: [] })),
                        api.get('/atletas/').catch(() => ({ data: [] }))
                    ]);

                    const ev = resEvento.data;
                    setFormData({
                        evento: ev.evento || '',
                        local: ev.local || '',
                        obs: ev.obs || '',
                        data_inicio: ev.data_inicio || '',
                        data_fim: ev.data_fim || '',
                        data_inicio_inscricao: ev.data_inicio_inscricao || '',
                        data_fim_inscricao: ev.data_fim_inscricao || '',
                        premiacao_dinheiro: ev.premiacao_dinheiro || '',
                        valor_inscricao: ev.valor_inscricao ?? '80.00'
                    });

                    setCategorias(resCats.data || []);
                    setTodosAtletas(resAtletas.data || []);

                    await carregarInscricoes();
                } catch (error) {
                    console.error("Erro ao carregar dados do evento", error);
                    alert("Erro ao carregar os dados do torneio.");
                    navigate('/eventos');
                }
            };
            carregarEvento();
        }
    }, [id, isEdit, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                data_inicio: formData.data_inicio || null,
                data_fim: formData.data_fim || null,
                data_inicio_inscricao: formData.data_inicio_inscricao || null,
                data_fim_inscricao: formData.data_fim_inscricao || null,
                premiacao_dinheiro: formData.premiacao_dinheiro !== '' ? parseFloat(formData.premiacao_dinheiro) : null,
                valor_inscricao: formData.valor_inscricao !== '' ? parseFloat(formData.valor_inscricao) : 80.00
            };

            let response;
            if (isEdit) {
                response = await api.put(`/eventos/${id}`, payload);
                alert('Torneio atualizado com sucesso!');
            } else {
                response = await api.post('/eventos/', payload);
                alert('Torneio criado com sucesso!');
            }
            navigate(`/eventos/${response.data.codevent}`);
        } catch (error) {
            console.error("Erro ao salvar evento", error);
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    alert(`Erro de Validação: ${error.response.data.detail[0].msg}`);
                } else {
                    alert(error.response.data.detail);
                }
            } else {
                alert("Erro ao salvar o evento. Verifique os dados e tente novamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInscreverAtletaAdmin = async (e) => {
        e.preventDefault();
        if (!atletaSelecionadoId || !categoriaSelecionadaId) {
            alert("Selecione o atleta e a categoria.");
            return;
        }

        setInscrevendo(true);
        try {
            await api.post(`/eventos/${id}/inscricoes/admin`, {
                atleta_id: Number(atletaSelecionadoId),
                categoria_id: Number(categoriaSelecionadaId)
            });
            alert("Atleta inscrito com sucesso no torneio!");
            setShowAddAtletaModal(false);
            setAtletaSelecionadoId('');
            setCategoriaSelecionadaId('');
            await carregarInscricoes();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao inscrever o atleta.");
        } finally {
            setInscrevendo(false);
        }
    };

    const handleRemoverInscricao = async (inscricaoId, nomeAtleta) => {
        if (window.confirm(`Remover a inscrição de ${nomeAtleta} deste torneio?`)) {
            try {
                await api.delete(`/eventos/${id}/inscricoes/${inscricaoId}`);
                alert("Inscrição removida com sucesso!");
                await carregarInscricoes();
            } catch (error) {
                alert(error.response?.data?.detail || "Erro ao remover inscrição.");
            }
        }
    };

    const handleGerarChaveamento = async () => {
        if (window.confirm("Gerar/Atualizar o chaveamento oficial com todos os atletas confirmados?")) {
            try {
                await api.post(`/eventos/${id}/gerar_chaves`);
                alert("Chaves geradas com sucesso! Redirecionando para o chaveamento...");
                navigate(`/eventos/${id}`);
            } catch (error) {
                alert(error.response?.data?.detail || "Erro ao gerar as chaves.");
            }
        }
    };

    const handleBaixarModeloCsv = async () => {
        try {
            const res = await api.get(`/eventos/${id}/modelo-csv`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `modelo_importacao_torneio_${id}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            alert("Erro ao baixar o modelo CSV.");
        }
    };

    const handleUploadCsv = async (e) => {
        e.preventDefault();
        if (!csvFile) {
            alert("Por favor, selecione um arquivo .CSV para importar.");
            return;
        }

        setUploadingCsv(true);
        setCsvResult(null);

        const uploadData = new FormData();
        uploadData.append('file', csvFile);

        try {
            const response = await api.post(`/eventos/${id}/importar-csv`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCsvResult(response.data);
            await carregarInscricoes();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao importar arquivo CSV.");
        } finally {
            setUploadingCsv(false);
        }
    };

    if (isAtleta) {
        return null;
    }

    return (
        <div className="evento-form-page" style={{ maxWidth: '1050px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <ArrowLeft size={16} /> Voltar ao Painel
                </button>

                {isEdit && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleBaixarModeloCsv}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                        >
                            <Download size={15} /> Baixar Modelo CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleGerarChaveamento}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                        >
                            <Trophy size={18} /> Ver / Atualizar Chaveamento
                        </button>
                    </div>
                )}
            </div>

            <div className="card glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-secondary)' }}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{isEdit ? 'Configurações do Torneio' : 'Criar Novo Torneio'}</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{isEdit ? 'Atualize as regras, prazos e informações deste evento' : 'Configure as regras e datas do seu novo campeonato'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Nome do Torneio *</label>
                        <input
                            type="text"
                            name="evento"
                            required
                            value={formData.evento}
                            onChange={handleChange}
                            placeholder="Ex: Campeonato Estadual de Judô Kudow 2026"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                <MapPin size={16} color="var(--text-muted)" /> Local / Ginásio
                            </label>
                            <input
                                type="text"
                                name="local"
                                value={formData.local}
                                onChange={handleChange}
                                placeholder="Ex: Ginásio Poliesportivo do Ibirapuera - SP"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                <DollarSign size={16} color="#10b981" /> Taxa de Inscrição (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="valor_inscricao"
                                value={formData.valor_inscricao}
                                onChange={handleChange}
                                placeholder="80.00"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                <Trophy size={16} color="var(--text-muted)" /> Premiação em Dinheiro (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="premiacao_dinheiro"
                                value={formData.premiacao_dinheiro}
                                onChange={handleChange}
                                placeholder="0.00"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                            <Calendar size={18} /> Cronograma do Evento
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Datas do Combate</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Data Inicial</label>
                                        <input
                                            type="date"
                                            name="data_inicio"
                                            value={formData.data_inicio}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Data Final</label>
                                        <input
                                            type="date"
                                            name="data_fim"
                                            value={formData.data_fim}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Período de Inscrições</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Abertura</label>
                                        <input
                                            type="date"
                                            name="data_inicio_inscricao"
                                            value={formData.data_inicio_inscricao}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Encerramento</label>
                                        <input
                                            type="date"
                                            name="data_fim_inscricao"
                                            value={formData.data_fim_inscricao}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            <FileText size={16} color="var(--text-muted)" /> Observações e Regras Adicionais
                        </label>
                        <textarea
                            name="obs"
                            value={formData.obs}
                            onChange={handleChange}
                            placeholder="Regras de pesagem, tolerância de peso, premiação, cronograma detalhado..."
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Salvando...' : (isEdit ? 'Salvar Configurações' : 'Criar Torneio')}
                        </button>
                    </div>
                </form>
            </div>

            {isEdit && (
                <div className="card glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                                <Users size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>
                                    Atletas Inscritos no Torneio ({inscricoes.length})
                                </h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Lista oficial de atletas cadastrados e confirmados para a geração de chaves
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={carregarInscricoes}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                            >
                                <RefreshCw size={14} /> Atualizar
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setShowCsvModal(true); setCsvResult(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                            >
                                <UploadCloud size={16} /> Importar Atletas via CSV
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setShowAddAtletaModal(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}
                            >
                                <UserPlus size={16} /> Inscrever Novo Atleta
                            </button>
                        </div>
                    </div>

                    {loadingInscricoes ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Carregando lista de atletas inscritos...
                        </div>
                    ) : inscricoes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                            <Users size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                            <p style={{ margin: 0, fontWeight: 500, fontSize: '1rem' }}>Nenhum atleta inscrito neste torneio ainda.</p>
                            <p style={{ margin: '0.25rem 0 1.25rem 0', fontSize: '0.85rem' }}>Você pode importar um arquivo CSV com todos os lutadores ou inscrever manualmente.</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowCsvModal(true); setCsvResult(null); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                    <UploadCloud size={16} /> Importar Planilha CSV
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setShowAddAtletaModal(true)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                    <UserPlus size={16} /> Inscrever Manualmente
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Atleta</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Categoria / Peso</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Faixa / Graduação</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Entidade / Academia</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inscricoes.map((insc) => (
                                        <tr key={insc.inscricao_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                <div>{insc.atleta_nome}</div>
                                                {insc.cpf && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>CPF: {insc.cpf}</span>}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                                                {insc.categoria_nome}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                                                {insc.faixa || 'Geral'} {insc.peso ? `(${insc.peso}kg)` : ''}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                                                {insc.entidade_nome || 'Federação'}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', fontSize: '0.8rem', fontWeight: 600 }}>
                                                    {insc.estado || 'SP'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    ✓ {insc.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoverInscricao(insc.inscricao_id, insc.atleta_nome)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                                    title="Remover Inscrição"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {showCsvModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1.5rem'
                }} onClick={() => setShowCsvModal(false)}>
                    <div className="card glass-panel" style={{ width: '100%', maxWidth: '620px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>Importar Atletas via Planilha CSV</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Validação inteligente de CPF com pré-cadastro automático</p>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '10px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <Shield size={18} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <strong style={{ color: 'var(--text-primary)' }}>Como funciona a importação segura:</strong>
                                    <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                                        <li><strong>Validação de CPF:</strong> O sistema checa se o atleta já possui registro para não duplicar.</li>
                                        <li><strong>Pré-Cadastro Automático:</strong> Se for um novo participante, o perfil e o acesso são criados imediatamente.</li>
                                        <li><strong>Enquadramento em Categoria:</strong> O lutador é inscrito na categoria correspondente do torneio.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleUploadCsv} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div
                                style={{
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '2rem 1.5rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadCloud size={36} color="var(--brand-primary)" style={{ margin: '0 auto 0.75rem auto' }} />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setCsvFile(e.target.files[0])}
                                />
                                {csvFile ? (
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--brand-primary)' }}>{csvFile.name}</p>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(csvFile.size / 1024).toFixed(1)} KB • Clique para trocar</span>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Clique aqui para selecionar o arquivo .CSV</p>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Formatos suportados: CSV separado por vírgulas</span>
                                    </div>
                                )}
                            </div>

                            {csvResult && (
                                <div style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    borderRadius: '10px',
                                    padding: '1rem',
                                    fontSize: '0.85rem'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--brand-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <CheckCircle size={16} /> {csvResult.mensagem}
                                    </div>
                                    <div style={{ color: 'var(--text-primary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                        <div>• Processados: <strong>{csvResult.total_processados}</strong></div>
                                        <div>• Novos Cadastrados: <strong>{csvResult.cadastrados_novos}</strong></div>
                                        <div>• Já Existentes: <strong>{csvResult.ja_existentes}</strong></div>
                                        <div>• Inscritos no Torneio: <strong>{csvResult.inscritos_no_torneio}</strong></div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleBaixarModeloCsv}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                                >
                                    <Download size={15} /> Baixar Modelo CSV
                                </button>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowCsvModal(false)}
                                    >
                                        Fechar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={!csvFile || uploadingCsv}
                                        style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                    >
                                        {uploadingCsv ? 'Processando...' : 'Iniciar Importação'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddAtletaModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setShowAddAtletaModal(false)}>
                    <div className="card glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Inscrever Atleta no Torneio</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selecione o atleta e a categoria em que ele irá competir</p>
                            </div>
                        </div>

                        <form onSubmit={handleInscreverAtletaAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Selecionar Atleta Cadastrado *
                                </label>
                                <select
                                    required
                                    value={atletaSelecionadoId}
                                    onChange={(e) => setAtletaSelecionadoId(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">-- Selecione o Atleta --</option>
                                    {todosAtletas.map(atl => (
                                        <option key={atl.codatl} value={atl.codatl}>
                                            {atl.nome} ({atl.faixa || 'Geral'}) - {atl.peso ? `${atl.peso}kg` : ''} - {atl.sexo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Categoria de Competição *
                                </label>
                                <select
                                    required
                                    value={categoriaSelecionadaId}
                                    onChange={(e) => setCategoriaSelecionadaId(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">-- Selecione a Categoria --</option>
                                    {categorias.map(cat => (
                                        <option key={cat.codcat} value={cat.codcat}>
                                            {cat.nome_categoria || cat.descricao} ({cat.sexo}) - {cat.peso_maximo ? `Até ${cat.peso_maximo}kg` : 'Absoluto'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowAddAtletaModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1, fontWeight: 'bold' }}
                                    disabled={inscrevendo}
                                >
                                    {inscrevendo ? 'Inscrevendo...' : 'Confirmar Inscrição'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventoForm;

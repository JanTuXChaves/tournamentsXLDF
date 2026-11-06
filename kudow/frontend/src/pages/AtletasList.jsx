import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, MoreVertical, Upload, X, Download, FileText } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const AtletasList = () => {
    const { user } = useContext(AuthContext);
    const [atletas, setAtletas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [showImportModal, setShowImportModal] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

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
        if (user?.tipo_usuario === 'ATLETA') {
            navigate('/eventos', { replace: true });
            return;
        }

        const carregarAtletas = async () => {
            try {
                const response = await api.get('/atletas/');
                setAtletas(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Erro ao carregar atletas", error);
                setLoading(false);
            }
        };
        carregarAtletas();
    }, [user?.tipo_usuario, navigate]);

    const atletasFiltrados = atletas.filter(atleta =>
        atleta.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUploadCsv = async () => {
        if (!csvFile) return;

        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', csvFile);

        try {
            const response = await api.post('/atletas/importar-csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setImportResult(response.data);

            if (response.data.sucessos > 0) {
                const updatedList = await api.get('/atletas/');
                setAtletas(updatedList.data);
            }
        } catch (error) {
            console.error("Erro ao importar CSV:", error);
            alert(error.response?.data?.detail || "Ocorreu um erro ao processar o arquivo.");
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="atletas-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem' }}>Gestão de Atletas</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Mantenha o cadastro da sua base de lutadores</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <a href="/template_atletas.csv" download style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Download size={16} /> Baixar template
                    </a>
                    <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} style={{ padding: '0.6rem 1.2rem' }}>
                        <Upload size={18} /> Importar CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/atletas/novo')} style={{ padding: '0.6rem 1.2rem' }}>
                        <Plus size={18} /> Novo Atleta
                    </button>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou matrícula..."
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
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nome</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nascimento / Idade</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Peso/Altura</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Faixa</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados...</td></tr>
                            ) : atletasFiltrados.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum atleta encontrado.</td></tr>
                            ) : (
                                atletasFiltrados.map((atleta) => (
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
                                        <td style={{ padding: '1rem 1.5rem' }}>
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showImportModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card glass-panel" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Importar Atletas via CSV</h2>
                            <button onClick={() => { setShowImportModal(false); setImportResult(null); setCsvFile(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                            Adicione lutadores em massa fazendo o upload de uma planilha CSV.
                        </p>

                        <div
                            onClick={() => !importing && fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed var(--border-color)', borderRadius: '0.5rem',
                                padding: '2rem', textAlign: 'center', cursor: importing ? 'default' : 'pointer',
                                backgroundColor: csvFile ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-primary)',
                                transition: 'var(--transition-fast)',
                                borderColor: csvFile ? 'var(--status-success)' : 'var(--border-color)'
                            }}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={(e) => setCsvFile(e.target.files[0])}
                            />
                            {csvFile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={32} color="var(--status-success)" />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{csvFile.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{(csvFile.size / 1024).toFixed(1)} KB</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <Upload size={32} color="var(--text-muted)" />
                                    <span style={{ color: 'var(--text-primary)' }}>Clique ou arraste o arquivo .CSV aqui</span>
                                </div>
                            )}
                        </div>

                        {importResult && (
                            <div style={{
                                padding: '1rem', borderRadius: '0.5rem',
                                backgroundColor: importResult.sucessos > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                border: `1px solid ${importResult.sucessos > 0 ? 'var(--status-success)' : 'var(--status-warning)'}`
                            }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Resultado da Importação</h4>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                                    <li><strong style={{ color: 'var(--status-success)' }}>{importResult.sucessos}</strong> atletas criados com sucesso.</li>
                                    {importResult.erros > 0 && (
                                        <li><strong style={{ color: 'var(--status-warning)' }}>{importResult.erros}</strong> linhas falharam (verifique duplicações).</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportResult(null); setCsvFile(null); }} disabled={importing}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" disabled={!csvFile || importing} onClick={handleUploadCsv}>
                                    {importing ? 'Importando...' : 'Processar CSV'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AtletasList;

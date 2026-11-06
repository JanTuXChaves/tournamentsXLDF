import { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, FileText } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const AtletaForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useContext(AuthContext);

    const queryEntidadeId = searchParams.get('entidade_id');
    const isMaster = user?.tipo_usuario === 'MASTER';

    const [loading, setLoading] = useState(false);
    const [entities, setEntities] = useState([]);
    const [selectedEntidadeId, setSelectedEntidadeId] = useState(queryEntidadeId || '');
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        email: '',
        sexo: '',
        data_nascimento: '',
        peso: '',
        altura: '',
        faixa: '',
        telefone: '',
        endereco: '',
        estado: '',
    });

    const isAtleta = user?.tipo_usuario === 'ATLETA';

    useEffect(() => {
        if (isAtleta) {
            navigate('/eventos', { replace: true });
        }
    }, [isAtleta, navigate]);

    useEffect(() => {
        if (isMaster) {
            const loadEntities = async () => {
                try {
                    const response = await api.get('/entidades/');
                    setEntities(response.data);
                } catch (error) {
                    console.error("Erro ao carregar entidades", error);
                }
            };
            loadEntities();
        }
    }, [isMaster]);

    if (isAtleta) {
        return null;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'cpf') {
            let val = value.replace(/\D/g, '');
            if (val.length > 11) val = val.substring(0, 11);
            setFormData(prev => ({ ...prev, cpf: val }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {

            const payload = {
                ...formData,
                peso: formData.peso ? parseFloat(formData.peso) : null,
                altura: formData.altura ? parseFloat(formData.altura) : null,
                data_nascimento: formData.data_nascimento || null,
                entidade_id: isMaster
                    ? (selectedEntidadeId ? parseInt(selectedEntidadeId, 10) : null)
                    : (user?.entidade_id || null)
            };

            const response = await api.post('/atletas/', payload);
            alert('Atleta cadastrado com sucesso!');
            navigate(`/atletas/${response.data.codatl}`);
        } catch (error) {
            console.error("Erro ao cadastrar atleta", error);
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {

                    alert(`Erro de Validação: ${error.response.data.detail[0].msg}`);
                } else {
                    alert(error.response.data.detail);
                }
            } else {
                alert("Erro ao cadastrar. Verifique os dados e tente novamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="atleta-form-page">
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/atletas')}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-color)' }}
                >
                    <ArrowLeft size={16} /> Voltar
                </button>
            </div>

            <div className="card glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Cadastrar Novo Atleta</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {isMaster ? 'Vincule um novo lutador a uma entidade cadastrada.' : `Vincule um novo lutador à sua entidade ${user?.entidade_id ? `(#${user.entidade_id})` : ''}`}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {isMaster && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Entidade Vinculada *</label>
                            <select
                                name="entidade_id"
                                required
                                value={selectedEntidadeId}
                                onChange={(e) => setSelectedEntidadeId(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Selecione uma Entidade</option>
                                {entities.map(ent => (
                                    <option key={ent.codenti} value={ent.codenti}>
                                        {ent.nome} ({ent.estado || 'Sem UF'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Nome Completo *</label>
                            <input
                                type="text"
                                name="nome"
                                required
                                value={formData.nome}
                                onChange={handleChange}
                                placeholder="Nome do atleta"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>CPF *</label>
                            <input
                                type="text"
                                name="cpf"
                                required
                                value={formData.cpf}
                                onChange={handleChange}
                                placeholder="Apenas números"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>E-mail *</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="E-mail de contato do atleta"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Data de Nascimento</label>
                            <input
                                type="date"
                                name="data_nascimento"
                                value={formData.data_nascimento}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Faixa / Graduação</label>
                            <input
                                type="text"
                                name="faixa"
                                value={formData.faixa}
                                onChange={handleChange}
                                placeholder="Ex: Roxa"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Gênero</label>
                            <select
                                name="sexo"
                                value={formData.sexo}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Não Informado</option>
                                <option value="M">Masculino</option>
                                <option value="F">Feminino</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Peso (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="peso"
                                    value={formData.peso}
                                    onChange={handleChange}
                                    placeholder="85.5"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Altura (m)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="altura"
                                    value={formData.altura}
                                    onChange={handleChange}
                                    placeholder="1.80"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>
                            <FileText size={18} />
                            Informações de Contato
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Telefone</label>
                                <input
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleChange}
                                    placeholder="(11) 99999-9999"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 3 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Endereço Completo</label>
                                    <input
                                        type="text"
                                        name="endereco"
                                        value={formData.endereco}
                                        onChange={handleChange}
                                        placeholder="Rua, Número, Bairro, Cidade"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>UF</label>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">--</option>
                                        {ESTADOS_BR.map(uf => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/atletas')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Salvando...' : 'Cadastrar Atleta'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AtletaForm;

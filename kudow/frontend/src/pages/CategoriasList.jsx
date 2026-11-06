import { useState, useEffect, useContext } from 'react';
import { Layers, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const CategoriasList = () => {
    const { user } = useContext(AuthContext);
    const isMaster = user?.tipo_usuario === 'MASTER';

    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroSexo, setFiltroSexo] = useState('TODOS');
    const [editandoId, setEditandoId] = useState(null);
    const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

    const formVazio = {
        descricao: 'ADULTO',
        nome_categoria: '',
        classificacao: 'LEVE',
        sexo: 'MASCULINO',
        idade_minima: 18,
        idade_maxima: 35,
        peso_minimo: 0,
        peso_maximo: 70
    };
    const [formData, setFormData] = useState(formVazio);

    const carregarCategorias = async () => {
        setLoading(true);
        try {
            const res = await api.get('/categorias/?limit=200');
            setCategorias(res.data || []);
        } catch (err) {
            console.error('Erro ao listar categorias:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarCategorias();
    }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                idade_minima: Number(formData.idade_minima),
                idade_maxima: Number(formData.idade_maxima),
                peso_minimo: Number(formData.peso_minimo),
                peso_maximo: Number(formData.peso_maximo)
            };
            if (editandoId) {
                await api.put(`/categorias/${editandoId}`, payload);
            } else {
                await api.post('/categorias/', payload);
            }
            setEditandoId(null);
            setMostrarFormNovo(false);
            setFormData(formVazio);
            await carregarCategorias();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao salvar categoria.');
        }
    };

    const iniciarEdicao = (cat) => {
        setMostrarFormNovo(false);
        setEditandoId(cat.codcat);
        setFormData({
            descricao: cat.descricao || '',
            nome_categoria: cat.nome_categoria || '',
            classificacao: cat.classificacao || '',
            sexo: cat.sexo || 'MASCULINO',
            idade_minima: cat.idade_minima ?? 18,
            idade_maxima: cat.idade_maxima ?? 35,
            peso_minimo: cat.peso_minimo ?? 0,
            peso_maximo: cat.peso_maximo ?? 100
        });
    };

    const handleExcluir = async (codcat, nome) => {
        if (!window.confirm(`Deseja realmente excluir a categoria "${nome}"?`)) return;
        try {
            await api.delete(`/categorias/${codcat}`);
            await carregarCategorias();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao excluir categoria.');
        }
    };

    const categoriasFiltradas = categorias.filter(c => {
        if (filtroSexo === 'TODOS') return true;
        return (c.sexo || '').toUpperCase().startsWith(filtroSexo[0]);
    });

    return (
        <div className="categorias-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Layers size={28} color="var(--brand-primary)" /> Categorias Oficiais de Peso e Idade
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                        Tabela de divisões oficiais utilizadas no enquadramento automático de inscrições e pesagem oficial.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                        value={filtroSexo}
                        onChange={(e) => setFiltroSexo(e.target.value)}
                        style={{
                            padding: '0.55rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="TODOS">Todos os Sexos</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                    </select>

                    {isMaster && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setEditandoId(null);
                                setFormData(formVazio);
                                setMostrarFormNovo(!mostrarFormNovo);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <Plus size={16} /> Nova Categoria
                        </button>
                    )}
                </div>
            </div>

            {(mostrarFormNovo || editandoId) && isMaster && (
                <div className="card glass-panel" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--brand-primary)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
                        {editandoId ? `Editar Categoria #${editandoId}` : 'Cadastrar Nova Categoria Oficial'}
                    </h3>
                    <form onSubmit={handleSalvar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Divisão (Ex: ADULTO, JUVENIL)</label>
                            <input
                                type="text"
                                required
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nome Completo da Categoria</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Adulto Masc até 70kg"
                                value={formData.nome_categoria}
                                onChange={(e) => setFormData({ ...formData, nome_categoria: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Classificação (Ex: LEVE, PESADO)</label>
                            <input
                                type="text"
                                required
                                value={formData.classificacao}
                                onChange={(e) => setFormData({ ...formData, classificacao: e.target.value.toUpperCase() })}
                                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Sexo</label>
                            <select
                                value={formData.sexo}
                                onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <option value="MASCULINO">MASCULINO</option>
                                <option value="FEMININO">FEMININO</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Idade Mín. / Máx.</label>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <input
                                    type="number"
                                    required
                                    value={formData.idade_minima}
                                    onChange={(e) => setFormData({ ...formData, idade_minima: e.target.value })}
                                    style={{ width: '50%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                                <input
                                    type="number"
                                    required
                                    value={formData.idade_maxima}
                                    onChange={(e) => setFormData({ ...formData, idade_maxima: e.target.value })}
                                    style={{ width: '50%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Peso Mín. / Máx. (kg)</label>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={formData.peso_minimo}
                                    onChange={(e) => setFormData({ ...formData, peso_minimo: e.target.value })}
                                    style={{ width: '50%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={formData.peso_maximo}
                                    onChange={(e) => setFormData({ ...formData, peso_maximo: e.target.value })}
                                    style={{ width: '50%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                                <Check size={16} /> Salvar
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setEditandoId(null); setMostrarFormNovo(false); }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Carregando categorias...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '1rem 1.5rem' }}>Nome da Categoria</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Divisão</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Classe</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Sexo</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Faixa Etária</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Faixa de Peso</th>
                                    {isMaster && <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {categoriasFiltradas.map(cat => (
                                    <tr key={cat.codcat} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.nome_categoria}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{cat.descricao}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>{cat.classificacao}</span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{cat.sexo}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                                            {cat.idade_minima} a {cat.idade_maxima} anos
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                                            {cat.peso_minimo}kg até {cat.peso_maximo}kg
                                        </td>
                                        {isMaster && (
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={() => iniciarEdicao(cat)}
                                                        style={{ padding: '0.35rem 0.6rem' }}
                                                        title="Editar Categoria"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleExcluir(cat.codcat, cat.nome_categoria)}
                                                        style={{ padding: '0.35rem 0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--status-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                                        title="Excluir Categoria"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
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

export default CategoriasList;


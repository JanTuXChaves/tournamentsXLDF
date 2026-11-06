import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, User, Building2, KeyRound, Mail } from 'lucide-react';
import api from '../services/api';

const Register = () => {
    const [tipoUsuario, setTipoUsuario] = useState('ATLETA');
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [telefone, setTelefone] = useState('');
    const [cpf, setCpf] = useState('');
    const [faixa, setFaixa] = useState('');
    const [peso, setPeso] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [foto, setFoto] = useState(null);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        let perfilId = null;
        try {

            if (tipoUsuario === 'ATLETA') {
                if (!cpf) {
                    setError('O CPF é obrigatório para cadastrar um atleta.');
                    setLoading(false);
                    return;
                }

                const atletaPayload = {
                    nome,
                    cpf,
                    faixa: faixa || undefined,
                    data_nascimento: dataNascimento || undefined,
                    peso: peso ? parseFloat(peso) : undefined
                };

                const resAtleta = await api.post('/atletas/', atletaPayload);
                perfilId = resAtleta.data.codatl;

                if (foto) {
                    const formData = new FormData();
                    formData.append('file', foto);
                    await api.post(`/atletas/${perfilId}/foto`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

            } else if (tipoUsuario === 'ENTIDADE') {
                const resEntidade = await api.post('/entidades/', {
                    nome,
                    telefone: telefone || undefined
                });
                perfilId = resEntidade.data.codenti;
            }

            await api.post('/auth/register', {
                nome,
                email,
                password,
                tipo_usuario: tipoUsuario,
                atleta_id: tipoUsuario === 'ATLETA' ? perfilId : null,
                entidade_id: tipoUsuario === 'ENTIDADE' ? perfilId : null
            });

            setSuccessMsg('Cadastro realizado com sucesso! Redirecionando para login...');

            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            console.error(err);

            if (typeof perfilId !== 'undefined' && perfilId !== null) {
                try {
                    const endpoint = tipoUsuario === 'ATLETA' ? 'atletas' : 'entidades';
                    await api.delete(`/${endpoint}/${perfilId}`);
                } catch (cleanupErr) {
                    console.error('Erro ao tentar limpar o perfil órfão:', cleanupErr);
                }
            }

            if (!err.response && err.message === 'Network Error') {
                setError('Não foi possível conectar ao servidor. O sistema pode estar offline.');
            } else {
                setError(err.response?.data?.detail || err.message || 'Ocorreu um erro ao processar o cadastro.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: '2rem 1rem',
            backgroundImage: 'radial-gradient(circle at top left, rgba(6, 182, 212, 0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.1), transparent 40%)'
        }}>
            <div className="card glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem 2rem' }}>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '1rem', backgroundColor: 'var(--brand-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>
                        <UserPlus size={32} color="white" />
                    </div>
                    <h2 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Criar Conta</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Junte-se à plataforma Kudow</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)', padding: '0.8rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--status-success)', padding: '0.8rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Tipo de Perfil</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setTipoUsuario('ATLETA')}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    border: tipoUsuario === 'ATLETA' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    backgroundColor: tipoUsuario === 'ATLETA' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: tipoUsuario === 'ATLETA' ? 600 : 400
                                }}
                            >
                                <User size={18} color={tipoUsuario === 'ATLETA' ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                                Atleta
                            </button>
                            <button
                                type="button"
                                onClick={() => setTipoUsuario('ENTIDADE')}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    border: tipoUsuario === 'ENTIDADE' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    backgroundColor: tipoUsuario === 'ENTIDADE' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: tipoUsuario === 'ENTIDADE' ? 600 : 400
                                }}
                            >
                                <Building2 size={18} color={tipoUsuario === 'ENTIDADE' ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                                Entidade / Academia
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            {tipoUsuario === 'ATLETA' ? 'Nome Completo' : 'Nome da Entidade'}
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder={tipoUsuario === 'ATLETA' ? "Seu nome..." : "Nome da Academia..."}
                            style={{
                                width: '100%', padding: '0.8rem 1rem',
                                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                            }}
                            required
                        />
                    </div>

                    {tipoUsuario === 'ATLETA' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Data de Nascimento (Opcional)</label>
                                    <input
                                        type="date"
                                        value={dataNascimento}
                                        onChange={(e) => setDataNascimento(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.8rem 1rem',
                                            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                            borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Peso kg (Opcional)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={peso}
                                        onChange={(e) => setPeso(e.target.value)}
                                        placeholder="Ex: 75.5"
                                        style={{
                                            width: '100%', padding: '0.8rem 1rem',
                                            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                            borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>CPF (Obrigatório)</label>
                                <input
                                    type="text"
                                    value={cpf}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        if (val.length > 11) val = val.substring(0, 11);

                                        if (val.length > 9) val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                        else if (val.length > 6) val = val.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
                                        else if (val.length > 3) val = val.replace(/(\d{3})(\d{3})/, "$1.$2");
                                        setCpf(val);
                                    }}
                                    placeholder="000.000.000-00"
                                    maxLength="14"
                                    style={{
                                        width: '100%', padding: '0.8rem 1rem',
                                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                    }}
                                    required={tipoUsuario === 'ATLETA'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Faixa (Opcional)</label>
                                <input
                                    type="text"
                                    value={faixa}
                                    onChange={(e) => setFaixa(e.target.value)}
                                    placeholder="Branca, Azul, Roxa..."
                                    style={{
                                        width: '100%', padding: '0.8rem 1rem',
                                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Foto de Perfil (Opcional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFoto(e.target.files[0])}
                                    style={{
                                        width: '100%', padding: '0.6rem',
                                        backgroundColor: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {tipoUsuario === 'ENTIDADE' && (
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Telefone (Opcional)</label>
                            <input
                                type="text"
                                value={telefone}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.length > 11) val = val.substring(0, 11);
                                    if (val.length > 10) val = val.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                                    else if (val.length > 6) val = val.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
                                    else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
                                    setTelefone(val);
                                }}
                                placeholder="(00) 00000-0000"
                                style={{
                                    width: '100%', padding: '0.8rem 1rem',
                                    backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    <hr style={{ borderColor: 'var(--border-color)', opacity: 0.5, margin: '0.5rem 0' }} />

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Email de Acesso</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                style={{
                                    width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                    backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                }}
                                required
                            />
                            <Mail size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Senha</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Crie uma senha segura"
                                style={{
                                    width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                    backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'
                                }}
                                required
                                minLength={6}
                            />
                            <KeyRound size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || successMsg}
                        style={{ width: '100%', padding: '0.9rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', fontWeight: 600 }}
                    >
                        {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Já possui conta?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{ background: 'none', border: 'none', color: 'var(--brand-secondary)', cursor: 'pointer', padding: 0, fontSize: '0.9rem', fontWeight: 600 }}
                    >
                        Fazer o login
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Register;

import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, LogIn, KeyRound } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);

        setLoading(false);
        if (result.success) {
            if (result.user && result.user.tipo_usuario === 'ATLETA') {
                navigate('/eventos');
            } else {
                navigate('/');
            }
        } else {
            setError('Credenciais inválidas. Verifique seu usuário e senha.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            backgroundImage: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent 40%)'
        }}>
            <div className="card glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem' }}>

                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '1rem', backgroundColor: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                        <Trophy size={36} color="white" />
                    </div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>Kudow</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gestão profissional de torneios e atletas</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)', padding: '0.8rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Usuário / Matrícula</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Digite seu login"
                            style={{
                                width: '100%', padding: '0.8rem 1rem',
                                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem', color: 'var(--text-primary)', transition: 'border-color 0.2s',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Senha</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Sua senha secreta"
                                style={{
                                    width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                    backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem', color: 'var(--text-primary)', transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                required
                            />
                            <KeyRound size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0, textDecoration: 'none' }}
                            >
                                Esqueceu a senha?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                    >
                        {loading ? 'Entrando...' : (
                            <>
                                <LogIn size={20} />
                                Acessar Plataforma
                            </>
                        )}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Ainda não possui acesso?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/register')}
                        style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', padding: 0, fontSize: '0.9rem', fontWeight: 600 }}
                    >
                        Cadastre-se aqui
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Login;

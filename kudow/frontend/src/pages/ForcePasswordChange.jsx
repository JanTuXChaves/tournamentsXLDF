import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, LogOut } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const ForcePasswordChange = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem. Tente novamente.');
            return;
        }

        setLoading(true);
        try {
            await api.put('/usuarios/me', { password });
            alert('Sua senha foi atualizada com sucesso! Por favor, faça login novamente com a nova senha.');
            logout();
            navigate('/login');
        } catch (err) {
            console.error("Erro ao alterar senha", err);
            setError('Ocorreu um erro ao salvar sua nova senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', padding: '1rem' }}>
            <div className="card glass-panel" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-accent)', margin: '0 auto 1.5rem auto' }}>
                        <ShieldAlert size={32} />
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Ação Necessária</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                        Para sua segurança, você precisa alterar a sua senha provisória antes de continuar acessando o sistema.
                    </p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--brand-accent)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Nova Senha</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>Confirmar Nova Senha</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a nova senha"
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={logout} style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <LogOut size={18} /> Sair
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
                            {loading ? 'Salvando...' : 'Atualizar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChange;

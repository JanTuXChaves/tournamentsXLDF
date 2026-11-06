import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, KeyRound, Mail, ArrowLeft, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [devCode, setDevCode] = useState('');

    const navigate = useNavigate();

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { email });
            setSuccessMessage('Um código de redefinição foi enviado para seu e-mail.');
            if (response.data && response.data.code) {
                setDevCode(response.data.code);
            }
            setStep(2);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Erro ao solicitar código de recuperação. Verifique o e-mail digitado.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/reset-password', {
                email,
                code,
                new_password: newPassword
            });
            setSuccessMessage('Senha redefinida com sucesso!');
            setStep(3);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Erro ao redefinir a senha. Verifique o código e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const autoFillCode = () => {
        if (devCode) {
            setCode(devCode);
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
            <div className="card glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '3rem 2.5rem' }}>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '1rem', backgroundColor: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                        <Trophy size={36} color="white" />
                    </div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>Kudow</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Recuperação de Senha</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)', padding: '0.8rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                {successMessage && step !== 3 && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success, #10b981)', padding: '0.8rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        {successMessage}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 0.5rem 0', textAlign: 'center' }}>
                            Insira seu e-mail cadastrado. Enviaremos um código de verificação para você redefinir sua senha.
                        </p>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>E-mail</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu-email@exemplo.com"
                                    style={{
                                        width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-primary)', transition: 'border-color 0.2s',
                                        outline: 'none'
                                    }}
                                    required
                                />
                                <Mail size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                        >
                            {loading ? 'Enviando...' : 'Solicitar Código'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
                            >
                                <ArrowLeft size={16} /> Voltar para o Login
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {devCode && (
                            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    Ambiente de Desenvolvimento:
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--brand-primary)' }}>
                                        {devCode}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={autoFillCode}
                                        style={{ backgroundColor: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Preencher Código
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Código de Verificação</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Digite o código de 6 dígitos"
                                    maxLength={6}
                                    style={{
                                        width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-primary)', transition: 'border-color 0.2s',
                                        outline: 'none', letterSpacing: code ? '2px' : 'normal', fontWeight: code ? 'bold' : 'normal'
                                    }}
                                    required
                                />
                                <ShieldCheck size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Nova Senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
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
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Confirmar Nova Senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    style={{
                                        width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem', color: 'var(--text-primary)', transition: 'border-color 0.2s',
                                        outline: 'none'
                                    }}
                                    required
                                />
                                <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                        >
                            {loading ? 'Redefinindo...' : 'Alterar Senha'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Voltar para etapa anterior
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ color: 'var(--status-success, #10b981)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '1rem 0' }}>
                            <CheckCircle2 size={64} />
                        </div>

                        <div>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>Senha alterada!</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
                                Sua senha foi redefinida com sucesso. Agora você já pode fazer login na plataforma usando a nova credencial.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => navigate('/login')}
                            style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                        >
                            Ir para o Login
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ForgotPassword;

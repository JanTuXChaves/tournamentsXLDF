import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { User, LogOut, Menu } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { getMediaUrl } from '../services/api';

const Header = () => {
    const { logout, user } = useContext(AuthContext);
    const isAtleta = user?.tipo_usuario === 'ATLETA';

    const toggleSidebar = () => {
        const isCollapsed = localStorage.getItem('kudow_sidebar_collapsed') === 'true';
        localStorage.setItem('kudow_sidebar_collapsed', String(!isCollapsed));
        window.dispatchEvent(new Event('sidebarToggle'));
    };

    return (
        <header className="top-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 2rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 10
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    title="Alternar Menu Lateral"
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                >
                    <Menu size={18} />
                </button>

                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Bem-vindo de volta!</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Você está acessando como <strong>{user?.nome || user?.username || 'Administrador'}</strong>
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)' }}>
                    {isAtleta && user?.atleta_id ? (
                        <NavLink to={`/atletas/${user.atleta_id}`} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', cursor: 'pointer', overflow: 'hidden' }} title="Ir para Meu Perfil">
                            {user?.logo_entidade ? (
                                <img src={getMediaUrl(user.logo_entidade)} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                <User size={18} />
                            )}
                        </NavLink>
                    ) : (
                        user?.tipo_usuario === 'ENTIDADE' ? (
                            <NavLink to={`/minha-entidade`} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', cursor: 'pointer', overflow: 'hidden' }} title="Ir para Minha Entidade">
                                {user?.logo_entidade ? (
                                    <img src={getMediaUrl(user.logo_entidade)} alt="Logo Entidade" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', backgroundColor: 'white' }} />
                                ) : (
                                    <User size={18} />
                                )}
                            </NavLink>
                        ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {user?.logo_entidade ? (
                                    <img src={getMediaUrl(user.logo_entidade)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', backgroundColor: 'white' }} />
                                ) : (
                                    <User size={18} color="var(--text-secondary)" />
                                )}
                            </div>
                        )
                    )}

                    <button
                        onClick={logout}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', transition: 'var(--transition-fast)' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--status-danger)'; e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;

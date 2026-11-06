import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, LayoutDashboard, Trophy, Building, ChevronLeft, ChevronRight, DollarSign, Landmark, Layers, Medal } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const Sidebar = () => {
    const { user } = useContext(AuthContext);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('kudow_sidebar_collapsed') === 'true';
    });

    const isAtleta = user?.tipo_usuario === 'ATLETA';
    const isMaster = user?.tipo_usuario === 'MASTER';
    const isEntidade = user?.tipo_usuario === 'ENTIDADE';

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('kudow_sidebar_collapsed', String(next));
            window.dispatchEvent(new Event('sidebarToggle'));
            return next;
        });
    };

    useEffect(() => {
        const handleToggleEvent = () => {
            setIsCollapsed(localStorage.getItem('kudow_sidebar_collapsed') === 'true');
        };
        window.addEventListener('sidebarToggle', handleToggleEvent);
        return () => window.removeEventListener('sidebarToggle', handleToggleEvent);
    }, []);

    const getNavLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? '0' : '0.75rem',
        padding: isCollapsed ? '0.85rem 0' : '0.75rem 1.5rem',
        color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
        borderRight: isActive ? '3px solid var(--brand-primary)' : 'none',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        borderRadius: isCollapsed ? '8px' : '0',
        margin: isCollapsed ? '0.25rem 0.5rem' : '0'
    });

    return (
        <aside
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            style={{
                width: isCollapsed ? '72px' : '250px',
                transition: 'width 0.25s ease, background-color 0.2s ease',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10,
                position: 'relative'
            }}
        >

            <div style={{
                padding: isCollapsed ? '1.25rem 0.5rem' : '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                transition: 'all 0.2s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-primary)',
                        flexShrink: 0
                    }}>
                        <Trophy size={20} />
                    </div>
                    {!isCollapsed && (
                        <h1 style={{
                            color: 'var(--brand-primary)',
                            fontSize: '1.35rem',
                            fontWeight: '800',
                            margin: 0,
                            whiteSpace: 'nowrap'
                        }}>
                            Kudow
                        </h1>
                    )}
                </div>

                <button
                    type="button"
                    onClick={toggleSidebar}
                    title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: isCollapsed ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <ChevronLeft size={18} />
                </button>
            </div>

            <nav className="sidebar-nav" style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {!isAtleta && (
                        <li>
                            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                style={getNavLinkStyle}
                                title={isCollapsed ? "Visão Geral" : ""}>
                                <Home size={20} />
                                {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Visão Geral</span>}
                            </NavLink>
                        </li>
                    )}

                    {isMaster && (
                        <>
                            <li>
                                <NavLink to="/entidades" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                    style={getNavLinkStyle}
                                    title={isCollapsed ? "Gerenciar Entidades" : ""}>
                                    <Building size={20} />
                                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Gerenciar Entidades</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/usuarios" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                    style={getNavLinkStyle}
                                    title={isCollapsed ? "Gerenciar Usuários" : ""}>
                                    <Users size={20} />
                                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Gerenciar Usuários</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/admin/financeiro" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                    style={getNavLinkStyle}
                                    title={isCollapsed ? "Repasses & Receitas" : ""}>
                                    <Landmark size={20} />
                                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Repasses & Receitas</span>}
                                </NavLink>
                            </li>
                        </>
                    )}

                    {isEntidade && (
                        <>
                            <li>
                                <NavLink to="/minha-entidade" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                    style={getNavLinkStyle}
                                    title={isCollapsed ? "Minha Entidade" : ""}>
                                    <Building size={20} />
                                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Minha Entidade</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/financeiro" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                    style={getNavLinkStyle}
                                    title={isCollapsed ? "Financeiro & Repasses" : ""}>
                                    <DollarSign size={20} />
                                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Financeiro & Repasses</span>}
                                </NavLink>
                            </li>
                        </>
                    )}

                    {!isAtleta && (
                        <li>
                            <NavLink to="/atletas" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                style={getNavLinkStyle}
                                title={isCollapsed ? "Atletas" : ""}>
                                <Users size={20} />
                                {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Atletas</span>}
                            </NavLink>
                        </li>
                    )}

                    {isAtleta && user?.atleta_id && (
                        <li>
                            <NavLink to={`/atletas/${user.atleta_id}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                style={getNavLinkStyle}
                                title={isCollapsed ? "Meu Perfil" : ""}>
                                <Users size={20} />
                                {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Meu Perfil</span>}
                            </NavLink>
                        </li>
                    )}

                    <li>
                        <NavLink to="/eventos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                            style={getNavLinkStyle}
                            title={isCollapsed ? "Torneios" : ""}>
                            <LayoutDashboard size={20} />
                            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Torneios</span>}
                        </NavLink>
                    </li>

                    <li>
                        <NavLink to="/ranking" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                            style={getNavLinkStyle}
                            title={isCollapsed ? "Ranking Oficial" : ""}>
                            <Medal size={20} />
                            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Ranking Oficial</span>}
                        </NavLink>
                    </li>

                    {!isAtleta && (
                        <li>
                            <NavLink to="/categorias" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                                style={getNavLinkStyle}
                                title={isCollapsed ? "Categorias Oficiais" : ""}>
                                <Layers size={20} />
                                {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Categorias Oficiais</span>}
                            </NavLink>
                        </li>
                    )}
                </ul>
            </nav>

            <div className="sidebar-footer" style={{
                padding: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '0.75rem',
                        padding: '0.6rem',
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                    title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!isCollapsed && <span>Recolher Menu</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

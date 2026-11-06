import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import ForcePasswordChange from '../pages/ForcePasswordChange';

const RequireAuth = ({ children }) => {
    const { authenticated, loading, user } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Validando Sessão...</div>;
    }

    if (!authenticated) {

        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user && user.deve_mudar_senha) {
        return <ForcePasswordChange />;
    }

    return children;
};

export default RequireAuth;

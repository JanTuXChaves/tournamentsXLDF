
import { createContext, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const parseJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch {
            return null;
        }
    };

    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('kudow_token');
        if (token) {
            const decoded = parseJwt(token);
            return { token, ...decoded };
        }
        return null;
    });
    const loading = false;

    const login = async (username, password) => {
        try {

            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token } = response.data;
            localStorage.setItem('kudow_token', access_token);
            const decoded = parseJwt(access_token);

            const userData = { token: access_token, ...decoded, username: decoded?.email || username };
            setUser(userData);

            return { success: true, user: decoded };
        } catch (error) {
            console.error("Falha no login", error);
            return { success: false };
        }
    };

    const logout = () => {
        localStorage.removeItem('kudow_token');
        setUser(null);
    };

    const updateUserContext = (updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
    };

    return (
        <AuthContext.Provider value={{ authenticated: !!user, user, login, logout, loading, updateUserContext }}>
            {children}
        </AuthContext.Provider>
    );
};

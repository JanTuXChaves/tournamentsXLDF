import axios from 'axios';

const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const isViteDev = typeof window !== 'undefined' && window.location.port === '5173';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (
    !isViteDev && typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : `${isHttps ? 'https' : 'http'}://${defaultHost}:8000`
);
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('kudow_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;

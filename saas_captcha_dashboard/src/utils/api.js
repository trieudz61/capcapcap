import axios from 'axios';

// Auto-detect API host:
// - Production (recap1s.com): use https://api.recap1s.com via Cloudflare Tunnel
// - Development (localhost/LAN): use http://hostname:5050
const hostname = window.location.hostname || '127.0.0.1';
const isProduction = hostname === 'recap1s.com' || hostname === 'www.recap1s.com';
const baseURL = isProduction
    ? 'https://api.recap1s.com'
    : `http://${hostname}:5050`;

const api = axios.create({
    baseURL,
});

// Interceptor to add JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Admin config helper
export const adminConfig = {
    headers: { 'adminKey': 'super-admin-secret-key' }
};

export const getHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;

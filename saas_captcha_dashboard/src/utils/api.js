import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:5050', // Local
    //baseURL: 'https://makeup-brake-ids-functioning.trycloudflare.com', // Cloudflare Tunnel
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

// src/api/client.js
//
// ══════════════════════════════════════════════════════════════
//  CLIENT HTTP — Configuration Axios globale
// ══════════════════════════════════════════════════════════════
//  IDENTIQUE à la version React/Vite.
//  Seule différence : Next.js utilise ses rewrites au lieu du
//  proxy Vite, mais les URLs relatives restent les mêmes.
// ══════════════════════════════════════════════════════════════

import axios from 'axios';

const api = axios.create({
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

'use client';

// src/context/AuthContext.jsx
//
// ══════════════════════════════════════════════════════════════
//  CONTEXTE D'AUTHENTIFICATION — Version Next.js
// ══════════════════════════════════════════════════════════════
//  Changements par rapport à React/Vite :
//    1. 'use client' en haut (obligatoire pour useState/useEffect)
//    2. useRouter() de next/navigation au lieu de window.location
//    3. Les mock restent importables si besoin
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../api/client';

const AuthContext = createContext(null);

const USE_MOCK_AUTH = false;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkSession = async () => {
        try {
            const res = await api.get('/api/auth/me');
            setUser(res.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = async (username, password) => {
        try {
            await api.post('/api/auth/login', { username, password });
            await checkSession();
            return { success: true };
        } catch (err) {
            return {
                success: false,
                status: err.response?.status,
                error: err.response?.data?.message || 'Erreur lors de la connexion',
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (err) {
            console.error('Erreur logout', err);
        }
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth() doit être utilisé dans un <AuthProvider>');
    }
    return context;
};

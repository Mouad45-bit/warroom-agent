// src/app/layout.jsx
//
// ══════════════════════════════════════════════════════════════
//  ROOT LAYOUT — Remplace App.jsx + index.html
// ══════════════════════════════════════════════════════════════
//  En Next.js App Router, layout.jsx est le point d'entrée.
//  Il remplace :
//    - index.html (balise <html>, <head>, <body>)
//    - App.jsx (<AuthProvider> qui enveloppait <BrowserRouter>)
//    - main.jsx (point de montage React)
//
//  Le routage est géré par le système de fichiers :
//    app/page.jsx         → /
//    app/login/page.jsx   → /login
//    app/alerts/page.jsx  → /alerts
//  Plus besoin de <BrowserRouter>, <Routes>, <Route>.
// ══════════════════════════════════════════════════════════════

import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
    title: 'Vigilix SOC',
    description: 'WarRoom SOC Platform',
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}

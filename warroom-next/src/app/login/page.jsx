'use client';

// src/app/login/page.jsx → Route: /login
//
// La page de login est publique — pas de AppShell (pas de sidebar).
// C'est la seule page sans protection.

import LoginPage from '../../pages/LoginPage';

export default function Login() {
    return <LoginPage />;
}

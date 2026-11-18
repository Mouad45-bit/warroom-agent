'use client';

// src/app/page.jsx → Route: /
//
// ══════════════════════════════════════════════════════════════
//  En Next.js App Router, chaque page.jsx dans un dossier
//  correspond à une route. Ici : / (racine = dashboard).
//
//  Le contenu de DashboardPage est importé tel quel depuis
//  l'ancien frontend — aucune modification du composant.
//  Seul l'enveloppe change : AppShell remplace Layout+ProtectedRoute.
// ══════════════════════════════════════════════════════════════

import AppShell from '../components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';

export default function Home() {
    return (
        <AppShell>
            <DashboardPage />
        </AppShell>
    );
}

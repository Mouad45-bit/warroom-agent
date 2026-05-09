// /src/pages/DashboardPage.jsx

// ══════════════════════════════════════════════════════════════
//  TABLEAU DE BORD — Placeholder (Module 4)
// ══════════════════════════════════════════════════════════════
//  Cette page sera implémentée au Module 4.
//  Pour l'instant, elle affiche un message d'attente.
// ══════════════════════════════════════════════════════════════

import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="p-8">
            {/* Header de page */}
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

            {/* Carte placeholder */}
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 mb-4">
                    <LayoutDashboard className="w-8 h-8 text-brand-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Bienvenue, {user?.fullName}
                </h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Le tableau de bord avec les compteurs, métriques MTTD/MTTR et
                    notifications sera disponible au Module 4.
                </p>
                <div className="mt-4 inline-flex px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    Rôle : {user?.role}
                </div>
            </div>
        </div>
    );
}
// /src/pages/IncidentsPage.jsx

// ══════════════════════════════════════════════════════════════
//  PLACEHOLDER — Gestion des incidents (Module 2)
// ══════════════════════════════════════════════════════════════

import { FileWarning } from 'lucide-react';

export default function IncidentsPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Gestion des incidents
            </h1>
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 mb-4">
                    <FileWarning className="w-8 h-8 text-brand-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Module à venir
                </h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    La gestion des incidents (création, suivi, timeline, changement de
                    statut, contre-mesures) sera implémentée au Module 2.
                </p>
            </div>
        </div>
    );
}
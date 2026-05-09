// /src/components/Pagination.jsx

// ══════════════════════════════════════════════════════════════
//  COMPOSANT DE PAGINATION
// ══════════════════════════════════════════════════════════════
//  Utilisé par la file d'alertes (GET /api/alerts) et
//  la liste des utilisateurs.
//
//  Props :
//    - page : numéro de page actuel (0-indexed, comme Spring Data)
//    - totalPages : nombre total de pages
//    - totalElements : nombre total d'éléments
//    - onPageChange : callback appelé avec le nouveau numéro de page
// ══════════════════════════════════════════════════════════════

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, totalElements, onPageChange }) {
    // Pas de pagination si une seule page ou aucun résultat
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {/* Compteur d'éléments */}
            <p className="text-sm text-gray-500">
                Page <span className="font-medium text-gray-700">{page + 1}</span> sur{' '}
                <span className="font-medium text-gray-700">{totalPages}</span>
                {' '}— {totalElements} résultat{totalElements > 1 ? 's' : ''}
            </p>

            {/* Boutons précédent / suivant */}
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
// /src/components/IncidentStatusBadge.jsx

// ══════════════════════════════════════════════════════════════
//  BADGE DE STATUT D'INCIDENT — Module 2
// ══════════════════════════════════════════════════════════════
//  Affiche le statut d'un incident avec un code couleur :
//    OPEN                  → vert pulsant ("ouvert, en attente")
//    INVESTIGATING         → bleu ("en investigation")
//    REMEDIATING           → orange ("en remédiation")
//    RESOLVED              → teal ("résolu, en observation")
//    CLOSED                → gris ("clôturé")
//    CLOSED_FALSE_POSITIVE → gris clair barré ("faux positif")
//
//  Reprend la structure du AlertStatusBadge.jsx du Module 1 pour
//  garantir une cohérence visuelle dans toute la plateforme.
// ══════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
    OPEN: {
        label: 'OPEN',
        classes: 'bg-green-100 text-green-700 ring-green-600/20',
        pulse: true,
    },
    INVESTIGATING: {
        label: 'INVESTIGATING',
        classes: 'bg-blue-100 text-blue-700 ring-blue-600/20',
        pulse: false,
    },
    REMEDIATING: {
        label: 'REMEDIATING',
        classes: 'bg-orange-100 text-orange-700 ring-orange-600/20',
        pulse: false,
    },
    RESOLVED: {
        label: 'RESOLVED',
        classes: 'bg-teal-100 text-teal-700 ring-teal-600/20',
        pulse: false,
    },
    CLOSED: {
        label: 'CLOSED',
        classes: 'bg-gray-100 text-gray-600 ring-gray-500/20',
        pulse: false,
    },
    CLOSED_FALSE_POSITIVE: {
        label: 'CLOSED_FALSE_POSITIVE',
        classes: 'bg-gray-100 text-gray-400 ring-gray-400/20',
        pulse: false,
    },
};

export default function IncidentStatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${config.classes}`}
        >
            {/* Pastille animée pour les incidents en attente de prise en charge */}
            {config.pulse && (
                <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
            )}
            {config.label}
        </span>
    );
}
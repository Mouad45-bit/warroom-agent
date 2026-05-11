// /src/components/AlertStatusBadge.jsx

// ══════════════════════════════════════════════════════════════
//  BADGE DE STATUT D'ALERTE
// ══════════════════════════════════════════════════════════════
//  Affiche le statut de triage d'une alerte :
//    NEW            → pastille verte pulsante ("non traitée")
//    ACKNOWLEDGED   → badge bleu ("prise en charge")
//    FALSE_POSITIVE → badge gris barré ("faux positif")
//    ESCALATED      → badge violet ("escaladée en incident")
// ══════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
    NEW: {
        label: 'NEW',
        classes: 'bg-green-100 text-green-700 ring-green-600/20',
    },
    ACKNOWLEDGED: {
        label: 'ACKNOWLEDGED',
        classes: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    },
    FALSE_POSITIVE: {
        label: 'FALSE_POSITIVE',
        classes: 'bg-gray-100 text-gray-500 ring-gray-500/20',
    },
    ESCALATED: {
        label: 'ESCALATED',
        classes: 'bg-purple-100 text-purple-700 ring-purple-600/20',
    },
};

export default function AlertStatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.NEW;

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${config.classes}`}
        >
      {/* Pastille animée pour les alertes non traitées */}
            {status === 'NEW' && (
                <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
            )}
            {config.label}
    </span>
    );
}
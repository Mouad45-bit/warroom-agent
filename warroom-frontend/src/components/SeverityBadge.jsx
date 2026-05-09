// /src/components/SeverityBadge.jsx

// ══════════════════════════════════════════════════════════════
//  BADGE DE SÉVÉRITÉ
// ══════════════════════════════════════════════════════════════
//  Affiche la sévérité d'une alerte avec un code couleur :
//    CRITICAL → rouge
//    HIGH     → orange
//    MEDIUM   → jaune
//    LOW      → bleu
//    INFO     → gris
//
//  Correspond aux couleurs décrites dans le plan du Module 1 :
//  "badge de sévérité (rouge CRITICAL, orange HIGH, jaune MEDIUM,
//   bleu LOW, gris INFO)"
// ══════════════════════════════════════════════════════════════

const SEVERITY_STYLES = {
    CRITICAL: 'bg-red-100 text-red-700 ring-red-600/20',
    HIGH:     'bg-orange-100 text-orange-700 ring-orange-600/20',
    MEDIUM:   'bg-amber-100 text-amber-700 ring-amber-600/20',
    LOW:      'bg-blue-100 text-blue-700 ring-blue-600/20',
    INFO:     'bg-gray-100 text-gray-600 ring-gray-500/20',
};

export default function SeverityBadge({ severity }) {
    const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.INFO;

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${style}`}
        >
      {severity}
    </span>
    );
}
// /src/components/modals/agents/AgentDetailModal.jsx

import {
    Loader2,
    MonitorCheck,
    Cpu,
    HardDrive,
    Network,
    FileSearch,
    X,
    Settings,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { appConfig } from '../../../config/appConfig.js';

// ── Constantes locales à la modale ──────────────────────────
const HEALTH_COLORS = {
    GREEN:  { dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'Connecté' },
    ORANGE: { dot: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'Dégradé' },
    RED:    { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'Déconnecté' },
};

const COLLECTOR_ICONS = {
    LogCollector:           HardDrive,
    NetworkCollector:       Network,
    ProcessCollector:       Cpu,
    FileIntegrityCollector: FileSearch,
};

function timeAgo(isoDate) {
    if (!isoDate) return '—';
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return `il y a ${diff}s`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
}

// ── Mini-graphe amélioré ─────────────────────────────────────
function HeartbeatChart({ history }) {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    if (!history || history.length === 0) return null;

    const maxQ = Math.max(...history.map(h => h.queuedEvents), 1);

    // Palette par statut
    const barColor = (status) => {
        if (status === 'GREEN') return { bar: '#22c55e', glow: 'rgba(34,197,94,0.3)' };
        if (status === 'ORANGE') return { bar: '#f59e0b', glow: 'rgba(245,158,11,0.3)' };
        return { bar: '#ef4444', glow: 'rgba(239,68,68,0.3)' };
    };

    return (
        <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Historique heartbeats — queuedEvents
            </h4>

            {/* Conteneur du graphe */}
            <div className="relative bg-gray-50 rounded-xl border border-gray-100 p-3 pb-6">

                {/* Lignes de grille horizontales */}
                <div className="absolute inset-x-3 top-3 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-2 w-full">
                            <span className={`${appConfig.text.minMetaClass} text-gray-300 w-6 text-right shrink-0`}>
                                {Math.round(maxQ * (1 - i / 3))}
                            </span>
                            <div className="flex-1 border-t border-dashed border-gray-200" />
                        </div>
                    ))}
                </div>

                {/* Zone des barres */}
                <div className="relative flex items-end gap-[3px] ml-8" style={{ height: '120px' }}>
                    {history.map((hb, i) => {
                        const pct = (hb.queuedEvents / maxQ) * 100;
                        const colors = barColor(hb.healthStatus);
                        const isHovered = hoveredIdx === i;

                        // Logique : si 0, hauteur presque invisible. Si > 0, au moins 8% pour qu'on le distingue bien du zéro.
                        const displayPct = hb.queuedEvents === 0 ? 0 : Math.max(pct, 8);
                        const minH = hb.queuedEvents === 0 ? '4px' : `${appConfig.text.minMetaClass}`;

                        return (
                            <div
                                key={i}
                                className="flex-1 relative flex flex-col items-center justify-end cursor-pointer"
                                style={{ height: '100%' }}
                                onMouseEnter={() => setHoveredIdx(i)}
                                onMouseLeave={() => setHoveredIdx(null)}
                            >
                                {/* Barre */}
                                <div
                                    className="w-full rounded-t-sm transition-all duration-150 relative flex justify-center"
                                    style={{
                                        height: `${displayPct}%`,
                                        minHeight: minH,  // ← 4px pour 0, minimum pour le reste
                                        backgroundColor: colors.bar,
                                        opacity: isHovered ? 1 : 0.75,
                                        boxShadow: isHovered ? `0 0 8px ${colors.glow}` : 'none',
                                    }}
                                >
                                    {/* Tooltip au survol */}
                                    {isHovered && (
                                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                                            <div className={`bg-gray-800 text-white ${appConfig.text.minMetaClass} font-medium px-2 py-1 rounded-lg shadow-lg`}>
                                                {hb.queuedEvents} evt
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Légende de temps */}
                <div className="flex justify-between ml-8 mt-1.5">
                    <span className={`${appConfig.text.minMetaClass} text-gray-400`}>-10min</span>
                    <span className={`${appConfig.text.minMetaClass} text-gray-400`}>maintenant</span>
                </div>
            </div>

            {/* Légende */}
            <div className="flex items-center justify-center gap-4 mt-2">
                {[
                    { color: 'bg-green-500', label: 'OK' },
                    { color: 'bg-amber-500', label: 'Dégradé' },
                    { color: 'bg-red-500', label: 'Hors-ligne' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${l.color}`} />
                        <span className={`${appConfig.text.minMetaClass} text-gray-400`}>{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AgentDetailModal
    ({
         isOpen,
         agentDetail,
         loading,
         onClose,
         isAdmin,
         onOpenConfig
    }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50">
                            <MonitorCheck className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {agentDetail?.agent?.hostname || 'Chargement...'}
                            </h3>
                            {agentDetail?.agent && (
                                <p className="text-xs text-gray-400 font-mono">
                                    {agentDetail.agent.agentId}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Contenu scrollable */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-4 space-y-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        </div>
                    ) : agentDetail ? (
                        <>
                            {/* Infos générales */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {[
                                    ['OS', `${agentDetail.agent.osName} ${agentDetail.agent.osVersion}`],
                                    ['Version agent', agentDetail.agent.agentVersion],
                                    ['Enrôlé le', new Date(agentDetail.agent.enrolledAt).toLocaleDateString('fr-FR')],
                                    ['Dernier heartbeat', timeAgo(agentDetail.agent.lastSeenAt)],
                                    ['Heartbeat interval', `${agentDetail.agent.heartbeatIntervalSeconds}s`],
                                    ['Batch size', agentDetail.agent.batchSize],
                                    ['Retry interval', `${agentDetail.agent.retryIntervalSeconds}s`],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-400">{label}</span>
                                        <span className="font-medium text-gray-700">{value}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-400">Santé</span>
                                    {(() => {
                                        const h = HEALTH_COLORS[agentDetail.agent.healthStatus] || HEALTH_COLORS.RED;
                                        return (
                                            <span className={`inline-flex items-center gap-1 ${h.text} font-medium`}>
                                                <span className={`w-2 h-2 rounded-full ${h.dot}`} />
                                                {h.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Composants */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                                    Composants ({agentDetail.latestHealth.components.filter(c => c.status === 'RUNNING').length}/{agentDetail.latestHealth.components.length})
                                </h4>
                                <div className="space-y-1.5">
                                    {agentDetail.latestHealth.components.map(comp => {
                                        const Icon = COLLECTOR_ICONS[comp.name] || Cpu;
                                        const isRunning = comp.status === 'RUNNING';
                                        return (
                                            <div
                                                key={comp.name}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg ${isRunning ? 'bg-green-50' : 'bg-red-50'}`}
                                            >
                                                <Icon className={`w-4 h-4 ${isRunning ? 'text-green-600' : 'text-red-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-medium ${isRunning ? 'text-green-800' : 'text-red-700'}`}>
                                                        {comp.name}
                                                    </p>
                                                    <p className={`${appConfig.text.minMetaClass} ${isRunning ? 'text-green-600' : 'text-red-500'} truncate`}>
                                                        {comp.statusMessage}
                                                    </p>
                                                </div>
                                                {comp.restartCount > 0 && (
                                                    <span className={`flex items-center gap-1 ${appConfig.text.minMetaClass} text-gray-400`} title="Redémarrages">
                                                        <RefreshCw className="w-3 h-3" />
                                                        {comp.restartCount}
                                                    </span>
                                                )}
                                                <span className={`${appConfig.text.minMetaClass} font-medium px-1.5 py-0.5 rounded ${isRunning ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                    {comp.status}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Métriques de transmission */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                                    Métriques de transmission
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ['En file', agentDetail.latestHealth.queuedEvents, agentDetail.latestHealth.queuedEvents > 20 ? 'text-amber-700 bg-amber-50' : 'text-gray-700 bg-gray-50'],
                                        ['Livrés', agentDetail.latestHealth.deliveredEvents, 'text-green-700 bg-green-50'],
                                        ['Batches échoués', agentDetail.latestHealth.failedBatches, agentDetail.latestHealth.failedBatches > 0 ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-50'],
                                        ['Événements perdus', agentDetail.latestHealth.droppedEvents, agentDetail.latestHealth.droppedEvents > 0 ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-50'],
                                    ].map(([label, value, cls]) => (
                                        <div key={label} className={`p-2.5 rounded-lg ${cls.split(' ').slice(1).join(' ')}`}>
                                            <p className={`${appConfig.text.minMetaClass} text-gray-400 uppercase`}>{label}</p>
                                            <p className={`text-lg font-bold ${cls.split(' ')[0]}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Erreurs système */}
                            {(agentDetail.latestHealth.enrollmentRetries > 0 ||
                                agentDetail.latestHealth.configRefreshFailures > 0 ||
                                agentDetail.latestHealth.componentRestarts > 0) && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                                        Compteurs d'erreurs
                                    </h4>
                                    <div className="flex gap-3 text-xs">
                                        {agentDetail.latestHealth.enrollmentRetries > 0 && (
                                            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
                                                Enrollment retries: {agentDetail.latestHealth.enrollmentRetries}
                                            </span>
                                        )}
                                        {agentDetail.latestHealth.configRefreshFailures > 0 && (
                                            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
                                                Config refresh: {agentDetail.latestHealth.configRefreshFailures}
                                            </span>
                                        )}
                                        {agentDetail.latestHealth.componentRestarts > 0 && (
                                            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
                                                Redémarrages: {agentDetail.latestHealth.componentRestarts}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mini-graphe heartbeat (composant amélioré) */}
                            <HeartbeatChart history={agentDetail.heartbeatHistory} />
                        </>
                    ) : (
                        <div className="flex flex-col items-center py-12 text-gray-400">
                            <AlertTriangle className="w-8 h-8 mb-2" />
                            <p className="text-sm">Agent introuvable.</p>
                        </div>
                    )}
                </div>

                {/* Footer avec bouton config (ADMIN uniquement) */}
                {isAdmin && agentDetail && (
                    <div className="flex justify-center px-6 py-3 border-t border-gray-100 shrink-0">
                        <button
                            onClick={onOpenConfig}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer"
                        >
                            <Settings className="w-4 h-4" />
                            Modifier la configuration
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
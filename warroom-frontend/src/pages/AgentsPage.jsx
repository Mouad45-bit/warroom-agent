// /src/pages/AgentsPage.jsx

// ══════════════════════════════════════════════════════════════
//  SUPERVISION DES AGENTS — Module 5
// ══════════════════════════════════════════════════════════════
//
//  Page accessible ADMIN et MANAGER uniquement.
//
//  Fonctionnalités :
//    - Liste des agents avec pastille de santé (GET /api/supervision/agents)
//    - Détail complet en modale (GET /api/supervision/agents/{id})
//      → composants, métriques de transmission, historique heartbeats
//    - Modification de config (PUT /api/admin/agents/{id}/config)
//      → ADMIN uniquement
//
//  Contrat d'API :
//    GET  /api/supervision/agents          → MANAGER, ADMIN
//    GET  /api/supervision/agents/{id}     → MANAGER, ADMIN
//    PUT  /api/admin/agents/{id}/config    → ADMIN uniquement
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AgentConfigModal from '../components/modals/agents/AgentConfigModal.jsx';
import {
    mockGetAgents,
    mockGetAgentDetail,
    mockUpdateAgentConfig,
} from '../api/mock/mockAgents.js';
import {
    Loader2,
    MonitorCheck,
    Cpu,
    HardDrive,
    Network,
    FileSearch,
    X,
    Settings,
    Activity,
    AlertTriangle,
} from 'lucide-react';

const USE_MOCK_API = true;

// ── Pastille de santé ────────────────────────────────────────
const HEALTH_COLORS = {
    GREEN:  { dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'Connecté' },
    ORANGE: { dot: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'Dégradé' },
    RED:    { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'Déconnecté' },
};

// ── Icônes de composants ─────────────────────────────────────
const COLLECTOR_ICONS = {
    LogCollector:           HardDrive,
    NetworkCollector:       Network,
    ProcessCollector:       Cpu,
    FileIntegrityCollector: FileSearch,
};

// ── Format relatif ───────────────────────────────────────────
function timeAgo(isoDate) {
    if (!isoDate) return '—';
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return `il y a ${diff}s`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
}

export default function AgentsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    // ── Liste ────────────────────────────────────────────────
    const [agents, setAgents] = useState([]);
    const [loadingList, setLoadingList] = useState(true);

    // ── Détail (modale) ──────────────────────────────────────
    const [detailOpen, setDetailOpen] = useState(false);
    const [agentDetail, setAgentDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── Config (modale) ──────────────────────────────────────
    const [configModal, setConfigModal] = useState({ isOpen: false });
    const [configSubmitting, setConfigSubmitting] = useState(false);
    const [configError, setConfigError] = useState(null);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT LISTE
    // ══════════════════════════════════════════════════════════
    const fetchAgents = useCallback(async () => {
        setLoadingList(true);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetAgents();
                setAgents(data);
            } else {
                const res = await api.get('/api/supervision/agents');
                setAgents(res.data);
            }
        } catch (err) {
            console.error('Erreur chargement agents :', err);
        }
        setLoadingList(false);
    }, []);

    useEffect(() => { fetchAgents(); }, [fetchAgents]);

    // ══════════════════════════════════════════════════════════
    //  DÉTAIL
    // ══════════════════════════════════════════════════════════
    const openDetail = async (agentId) => {
        setDetailOpen(true);
        setLoadingDetail(true);
        setAgentDetail(null);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetAgentDetail(agentId);
                setAgentDetail(data);
            } else {
                const res = await api.get(`/api/supervision/agents/${agentId}`);
                setAgentDetail(res.data);
            }
        } catch (err) {
            console.error('Erreur détail agent :', err);
        }
        setLoadingDetail(false);
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setAgentDetail(null);
    };

    // ══════════════════════════════════════════════════════════
    //  MODIFICATION CONFIG
    // ══════════════════════════════════════════════════════════
    const handleUpdateConfig = async (newConfig) => {
        if (!agentDetail) return;
        setConfigSubmitting(true);
        setConfigError(null);
        try {
            if (USE_MOCK_API) {
                await mockUpdateAgentConfig(agentDetail.agent.agentId, newConfig);
            } else {
                await api.put(`/api/admin/agents/${agentDetail.agent.agentId}/config`, newConfig);
            }
            // Rafraîchir le détail
            setAgentDetail(prev => ({
                ...prev,
                agent: {
                    ...prev.agent,
                    heartbeatIntervalSeconds: newConfig.heartbeatIntervalSeconds,
                    batchSize: newConfig.batchSize,
                    retryIntervalSeconds: newConfig.retryIntervalSeconds,
                    enabledCollectors: newConfig.enabledCollectors,
                },
            }));
            setConfigModal({ isOpen: false });
            fetchAgents(); // rafraîchir la liste aussi
        } catch (err) {
            setConfigError(err.response?.data?.message || 'Erreur lors de la modification.');
        }
        setConfigSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    return (
        <div className="p-8">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Supervision des agents
                </h1>
                <span className="text-xs text-gray-400">
                    {agents.length} agent{agents.length > 1 ? 's' : ''} enrôlé{agents.length > 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Liste des agents ────────────────────────────── */}
            {loadingList ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Agent</th>
                            <th className="px-6 py-4">OS</th>
                            <th className="px-6 py-4 text-center">Santé</th>
                            <th className="px-6 py-4">Dernier heartbeat</th>
                            <th className="px-6 py-4 text-center">Collecteurs</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {agents.map(agent => {
                            const h = HEALTH_COLORS[agent.healthStatus] || HEALTH_COLORS.RED;
                            return (
                                <tr
                                    key={agent.agentId}
                                    onClick={() => openDetail(agent.agentId)}
                                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                >
                                    {/* Hostname */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-600">
                                                <MonitorCheck className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{agent.hostname}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{agent.agentId}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* OS */}
                                    <td className="px-6 py-4 text-gray-500">
                                        {agent.osName} {agent.osVersion}
                                    </td>

                                    {/* Santé */}
                                    <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${h.bg} ${h.text}`}>
                                                <span className={`w-2 h-2 rounded-full ${h.dot}`} />
                                                {h.label}
                                            </span>
                                    </td>

                                    {/* Dernier heartbeat */}
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {timeAgo(agent.lastSeenAt)}
                                    </td>

                                    {/* Collecteurs */}
                                    <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-medium ${
                                                agent.activeCollectors === agent.totalCollectors
                                                    ? 'text-green-700'
                                                    : agent.activeCollectors === 0
                                                        ? 'text-red-600'
                                                        : 'text-amber-600'
                                            }`}>
                                                {agent.activeCollectors}/{agent.totalCollectors}
                                            </span>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                MODALE DÉTAIL AGENT
            ══════════════════════════════════════════════════ */}
            {detailOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
                    <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col">

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
                                onClick={closeDetail}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Contenu scrollable */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                            {loadingDetail ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                                </div>
                            ) : agentDetail ? (
                                <>
                                    {/* Infos générales */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
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
                                                            <p className={`text-[10px] ${isRunning ? 'text-green-600' : 'text-red-500'} truncate`}>
                                                                {comp.statusMessage}
                                                            </p>
                                                        </div>
                                                        {comp.restartCount > 0 && (
                                                            <span className="text-[10px] text-gray-400" title="Redémarrages">
                                                                ↻{comp.restartCount}
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isRunning ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
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
                                                    <p className="text-[10px] text-gray-400 uppercase">{label}</p>
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

                                    {/* Mini-graphe heartbeat (texte simplifié — barres) */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                                            Historique heartbeats — queuedEvents (20 derniers)
                                        </h4>
                                        <div className="flex items-end gap-0.5 h-16 bg-gray-50 rounded-lg p-2">
                                            {agentDetail.heartbeatHistory.map((hb, i) => {
                                                const maxQ = Math.max(...agentDetail.heartbeatHistory.map(h => h.queuedEvents), 1);
                                                const pct = (hb.queuedEvents / maxQ) * 100;
                                                const color = hb.healthStatus === 'GREEN'
                                                    ? 'bg-green-400'
                                                    : hb.healthStatus === 'ORANGE'
                                                        ? 'bg-amber-400'
                                                        : 'bg-red-400';
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`flex-1 rounded-sm ${color} transition-all`}
                                                        style={{ height: `${Math.max(pct, 4)}%` }}
                                                        title={`${hb.queuedEvents} events — ${hb.healthStatus}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
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
                                    onClick={() => {
                                        setConfigError(null);
                                        setConfigModal({ isOpen: true });
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer"
                                >
                                    <Settings className="w-4 h-4" />
                                    Modifier la configuration
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modale config ───────────────────────────────── */}
            <AgentConfigModal
                isOpen={configModal.isOpen}
                onClose={() => setConfigModal({ isOpen: false })}
                onConfirm={handleUpdateConfig}
                submitting={configSubmitting}
                error={configError}
                currentConfig={agentDetail?.agent ? {
                    heartbeatIntervalSeconds: agentDetail.agent.heartbeatIntervalSeconds,
                    batchSize: agentDetail.agent.batchSize,
                    retryIntervalSeconds: agentDetail.agent.retryIntervalSeconds,
                    enabledCollectors: agentDetail.agent.enabledCollectors,
                } : null}
            />
        </div>
    );
}
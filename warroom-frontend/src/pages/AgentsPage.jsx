// /src/pages/AgentsPage.jsx

// ══════════════════════════════════════════════════════════════
//  SUPERVISION DES AGENTS — Module 5
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { appConfig } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import AgentConfigModal from '../components/modals/agents/AgentConfigModal.jsx';
import AgentDetailModal from '../components/modals/agents/AgentDetailModal.jsx'; // ← NOUVEL IMPORT
import {
    getAgentDetail,
    getAgents,
    updateAgentConfig,
} from '../api/agentsApi';
import {
    mockGetAgents,
    mockGetAgentDetail,
    mockUpdateAgentConfig,
} from '../api/mock/mockAgents.js';
import { Loader2, MonitorCheck } from 'lucide-react';

const USE_MOCK_API = appConfig.useMockApi;

// ── Constantes pour la liste ─────────────────────────────────
const HEALTH_COLORS = {
    GREEN:  { dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'Connecté' },
    ORANGE: { dot: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'Dégradé' },
    RED:    { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'Déconnecté' },
};

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

    // ── Liste
    const [agents, setAgents] = useState([]);
    const [loadingList, setLoadingList] = useState(true);

    // ── Détail (modale)
    const [detailOpen, setDetailOpen] = useState(false);
    const [agentDetail, setAgentDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── Config (modale)
    const [configModal, setConfigModal] = useState({ isOpen: false });
    const [configSubmitting, setConfigSubmitting] = useState(false);
    const [configError, setConfigError] = useState(null);

    // ── CHARGEMENT LISTE
    const fetchAgents = useCallback(async () => {
        setLoadingList(true);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetAgents();
                setAgents(data);
            } else {
                const data = await getAgents();
                setAgents(data);
            }
        } catch (err) {
            console.error('Erreur chargement agents :', err);
        }
        setLoadingList(false);
    }, []);

    useEffect(() => {
        const loadAgents = async () => {
            await fetchAgents();
        };

        loadAgents();
    }, [fetchAgents]);

    // ── DÉTAIL
    const openDetail = async (agentId) => {
        setDetailOpen(true);
        setLoadingDetail(true);
        setAgentDetail(null);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetAgentDetail(agentId);
                setAgentDetail(data);
            } else {
                const data = await getAgentDetail(agentId);
                setAgentDetail(data);
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

    // ── MODIFICATION CONFIG
    const handleUpdateConfig = async (newConfig) => {
        if (!agentDetail) return;
        setConfigSubmitting(true);
        setConfigError(null);
        try {
            if (USE_MOCK_API) {
                await mockUpdateAgentConfig(agentDetail.agent.agentId, newConfig);
            } else {
                await updateAgentConfig(agentDetail.agent.agentId, newConfig);
            }
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
            fetchAgents();
        } catch (err) {
            setConfigError(err.response?.data?.message || 'Erreur lors de la modification.');
        }
        setConfigSubmitting(false);
    };

    return (
        <div className="p-8">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Supervision des agents
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {agents.length} agent{agents.length > 1 ? 's' : ''} enrôlé{agents.length > 1 ? 's' : ''}
                </p>
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

            {/* ── Modale Détail Agent ── */}
            <AgentDetailModal
                isOpen={detailOpen}
                agentDetail={agentDetail}
                loading={loadingDetail}
                onClose={closeDetail}
                isAdmin={isAdmin}
                onOpenConfig={() => {
                    setConfigError(null);
                    setConfigModal({ isOpen: true });
                }}
            />

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
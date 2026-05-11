// /src/components/modals/agents/AgentConfigModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE MODIFICATION DE CONFIGURATION AGENT — Module 5
// ══════════════════════════════════════════════════════════════
//
//  Props :
//    - isOpen, onClose, onConfirm, submitting, error
//    - currentConfig : { heartbeatIntervalSeconds, batchSize,
//                        retryIntervalSeconds, enabledCollectors }
//
//  Champs :
//    - heartbeatIntervalSeconds (10-300)
//    - batchSize (10-1000)
//    - retryIntervalSeconds (5-60)
//    - enabledCollectors (checkboxes)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { appConfig } from '../../../config/appConfig.js';

const ALL_COLLECTORS = [
    'LogCollector',
    'NetworkCollector',
    'ProcessCollector',
    'FileIntegrityCollector',
];

export default function AgentConfigModal({ isOpen, onClose, onConfirm, submitting, error, currentConfig }) {
    const [form, setForm] = useState({
        heartbeatIntervalSeconds: 30,
        batchSize: 100,
        retryIntervalSeconds: 10,
        enabledCollectors: [],
    });

    // Pré-remplir avec la config actuelle
    useEffect(() => {
        if (currentConfig) {
            setForm({
                heartbeatIntervalSeconds: currentConfig.heartbeatIntervalSeconds || 30,
                batchSize: currentConfig.batchSize || 100,
                retryIntervalSeconds: currentConfig.retryIntervalSeconds || 10,
                enabledCollectors: currentConfig.enabledCollectors || [],
            });
        }
    }, [currentConfig]);

    if (!isOpen) return null;

    const toggleCollector = (name) => {
        setForm(prev => ({
            ...prev,
            enabledCollectors: prev.enabledCollectors.includes(name)
                ? prev.enabledCollectors.filter(c => c !== name)
                : [...prev.enabledCollectors, name],
        }));
    };

    const handleSubmit = () => {
        onConfirm(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 sm:p-5 lg:p-6">

                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50">
                        <Settings className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Modifier la configuration</h3>
                        <p className="text-xs text-gray-400">Les changements seront appliqués au prochain refresh de l'agent.</p>
                    </div>
                </div>

                {/* Erreur */}
                {error && (
                    <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                        {error}
                    </div>
                )}

                {/* Champs numériques */}
                <div className="space-y-4 mb-5">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Intervalle de heartbeat (secondes)
                        </label>
                        <input
                            type="number"
                            min={10}
                            max={300}
                            value={form.heartbeatIntervalSeconds}
                            onChange={e => setForm(prev => ({ ...prev, heartbeatIntervalSeconds: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className={`${appConfig.text.minMetaClass} text-gray-400 mt-0.5`}>
                            Min: 10 — Max: 300
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Taille de batch
                        </label>
                        <input
                            type="number"
                            min={10}
                            max={1000}
                            value={form.batchSize}
                            onChange={e => setForm(prev => ({ ...prev, batchSize: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className={`${appConfig.text.minMetaClass} text-gray-400 mt-0.5`}>
                            Min: 10 — Max: 1000
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Intervalle de retry (secondes)
                        </label>
                        <input
                            type="number"
                            min={5}
                            max={60}
                            value={form.retryIntervalSeconds}
                            onChange={e => setForm(prev => ({ ...prev, retryIntervalSeconds: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className={`${appConfig.text.minMetaClass} text-gray-400 mt-0.5`}>
                            Min: 5 — Max: 60
                        </p>
                    </div>
                </div>

                {/* Collecteurs (checkboxes) */}
                <div className="mb-6">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Collecteurs actifs
                    </label>
                    <div className="space-y-2">
                        {ALL_COLLECTORS.map(name => (
                            <label key={name} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.enabledCollectors.includes(name)}
                                    onChange={() => toggleCollector(name)}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                                />
                                <span className="text-sm text-gray-700">{name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || form.enabledCollectors.length === 0}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Appliquer
                    </button>
                </div>
            </div>
        </div>
    );
}
// /src/components/ui/feedback/ActionFeedbackModal.jsx

import {
    AlertTriangle,
    CheckCircle2,
    Info,
    XCircle,
} from 'lucide-react';
import { ACTION_THEME } from '../../../config/actionTheme.js';

const VARIANT_ICON = {
    danger: AlertTriangle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
    error: XCircle,
    acknowledge: CheckCircle2,
    takeIncident: Info,
    escalate: Info,
    falsePositive: Info,
    addNote: Info,
    countermeasure: AlertTriangle,
    closeIncident: CheckCircle2,
    reassignIncident: Info,
    returnToL1: AlertTriangle,
    activateUser: CheckCircle2,
    disableUser: AlertTriangle,
};

export default function ActionFeedbackModal
    ({
         isOpen,
         mode,
         title,
         message,
         confirmText,
         cancelText = 'Annuler',
         variant = 'info',
         onConfirm,
         onCancel,
         onClose,
     }) {
    if (!isOpen) return null;

    const theme = ACTION_THEME[variant] || ACTION_THEME.info;
    const Icon = VARIANT_ICON[variant] || Info;

    const isConfirm = mode === 'confirm';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBg}`}>
                        <Icon className={`h-6 w-6 ${theme.iconText}`} />
                    </div>

                    <h3 className="mb-2 text-lg font-bold text-gray-900">
                        {title}
                    </h3>

                    {message && (
                        <p className="mb-6 text-sm leading-relaxed text-gray-500">
                            {message}
                        </p>
                    )}
                </div>

                {isConfirm ? (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
                        >
                            {cancelText}
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${theme.button}`}
                        >
                            {confirmText || 'Confirmer'}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onClose}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${theme.button}`}
                    >
                        D'accord
                    </button>
                )}
            </div>
        </div>
    );
}
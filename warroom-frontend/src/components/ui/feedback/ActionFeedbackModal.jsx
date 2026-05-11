// /src/components/ui/feedback/ActionFeedbackModal.jsx

import {
    AlertTriangle,
    CheckCircle2,
    Info,
    XCircle,
} from 'lucide-react';

const VARIANT_CONFIG = {
    danger: {
        icon: AlertTriangle,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        confirmBtn: 'bg-red-600 hover:bg-red-700',
    },
    success: {
        icon: CheckCircle2,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        confirmBtn: 'bg-green-600 hover:bg-green-700',
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        confirmBtn: 'bg-amber-500 hover:bg-amber-600',
    },
    info: {
        icon: Info,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        confirmBtn: 'bg-brand-600 hover:bg-brand-700',
    },
    error: {
        icon: XCircle,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        confirmBtn: 'bg-red-600 hover:bg-red-700',
    },
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

    const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
    const Icon = config.icon;

    const isConfirm = mode === 'confirm';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${config.iconBg}`}>
                        <Icon className={`h-6 w-6 ${config.iconColor}`} />
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
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors ${config.confirmBtn} cursor-pointer`}
                        >
                            {confirmText || 'Confirmer'}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onClose}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors ${config.confirmBtn} cursor-pointer`}
                    >
                        D'accord
                    </button>
                )}
            </div>
        </div>
    );
}
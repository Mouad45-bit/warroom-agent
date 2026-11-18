// /src/components/ConfirmModal.jsx

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ConfirmModal
    ({
         isOpen,
         onClose,
         onConfirm,
         title,
         message,
         type = 'danger',
         confirmText = 'Confirmer'
    }) {
    if (!isOpen) return null;

    const isDanger = type === 'danger';
    const Icon = isDanger ? AlertTriangle : CheckCircle2;

    // Couleurs dynamiques selon l'action
    const iconColor = isDanger ? 'text-red-600' : 'text-green-600';
    const iconBg = isDanger ? 'bg-red-100' : 'bg-green-100';
    const btnColor = isDanger
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-green-600 hover:bg-green-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 transform transition-all">

                {/* Icône centrale */}
                <div className="flex flex-col items-center text-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 ${iconBg}`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>

                    {/* Textes */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                        {message}
                    </p>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer ${btnColor}`}
                    >
                        {confirmText}
                    </button>
                </div>

            </div>
        </div>
    );
}
// /src/components/ui/feedback/ActionFeedbackProvider.jsx

import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import ActionFeedbackModal from './ActionFeedbackModal.jsx';

export const ActionFeedbackContext = createContext(null);

export function ActionFeedbackProvider({ children }) {
    const [modal, setModal] = useState(null);
    const resolverRef = useRef(null);

    const closeModal = useCallback(() => {
        setModal(null);
        resolverRef.current = null;
    }, []);

    const confirmAction = useCallback(
        ({
             title = 'Confirmation',
             message = '',
             confirmText = 'Confirmer',
             cancelText = 'Annuler',
             variant = 'danger',
         }) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;

            setModal({
                mode: 'confirm',
                title,
                message,
                confirmText,
                cancelText,
                variant,
            });
        });
    }, []);

    const showSuccess = useCallback(
        ({
             title = 'Action réussie',
             message = '',
             variant = 'success',
         }) => {
        setModal({
            mode: 'success',
            title,
            message,
            variant,
        });
    }, []);

    const showError = useCallback(
        ({
             title = 'Erreur',
             message = 'Une erreur est survenue.',
         }) => {
        setModal({
            mode: 'error',
            title,
            message,
            variant: 'error',
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (resolverRef.current) {
            resolverRef.current(true);
        }

        closeModal();
    }, [closeModal]);

    const handleCancel = useCallback(() => {
        if (resolverRef.current) {
            resolverRef.current(false);
        }

        closeModal();
    }, [closeModal]);

    const value = useMemo(() => ({
        confirmAction,
        showSuccess,
        showError,
    }), [confirmAction, showSuccess, showError]);

    return (
        <ActionFeedbackContext.Provider value={value}>
            {children}

            <ActionFeedbackModal
                isOpen={!!modal}
                mode={modal?.mode}
                title={modal?.title}
                message={modal?.message}
                confirmText={modal?.confirmText}
                cancelText={modal?.cancelText}
                variant={modal?.variant}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onClose={closeModal}
            />
        </ActionFeedbackContext.Provider>
    );
}
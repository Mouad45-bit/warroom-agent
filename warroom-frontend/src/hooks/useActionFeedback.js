// /src/hooks/useActionFeedback.js

import { useContext } from 'react';
import { ActionFeedbackContext } from '../components/ui/feedback/ActionFeedbackProvider.jsx';

export function useActionFeedback() {
    const context = useContext(ActionFeedbackContext);

    if (!context) {
        throw new Error('useActionFeedback doit être utilisé dans ActionFeedbackProvider.');
    }

    return context;
}
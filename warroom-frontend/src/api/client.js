import axios from 'axios';
import { appConfig } from '../config/appConfig';

export const api = axios.create({
    baseURL: appConfig.apiBaseUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    response => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message;
        const userMessage =
            message ||
            (status === 401
                ? 'Votre session a expiré. Veuillez vous reconnecter.'
                : status === 403
                  ? 'Vous n’êtes pas autorisé à effectuer cette action.'
                  : status >= 500
                    ? 'Une erreur serveur est survenue. Veuillez réessayer plus tard.'
                    : 'Une erreur inattendue est survenue.');

        error.userMessage = userMessage;

        if (status === 401) {
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
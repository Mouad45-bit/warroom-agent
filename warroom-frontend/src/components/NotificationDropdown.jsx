import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    ChevronDown,
    Inbox,
    Loader2,
} from 'lucide-react';
import {
    getNotifications,
    markNotificationRead,
} from '../api/notificationsApi';
import {
    mockGetNotifications,
    mockMarkNotificationRead,
} from '../api/mock/mockDashboard.js';
import { appConfig } from '../config/appConfig';

const USE_MOCK_API = appConfig.useMockApi;

function formatNotificationDate(createdAt) {
    if (!createdAt) return 'Date inconnue';

    return new Date(createdAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = USE_MOCK_API
                ? await mockGetNotifications(true)
                : await getNotifications({ unreadOnly: true });

            setNotifications(data || []);
        } catch (err) {
            console.error('Erreur chargement notifications :', err);
            setError(err.userMessage || 'Impossible de charger les notifications.');
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        let ignore = false;

        const initializeNotifications = async () => {
            try {
                const data = USE_MOCK_API
                    ? await mockGetNotifications(true)
                    : await getNotifications({ unreadOnly: true });

                if (!ignore) {
                    setNotifications(data || []);
                    setError('');
                }
            } catch (err) {
                console.error('Erreur chargement notifications :', err);

                if (!ignore) {
                    setError(err.userMessage || 'Impossible de charger les notifications.');
                }
            }

            if (!ignore) {
                setLoading(false);
            }
        };

        initializeNotifications();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const latestNotifications = useMemo(
        () => [...notifications]
            .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
            .slice(0, 10),
        [notifications]
    );

    const unreadCount = notifications.length;

    const toggleDropdown = () => {
        if (!isOpen) {
            loadNotifications();
        }

        setIsOpen(prev => !prev);
    };

    const handleNotificationClick = async (notification) => {
        const incidentId = notification.relatedIncidentId;

        setBusyId(notification.id);
        setError('');

        try {
            if (USE_MOCK_API) {
                await mockMarkNotificationRead(notification.id);
            } else {
                await markNotificationRead(notification.id);
            }

            setNotifications(prev => prev.filter(item => item.id !== notification.id));
        } catch (err) {
            console.error('Erreur marquage notification :', err);
            setError(err.userMessage || 'Impossible de marquer la notification comme lue.');
        }

        setBusyId(null);
        setIsOpen(false);
        navigate(incidentId ? `/incidents?id=${incidentId}` : '/incidents');
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={toggleDropdown}
                className="flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer"
            >
                <span className="flex items-center gap-3 min-w-0">
                    <span className="relative shrink-0">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </span>
                    <span className="truncate">Notifications</span>
                </span>
                <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Dernières notifications</p>
                            <p className="text-xs text-gray-400">
                                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Chargement...
                            </div>
                        ) : error ? (
                            <div className="px-4 py-5 space-y-3">
                                <p className="text-sm text-red-500">{error}</p>
                                <button
                                    type="button"
                                    onClick={loadNotifications}
                                    className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : latestNotifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-gray-400">
                                <Inbox className="w-8 h-8 text-gray-300" />
                                <p className="text-sm">Aucune notification non lue.</p>
                            </div>
                        ) : (
                            latestNotifications.map(notification => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleNotificationClick(notification)}
                                    disabled={busyId === notification.id}
                                    className="w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-wait disabled:bg-gray-50"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-700 leading-relaxed break-words">
                                                {notification.message}
                                            </p>
                                            <div className="mt-1 flex items-center justify-between gap-3">
                                                <span className="text-xs text-gray-400">
                                                    {formatNotificationDate(notification.createdAt)}
                                                </span>
                                                {busyId === notification.id && (
                                                    <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
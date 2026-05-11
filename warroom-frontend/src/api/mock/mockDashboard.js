// /src/api/mock/mockDashboard.js

// ══════════════════════════════════════════════════════════════
//  FAUSSES DONNÉES — Module 4 : Dashboard & Métriques
// ══════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ══════════════════════════════════════════════════════════════
//  GET /api/dashboard/stats
// ══════════════════════════════════════════════════════════════
export async function mockGetStats() {
    await delay();
    return {
        alertsByStatus: {
            NEW: 12,
            ACKNOWLEDGED: 8,
            FALSE_POSITIVE: 45,
            ESCALATED: 23,
        },
        alertsBySeverity: {
            CRITICAL: 3,
            HIGH: 5,
            MEDIUM: 4,
            LOW: 0,
            INFO: 0,
        },
        incidentsByStatus: {
            OPEN: 2,
            INVESTIGATING: 3,
            REMEDIATING: 1,
            RESOLVED: 1,
            CLOSED: 5,
            CLOSED_FALSE_POSITIVE: 2,
        },
        agentsConnected: 3,
        agentsWarning: 1,
        agentsDisconnected: 0,
        mttd24h: 342,
        mttr24h: 7200,
    };
}

// ══════════════════════════════════════════════════════════════
//  GET /api/dashboard/stats/manager
// ══════════════════════════════════════════════════════════════
export async function mockGetManagerStats() {
    await delay();
    return {
        incidentsByAssignee: [
            {
                userId: 3,
                fullName: 'Analyste Confirmé',
                openCount: 2,
                totalAssigned: 8,
                avgResolutionTimeSeconds: 5400,
            },
            {
                userId: 5,
                fullName: 'Karim Ouazzani',
                openCount: 1,
                totalAssigned: 4,
                avgResolutionTimeSeconds: 3600,
            },
        ],
        triageRateByL1: [
            {
                userId: 4,
                fullName: 'Analyste Junior',
                alertsTriaged24h: 15,
                avgTriageTimeSeconds: 180,
                falsePositiveRate: 0.13,
            },
        ],
    };
}

// ══════════════════════════════════════════════════════════════
//  GET /api/dashboard/notifications
// ══════════════════════════════════════════════════════════════
let notifications = [
    {
        id: 1,
        type: 'INCIDENT_ASSIGNED',
        message: 'Nouvel incident assigné : INC-0003 — Modification suspecte de /etc/shadow',
        relatedIncidentId: 3,
        read: false,
        createdAt: '2026-05-09T14:30:00Z',
    },
    {
        id: 2,
        type: 'INCIDENT_ASSIGNED',
        message: 'Nouvel incident assigné : INC-0007 — Tentatives RDP multiples',
        relatedIncidentId: 7,
        read: false,
        createdAt: '2026-05-09T10:45:00Z',
    },
    {
        id: 3,
        type: 'INCIDENT_RETURNED',
        message: 'L\'incident INC-0006 a été reclassifié en faux positif par Analyste Confirmé. Raison : Le domaine est le CDN interne.',
        relatedIncidentId: 6,
        read: false,
        createdAt: '2026-05-05T15:00:00Z',
    },
    {
        id: 4,
        type: 'INCIDENT_ASSIGNED',
        message: 'Nouvel incident assigné : INC-0001 — Attaque brute-force SSH',
        relatedIncidentId: 1,
        read: true,
        createdAt: '2026-05-09T08:15:00Z',
    },
];

export async function mockGetNotifications(unreadOnly = true) {
    await delay();
    if (unreadOnly) {
        return notifications.filter(n => !n.read);
    }
    return notifications;
}

// ══════════════════════════════════════════════════════════════
//  PUT /api/dashboard/notifications/{id}/read
// ══════════════════════════════════════════════════════════════
export async function mockMarkNotificationRead(notifId) {
    await delay(150);
    const notif = notifications.find(n => n.id === Number(notifId));
    if (notif) notif.read = true;
    return { message: 'Notification marquée comme lue' };
}
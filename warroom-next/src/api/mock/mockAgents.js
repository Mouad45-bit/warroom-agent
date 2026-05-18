// /src/api/mock/mockAgents.js

// ══════════════════════════════════════════════════════════════
//  FAUSSES DONNÉES — Module 5 : Supervision des agents
// ══════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ── Agents simulés ──────────────────────────────────────────
const agents = [
    {
        agentId: 'agt-a1b2c3d4',
        hostname: 'srv-web-01',
        osName: 'Ubuntu',
        osVersion: '22.04',
        lastSeenAt: new Date(Date.now() - 20 * 1000).toISOString(), // il y a 20s
        healthStatus: 'GREEN',
        activeCollectors: 4,
        totalCollectors: 4,
    },
    {
        agentId: 'agt-e5f6g7h8',
        hostname: 'srv-db-01',
        osName: 'CentOS',
        osVersion: '8.5',
        lastSeenAt: new Date(Date.now() - 150 * 1000).toISOString(), // il y a 2min30
        healthStatus: 'ORANGE',
        activeCollectors: 3,
        totalCollectors: 4,
    },
    {
        agentId: 'agt-i9j0k1l2',
        hostname: 'srv-app-02',
        osName: 'Ubuntu',
        osVersion: '20.04',
        lastSeenAt: new Date(Date.now() - 600 * 1000).toISOString(), // il y a 10min
        healthStatus: 'RED',
        activeCollectors: 0,
        totalCollectors: 4,
    },
    {
        agentId: 'agt-m3n4o5p6',
        hostname: 'srv-proxy-01',
        osName: 'Debian',
        osVersion: '12',
        lastSeenAt: new Date(Date.now() - 45 * 1000).toISOString(), // il y a 45s
        healthStatus: 'GREEN',
        activeCollectors: 4,
        totalCollectors: 4,
    },
];

// ── Détails par agent ───────────────────────────────────────
const agentDetails = {
    'agt-a1b2c3d4': {
        agent: {
            agentId: 'agt-a1b2c3d4',
            hostname: 'srv-web-01',
            osName: 'Ubuntu',
            osVersion: '22.04',
            agentVersion: '1.0',
            enrolledAt: '2026-05-01T08:00:00Z',
            lastSeenAt: new Date(Date.now() - 20 * 1000).toISOString(),
            healthStatus: 'GREEN',
            heartbeatIntervalSeconds: 30,
            batchSize: 100,
            retryIntervalSeconds: 10,
            enabledCollectors: ['LogCollector', 'NetworkCollector', 'ProcessCollector', 'FileIntegrityCollector'],
        },
        latestHealth: {
            timestamp: new Date(Date.now() - 20 * 1000).toISOString(),
            isRunning: true,
            queuedEvents: 5,
            deliveredEvents: 1240,
            failedBatches: 0,
            droppedEvents: 0,
            enrollmentRetries: 0,
            configRefreshFailures: 0,
            componentRestarts: 2,
            components: [
                { name: 'LogCollector', status: 'RUNNING', statusMessage: 'Tailing 3 fichiers', lastStartedAt: '2026-05-09T08:00:00Z', restartCount: 0 },
                { name: 'NetworkCollector', status: 'RUNNING', statusMessage: 'Capture sur eth0', lastStartedAt: '2026-05-09T08:00:00Z', restartCount: 1 },
                { name: 'ProcessCollector', status: 'RUNNING', statusMessage: 'Monitoring 142 processus', lastStartedAt: '2026-05-09T08:00:00Z', restartCount: 0 },
                { name: 'FileIntegrityCollector', status: 'RUNNING', statusMessage: 'Watching /etc, /var/log', lastStartedAt: '2026-05-09T08:00:00Z', restartCount: 1 },
            ],
        },
        heartbeatHistory: Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - (20 - i) * 30000).toISOString(),
            healthStatus: 'GREEN',
            queuedEvents: Math.floor(Math.random() * 15),
            deliveredEvents: 1200 + i * 2,
            isRunning: true,
        })),
    },
    'agt-e5f6g7h8': {
        agent: {
            agentId: 'agt-e5f6g7h8',
            hostname: 'srv-db-01',
            osName: 'CentOS',
            osVersion: '8.5',
            agentVersion: '1.0',
            enrolledAt: '2026-05-02T10:30:00Z',
            lastSeenAt: new Date(Date.now() - 150 * 1000).toISOString(),
            healthStatus: 'ORANGE',
            heartbeatIntervalSeconds: 30,
            batchSize: 50,
            retryIntervalSeconds: 15,
            enabledCollectors: ['LogCollector', 'NetworkCollector', 'ProcessCollector', 'FileIntegrityCollector'],
        },
        latestHealth: {
            timestamp: new Date(Date.now() - 150 * 1000).toISOString(),
            isRunning: true,
            queuedEvents: 42,
            deliveredEvents: 890,
            failedBatches: 3,
            droppedEvents: 12,
            enrollmentRetries: 0,
            configRefreshFailures: 1,
            componentRestarts: 5,
            components: [
                { name: 'LogCollector', status: 'RUNNING', statusMessage: 'Tailing 5 fichiers', lastStartedAt: '2026-05-09T07:00:00Z', restartCount: 0 },
                { name: 'NetworkCollector', status: 'RUNNING', statusMessage: 'Capture sur ens192', lastStartedAt: '2026-05-09T07:00:00Z', restartCount: 2 },
                { name: 'ProcessCollector', status: 'STOPPED', statusMessage: 'Erreur : permission denied /proc', lastStartedAt: '2026-05-09T07:00:00Z', restartCount: 3 },
                { name: 'FileIntegrityCollector', status: 'RUNNING', statusMessage: 'Watching /etc', lastStartedAt: '2026-05-09T07:00:00Z', restartCount: 0 },
            ],
        },
        heartbeatHistory: Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - (20 - i) * 30000).toISOString(),
            healthStatus: i > 15 ? 'ORANGE' : 'GREEN',
            queuedEvents: i > 15 ? 30 + Math.floor(Math.random() * 20) : Math.floor(Math.random() * 10),
            deliveredEvents: 850 + i * 2,
            isRunning: true,
        })),
    },
    'agt-i9j0k1l2': {
        agent: {
            agentId: 'agt-i9j0k1l2',
            hostname: 'srv-app-02',
            osName: 'Ubuntu',
            osVersion: '20.04',
            agentVersion: '1.0',
            enrolledAt: '2026-05-03T14:00:00Z',
            lastSeenAt: new Date(Date.now() - 600 * 1000).toISOString(),
            healthStatus: 'RED',
            heartbeatIntervalSeconds: 30,
            batchSize: 100,
            retryIntervalSeconds: 10,
            enabledCollectors: ['LogCollector', 'NetworkCollector', 'ProcessCollector', 'FileIntegrityCollector'],
        },
        latestHealth: {
            timestamp: new Date(Date.now() - 600 * 1000).toISOString(),
            isRunning: false,
            queuedEvents: 0,
            deliveredEvents: 456,
            failedBatches: 8,
            droppedEvents: 34,
            enrollmentRetries: 2,
            configRefreshFailures: 4,
            componentRestarts: 12,
            components: [
                { name: 'LogCollector', status: 'STOPPED', statusMessage: 'Agent arrêté', lastStartedAt: '2026-05-08T16:00:00Z', restartCount: 4 },
                { name: 'NetworkCollector', status: 'STOPPED', statusMessage: 'Agent arrêté', lastStartedAt: '2026-05-08T16:00:00Z', restartCount: 3 },
                { name: 'ProcessCollector', status: 'STOPPED', statusMessage: 'Agent arrêté', lastStartedAt: '2026-05-08T16:00:00Z', restartCount: 3 },
                { name: 'FileIntegrityCollector', status: 'STOPPED', statusMessage: 'Agent arrêté', lastStartedAt: '2026-05-08T16:00:00Z', restartCount: 2 },
            ],
        },
        heartbeatHistory: Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - (20 - i) * 30000).toISOString(),
            healthStatus: i < 10 ? 'GREEN' : i < 15 ? 'ORANGE' : 'RED',
            queuedEvents: i < 10 ? Math.floor(Math.random() * 8) : 0,
            deliveredEvents: 400 + (i < 10 ? i * 5 : 0),
            isRunning: i < 15,
        })),
    },
    'agt-m3n4o5p6': {
        agent: {
            agentId: 'agt-m3n4o5p6',
            hostname: 'srv-proxy-01',
            osName: 'Debian',
            osVersion: '12',
            agentVersion: '1.0',
            enrolledAt: '2026-05-04T09:15:00Z',
            lastSeenAt: new Date(Date.now() - 45 * 1000).toISOString(),
            healthStatus: 'GREEN',
            heartbeatIntervalSeconds: 30,
            batchSize: 200,
            retryIntervalSeconds: 10,
            enabledCollectors: ['LogCollector', 'NetworkCollector', 'ProcessCollector', 'FileIntegrityCollector'],
        },
        latestHealth: {
            timestamp: new Date(Date.now() - 45 * 1000).toISOString(),
            isRunning: true,
            queuedEvents: 2,
            deliveredEvents: 2100,
            failedBatches: 0,
            droppedEvents: 0,
            enrollmentRetries: 0,
            configRefreshFailures: 0,
            componentRestarts: 0,
            components: [
                { name: 'LogCollector', status: 'RUNNING', statusMessage: 'Tailing 8 fichiers', lastStartedAt: '2026-05-09T06:00:00Z', restartCount: 0 },
                { name: 'NetworkCollector', status: 'RUNNING', statusMessage: 'Capture sur bond0', lastStartedAt: '2026-05-09T06:00:00Z', restartCount: 0 },
                { name: 'ProcessCollector', status: 'RUNNING', statusMessage: 'Monitoring 87 processus', lastStartedAt: '2026-05-09T06:00:00Z', restartCount: 0 },
                { name: 'FileIntegrityCollector', status: 'RUNNING', statusMessage: 'Watching /etc, /opt', lastStartedAt: '2026-05-09T06:00:00Z', restartCount: 0 },
            ],
        },
        heartbeatHistory: Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - (20 - i) * 30000).toISOString(),
            healthStatus: 'GREEN',
            queuedEvents: Math.floor(Math.random() * 5),
            deliveredEvents: 2060 + i * 2,
            isRunning: true,
        })),
    },
};

// ══════════════════════════════════════════════════════════════
//  GET /api/supervision/agents
// ══════════════════════════════════════════════════════════════
export async function mockGetAgents() {
    await delay();
    return agents;
}

// ══════════════════════════════════════════════════════════════
//  GET /api/supervision/agents/{agentId}
// ══════════════════════════════════════════════════════════════
export async function mockGetAgentDetail(agentId) {
    await delay();
    return agentDetails[agentId] || null;
}

// ══════════════════════════════════════════════════════════════
//  PUT /api/admin/agents/{agentId}/config
// ══════════════════════════════════════════════════════════════
export async function mockUpdateAgentConfig(agentId, config) {
    await delay(400);
    const detail = agentDetails[agentId];
    if (detail) {
        detail.agent.heartbeatIntervalSeconds = config.heartbeatIntervalSeconds;
        detail.agent.batchSize = config.batchSize;
        detail.agent.retryIntervalSeconds = config.retryIntervalSeconds;
        detail.agent.enabledCollectors = config.enabledCollectors;
    }
    return {};
}
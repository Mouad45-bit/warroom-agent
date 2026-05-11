// /src/api/mock/mockAuditLog.js

// ══════════════════════════════════════════════════════════════
//  FAUSSES DONNÉES — Module 6 : Journal d'activité
// ══════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ── 50+ entrées variées couvrant tous les types d'action ────
const entries = [
    { id: 1, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'LOGIN', targetType: 'SESSION', targetId: '1', targetLabel: 'admin', details: null, createdAt: '2026-05-09T07:00:00Z' },
    { id: 2, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'USER_CREATED', targetType: 'USER', targetId: '2', targetLabel: 'mouad.l1', details: 'Rôle : L1', createdAt: '2026-05-09T07:02:00Z' },
    { id: 3, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'USER_CREATED', targetType: 'USER', targetId: '3', targetLabel: 'sara.l2', details: 'Rôle : L2', createdAt: '2026-05-09T07:03:00Z' },
    { id: 4, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'USER_CREATED', targetType: 'USER', targetId: '4', targetLabel: 'karim.l2', details: 'Rôle : L2', createdAt: '2026-05-09T07:04:00Z' },
    { id: 5, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'LOGOUT', targetType: 'SESSION', targetId: '1', targetLabel: 'admin', details: null, createdAt: '2026-05-09T07:10:00Z' },
    { id: 6, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'LOGIN', targetType: 'SESSION', targetId: '2', targetLabel: 'mouad.l1', details: null, createdAt: '2026-05-09T08:00:00Z' },
    { id: 7, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ACKNOWLEDGED', targetType: 'ALERT', targetId: '12', targetLabel: 'AUTH-BRUTE-01', details: null, createdAt: '2026-05-09T08:05:00Z' },
    { id: 8, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ACKNOWLEDGED', targetType: 'ALERT', targetId: '14', targetLabel: 'PROC-CPU-HIGH', details: null, createdAt: '2026-05-09T08:08:00Z' },
    { id: 9, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_FALSE_POSITIVE', targetType: 'ALERT', targetId: '14', targetLabel: 'PROC-CPU-HIGH', details: 'Compilation Maven en cours, CPU normal', createdAt: '2026-05-09T08:10:00Z' },
    { id: 10, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ESCALATED', targetType: 'ALERT', targetId: '12', targetLabel: 'AUTH-BRUTE-01', details: null, createdAt: '2026-05-09T08:15:00Z' },
    { id: 11, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'INCIDENT_CREATED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: 'Attaque brute-force depuis 192.168.1.50', createdAt: '2026-05-09T08:15:01Z' },
    { id: 12, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'LOGIN', targetType: 'SESSION', targetId: '3', targetLabel: 'sara.l2', details: null, createdAt: '2026-05-09T08:30:00Z' },
    { id: 13, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_TAKEN', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: null, createdAt: '2026-05-09T08:32:00Z' },
    { id: 14, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_STATUS_CHANGED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: 'OPEN → INVESTIGATING', createdAt: '2026-05-09T08:32:01Z' },
    { id: 15, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_STATUS_CHANGED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: 'INVESTIGATING → REMEDIATING', createdAt: '2026-05-09T09:00:00Z' },
    { id: 16, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_COUNTERMEASURE_ADDED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: 'BLOCK_IP', createdAt: '2026-05-09T09:05:00Z' },
    { id: 17, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_COUNTERMEASURE_ADDED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: 'DISABLE_ACCOUNT', createdAt: '2026-05-09T09:10:00Z' },
    { id: 18, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_NOTE_ADDED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: null, createdAt: '2026-05-09T09:15:00Z' },
    { id: 19, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'INCIDENT_NOTE_ADDED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: null, createdAt: '2026-05-09T09:20:00Z' },
    { id: 20, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_STATUS_CHANGED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: 'REMEDIATING → RESOLVED', createdAt: '2026-05-09T10:00:00Z' },
    { id: 21, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_CLOSED', targetType: 'INCIDENT', targetId: '1', targetLabel: 'INC-0001', details: null, createdAt: '2026-05-09T10:30:00Z' },
    { id: 22, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ACKNOWLEDGED', targetType: 'ALERT', targetId: '18', targetLabel: 'NET-SCAN-01', details: null, createdAt: '2026-05-09T10:45:00Z' },
    { id: 23, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ESCALATED', targetType: 'ALERT', targetId: '18', targetLabel: 'NET-SCAN-01', details: null, createdAt: '2026-05-09T10:50:00Z' },
    { id: 24, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'INCIDENT_CREATED', targetType: 'INCIDENT', targetId: '2', targetLabel: 'INC-0002', details: 'Scan de ports depuis 10.0.0.42', createdAt: '2026-05-09T10:50:01Z' },
    { id: 25, userId: 4, userFullName: 'Karim Ouazzani', userRole: 'L2', actionType: 'LOGIN', targetType: 'SESSION', targetId: '4', targetLabel: 'karim.l2', details: null, createdAt: '2026-05-09T11:00:00Z' },
    { id: 26, userId: 4, userFullName: 'Karim Ouazzani', userRole: 'L2', actionType: 'INCIDENT_TAKEN', targetType: 'INCIDENT', targetId: '2', targetLabel: 'INC-0002', details: null, createdAt: '2026-05-09T11:02:00Z' },
    { id: 27, userId: 4, userFullName: 'Karim Ouazzani', userRole: 'L2', actionType: 'INCIDENT_RETURNED', targetType: 'INCIDENT', targetId: '2', targetLabel: 'INC-0002', details: 'Scanner Nessus interne, pas un attaquant', createdAt: '2026-05-09T11:30:00Z' },
    { id: 28, userId: 5, userFullName: 'Manager SOC', userRole: 'MANAGER', actionType: 'LOGIN', targetType: 'SESSION', targetId: '5', targetLabel: 'manager', details: null, createdAt: '2026-05-09T12:00:00Z' },
    { id: 29, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ACKNOWLEDGED', targetType: 'ALERT', targetId: '20', targetLabel: 'FILE-SHADOW-MOD', details: null, createdAt: '2026-05-09T12:30:00Z' },
    { id: 30, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ESCALATED', targetType: 'ALERT', targetId: '20', targetLabel: 'FILE-SHADOW-MOD', details: null, createdAt: '2026-05-09T12:35:00Z' },
    { id: 31, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'INCIDENT_CREATED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: 'Modification suspecte de /etc/shadow', createdAt: '2026-05-09T12:35:01Z' },
    { id: 32, userId: 5, userFullName: 'Manager SOC', userRole: 'MANAGER', actionType: 'INCIDENT_REASSIGNED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: '→ Sara El Amrani', createdAt: '2026-05-09T12:40:00Z' },
    { id: 33, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_STATUS_CHANGED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: 'OPEN → INVESTIGATING', createdAt: '2026-05-09T12:45:00Z' },
    { id: 34, userId: 5, userFullName: 'Manager SOC', userRole: 'MANAGER', actionType: 'INCIDENT_NOTE_ADDED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: null, createdAt: '2026-05-09T12:50:00Z' },
    { id: 35, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'LOGIN', targetType: 'SESSION', targetId: '1', targetLabel: 'admin', details: null, createdAt: '2026-05-09T13:00:00Z' },
    { id: 36, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'AGENT_CONFIG_CHANGED', targetType: 'AGENT', targetId: 'agt-a1b2c3d4', targetLabel: 'srv-web-01', details: 'batchSize: 50 → 100', createdAt: '2026-05-09T13:05:00Z' },
    { id: 37, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'AGENT_CONFIG_CHANGED', targetType: 'AGENT', targetId: 'agt-e5f6g7h8', targetLabel: 'srv-db-01', details: 'enabledCollectors: retiré ProcessCollector', createdAt: '2026-05-09T13:10:00Z' },
    { id: 38, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_FALSE_POSITIVE', targetType: 'ALERT', targetId: '22', targetLabel: 'PROC-CPU-HIGH', details: 'Build Docker en cours', createdAt: '2026-05-09T13:30:00Z' },
    { id: 39, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_FALSE_POSITIVE', targetType: 'ALERT', targetId: '23', targetLabel: 'NET-DNS-UNUSUAL', details: 'Mise à jour apt en cours', createdAt: '2026-05-09T13:35:00Z' },
    { id: 40, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_COUNTERMEASURE_ADDED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: 'ISOLATE_MACHINE', createdAt: '2026-05-09T13:40:00Z' },
    { id: 41, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_STATUS_CHANGED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: 'INVESTIGATING → REMEDIATING', createdAt: '2026-05-09T13:45:00Z' },
    { id: 42, userId: null, userFullName: '—', userRole: '—', actionType: 'LOGIN_FAILED', targetType: 'SESSION', targetId: null, targetLabel: 'unknown_user', details: 'Identifiants invalides', createdAt: '2026-05-09T14:00:00Z' },
    { id: 43, userId: null, userFullName: '—', userRole: '—', actionType: 'LOGIN_FAILED', targetType: 'SESSION', targetId: null, targetLabel: 'admin', details: 'Identifiants invalides', createdAt: '2026-05-09T14:00:05Z' },
    { id: 44, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'USER_CREATED', targetType: 'USER', targetId: '6', targetLabel: 'newuser.l1', details: 'Rôle : L1', createdAt: '2026-05-09T14:10:00Z' },
    { id: 45, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'USER_DISABLED', targetType: 'USER', targetId: '6', targetLabel: 'newuser.l1', details: null, createdAt: '2026-05-09T14:12:00Z' },
    { id: 46, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_STATUS_CHANGED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: 'REMEDIATING → RESOLVED', createdAt: '2026-05-09T14:20:00Z' },
    { id: 47, userId: 3, userFullName: 'Sara El Amrani', userRole: 'L2', actionType: 'INCIDENT_CLOSED', targetType: 'INCIDENT', targetId: '3', targetLabel: 'INC-0003', details: null, createdAt: '2026-05-09T14:30:00Z' },
    { id: 48, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ACKNOWLEDGED', targetType: 'ALERT', targetId: '25', targetLabel: 'AUTH-SSH-ROOT', details: null, createdAt: '2026-05-09T14:45:00Z' },
    { id: 49, userId: 4, userFullName: 'Karim Ouazzani', userRole: 'L2', actionType: 'LOGOUT', targetType: 'SESSION', targetId: '4', targetLabel: 'karim.l2', details: null, createdAt: '2026-05-09T15:00:00Z' },
    { id: 50, userId: 5, userFullName: 'Manager SOC', userRole: 'MANAGER', actionType: 'LOGOUT', targetType: 'SESSION', targetId: '5', targetLabel: 'manager', details: null, createdAt: '2026-05-09T15:30:00Z' },
    { id: 51, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'ALERT_ESCALATED', targetType: 'ALERT', targetId: '25', targetLabel: 'AUTH-SSH-ROOT', details: null, createdAt: '2026-05-09T14:50:00Z' },
    { id: 52, userId: 2, userFullName: 'Mouad Lahlou', userRole: 'L1', actionType: 'INCIDENT_CREATED', targetType: 'INCIDENT', targetId: '4', targetLabel: 'INC-0004', details: 'Connexion SSH root depuis IP inconnue', createdAt: '2026-05-09T14:50:01Z' },
    { id: 53, userId: 1, userFullName: 'Admin Principal', userRole: 'ADMIN', actionType: 'USER_ENABLED', targetType: 'USER', targetId: '6', targetLabel: 'newuser.l1', details: null, createdAt: '2026-05-09T15:40:00Z' },
];

// ══════════════════════════════════════════════════════════════
//  GET /api/admin/audit-log
// ══════════════════════════════════════════════════════════════
export async function mockGetAuditLog({ page = 0, size = 30, userId, actionType, targetType, from, to } = {}) {
    await delay();

    let filtered = [...entries];

    if (userId) {
        filtered = filtered.filter(e => e.userId === Number(userId));
    }
    if (actionType) {
        const types = Array.isArray(actionType) ? actionType : [actionType];
        filtered = filtered.filter(e => types.includes(e.actionType));
    }
    if (targetType) {
        filtered = filtered.filter(e => e.targetType === targetType);
    }
    if (from) {
        filtered = filtered.filter(e => e.createdAt >= from);
    }
    if (to) {
        filtered = filtered.filter(e => e.createdAt <= to);
    }

    // Tri par date DESC
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const start = page * size;
    const content = filtered.slice(start, start + size);

    return {
        content,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
        number: page,
    };
}

// ── Liste des utilisateurs distincts (pour le filtre dropdown) ──
export function mockGetAuditUsers() {
    const map = new Map();
    entries.forEach(e => {
        if (e.userId && !map.has(e.userId)) {
            map.set(e.userId, { userId: e.userId, fullName: e.userFullName, role: e.userRole });
        }
    });
    return [...map.values()];
}
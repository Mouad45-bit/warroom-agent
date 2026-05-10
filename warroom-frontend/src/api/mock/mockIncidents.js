// /src/api/mockIncidents.js

// ══════════════════════════════════════════════════════════════
//  FAUSSES DONNÉES — Module 2 : Incidents & Statuts
// ══════════════════════════════════════════════════════════════
//
//  Même approche que mockAlerts.js :
//    - Données réalistes pour coder l'UI sans backend
//    - Fonctions qui imitent les réponses de l'API (contrat §2)
//    - Délai artificiel de 300ms pour simuler le réseau
//
//  Quand le backend sera prêt, il suffira de passer
//  USE_MOCK_API = false dans IncidentsPage.jsx.
// ══════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ── Utilisateurs L2 disponibles pour l'assignation ──────────
const L2_USERS = [
    { userId: 3, fullName: 'Sara El Amrani' },
    { userId: 4, fullName: 'Ahmed Benali' },
    { userId: 7, fullName: 'Karim Ouazzani' },
];

// ── Incidents simulés ───────────────────────────────────────
let incidents = [
    {
        id: 1,
        incidentNumber: 'INC-0001',
        title: 'AUTH-BRUTE-01 — Attaque brute-force depuis 192.168.1.50',
        severity: 'HIGH',
        status: 'INVESTIGATING',
        assignedToUserId: 3,
        assignedToFullName: 'Sara El Amrani',
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: '5 échecs SSH en 30s depuis la même IP. Pas de scan planifié.',
        createdAt: '2026-05-09T08:15:00Z',
        updatedAt: '2026-05-09T09:30:00Z',
    },
    {
        id: 2,
        incidentNumber: 'INC-0002',
        title: 'NET-SCAN-01 — Scan de ports détecté depuis 10.0.0.42',
        severity: 'CRITICAL',
        status: 'OPEN',
        assignedToUserId: null,
        assignedToFullName: null,
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: 'Scan SYN sur les ports 22, 80, 443, 3306, 8080. Source interne suspecte.',
        createdAt: '2026-05-09T09:00:00Z',
        updatedAt: '2026-05-09T09:00:00Z',
    },
    {
        id: 3,
        incidentNumber: 'INC-0003',
        title: 'FILE-MOD-01 — Modification suspecte de /etc/shadow',
        severity: 'CRITICAL',
        status: 'REMEDIATING',
        assignedToUserId: 4,
        assignedToFullName: 'Ahmed Benali',
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: 'Le fichier /etc/shadow a été modifié hors d\'une fenêtre de maintenance. Aucun ticket de changement ouvert.',
        createdAt: '2026-05-08T14:30:00Z',
        updatedAt: '2026-05-09T07:45:00Z',
    },
    {
        id: 4,
        incidentNumber: 'INC-0004',
        title: 'PROC-CPU-HIGH — Processus suspect consommant 98% CPU',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        assignedToUserId: 3,
        assignedToFullName: 'Sara El Amrani',
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: 'Processus "xmrig" non reconnu, consommation CPU anormale. Possible crypto-miner.',
        createdAt: '2026-05-07T16:00:00Z',
        updatedAt: '2026-05-08T11:20:00Z',
    },
    {
        id: 5,
        incidentNumber: 'INC-0005',
        title: 'AUTH-PRIV-01 — Élévation de privilèges via sudo',
        severity: 'HIGH',
        status: 'CLOSED',
        assignedToUserId: 4,
        assignedToFullName: 'Ahmed Benali',
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: 'L\'utilisateur "deploy" a exécuté sudo sans être dans le groupe sudoers. Attaque ou mauvaise configuration.',
        createdAt: '2026-05-06T10:00:00Z',
        updatedAt: '2026-05-07T09:00:00Z',
    },
    {
        id: 6,
        incidentNumber: 'INC-0006',
        title: 'NET-DNS-01 — Requêtes DNS suspectes vers domaine inconnu',
        severity: 'LOW',
        status: 'CLOSED_FALSE_POSITIVE',
        assignedToUserId: 3,
        assignedToFullName: 'Sara El Amrani',
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: 'Requêtes DNS répétées vers "update.internal-cdn.xyz". Domaine non listé.',
        createdAt: '2026-05-05T12:00:00Z',
        updatedAt: '2026-05-05T15:00:00Z',
    },
    {
        id: 7,
        incidentNumber: 'INC-0007',
        title: 'AUTH-BRUTE-02 — Tentatives RDP multiples depuis 172.16.0.99',
        severity: 'HIGH',
        status: 'INVESTIGATING',
        assignedToUserId: 7,
        assignedToFullName: 'Karim Ouazzani',
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: '12 tentatives de connexion RDP échouées en 2 minutes.',
        createdAt: '2026-05-09T10:30:00Z',
        updatedAt: '2026-05-09T10:45:00Z',
    },
    {
        id: 8,
        incidentNumber: 'INC-0008',
        title: 'FILE-INTEG-01 — Checksum modifié sur /usr/bin/sshd',
        severity: 'CRITICAL',
        status: 'OPEN',
        assignedToUserId: null,
        assignedToFullName: null,
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote: 'Le binaire sshd ne correspond plus au checksum de référence. Potentiel backdoor.',
        createdAt: '2026-05-09T11:00:00Z',
        updatedAt: '2026-05-09T11:00:00Z',
    },
];

// ── Timelines par incident ──────────────────────────────────
const timelines = {
    1: [
        {
            id: 1,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-09T08:15:00Z',
        },
        {
            id: 2,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Prise en charge. Début de l\'investigation.',
            oldStatus: 'OPEN',
            newStatus: 'INVESTIGATING',
            createdAt: '2026-05-09T08:25:00Z',
        },
        {
            id: 3,
            entryType: 'NOTE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'L\'IP 192.168.1.50 est une machine du réseau invité. Vérification des logs SSH en cours.',
            oldStatus: null,
            newStatus: null,
            createdAt: '2026-05-09T09:00:00Z',
        },
        {
            id: 4,
            entryType: 'NOTE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'J\'ai vérifié, cette IP n\'apparaît pas dans la whitelist du scanner Nessus.',
            oldStatus: null,
            newStatus: null,
            createdAt: '2026-05-09T09:30:00Z',
        },
    ],
    2: [
        {
            id: 5,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé — assigné au pool L2',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-09T09:00:00Z',
        },
    ],
    3: [
        {
            id: 6,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-08T14:30:00Z',
        },
        {
            id: 7,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Prise en charge. Analyse du fichier /etc/shadow.',
            oldStatus: 'OPEN',
            newStatus: 'INVESTIGATING',
            createdAt: '2026-05-08T14:45:00Z',
        },
        {
            id: 8,
            entryType: 'NOTE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Modification faite par le compte "root" à 14h22. Vérification des sessions root actives.',
            oldStatus: null,
            newStatus: null,
            createdAt: '2026-05-08T15:30:00Z',
        },
        {
            id: 9,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Cause identifiée : accès root non autorisé via SSH. Passage en remédiation.',
            oldStatus: 'INVESTIGATING',
            newStatus: 'REMEDIATING',
            createdAt: '2026-05-09T07:00:00Z',
        },
        {
            id: 10,
            entryType: 'COUNTERMEASURE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Blocage de l\'IP source et changement du mot de passe root.',
            oldStatus: null,
            newStatus: null,
            countermeasureType: 'BLOCK_IP',
            technicalCommand: 'iptables -A INPUT -s 10.0.0.15 -j DROP && passwd root',
            createdAt: '2026-05-09T07:30:00Z',
        },
    ],
    4: [
        {
            id: 11,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-07T16:00:00Z',
        },
        {
            id: 12,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Prise en charge.',
            oldStatus: 'OPEN',
            newStatus: 'INVESTIGATING',
            createdAt: '2026-05-07T16:15:00Z',
        },
        {
            id: 13,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Processus xmrig identifié comme crypto-miner. Passage en remédiation.',
            oldStatus: 'INVESTIGATING',
            newStatus: 'REMEDIATING',
            createdAt: '2026-05-07T17:00:00Z',
        },
        {
            id: 14,
            entryType: 'COUNTERMEASURE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Processus xmrig tué et binaire supprimé.',
            oldStatus: null,
            newStatus: null,
            countermeasureType: 'OTHER',
            technicalCommand: 'kill -9 $(pgrep xmrig) && rm -f /tmp/.xmrig',
            createdAt: '2026-05-07T17:15:00Z',
        },
        {
            id: 15,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Processus éliminé, CPU revenu à la normale. Surveillance en cours.',
            oldStatus: 'REMEDIATING',
            newStatus: 'RESOLVED',
            createdAt: '2026-05-08T11:20:00Z',
        },
    ],
    5: [
        {
            id: 16,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-06T10:00:00Z',
        },
        {
            id: 17,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Prise en charge.',
            oldStatus: 'OPEN',
            newStatus: 'INVESTIGATING',
            createdAt: '2026-05-06T10:20:00Z',
        },
        {
            id: 18,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Compte "deploy" n\'aurait pas dû avoir accès sudo. Correction en cours.',
            oldStatus: 'INVESTIGATING',
            newStatus: 'REMEDIATING',
            createdAt: '2026-05-06T12:00:00Z',
        },
        {
            id: 19,
            entryType: 'COUNTERMEASURE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Retrait du compte deploy du groupe sudo.',
            oldStatus: null,
            newStatus: null,
            countermeasureType: 'DISABLE_ACCOUNT',
            technicalCommand: 'deluser deploy sudo',
            createdAt: '2026-05-06T12:15:00Z',
        },
        {
            id: 20,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Accès sudo retiré. Aucune trace d\'exploitation malveillante.',
            oldStatus: 'REMEDIATING',
            newStatus: 'RESOLVED',
            createdAt: '2026-05-06T16:00:00Z',
        },
        {
            id: 21,
            entryType: 'CLOSURE',
            authorFullName: 'Ahmed Benali',
            authorRole: 'L2',
            content: 'Incident résolu. Le compte deploy n\'avait pas accès légitime à sudo. Configuration corrigée. Recommandation : auditer tous les comptes de service pour les droits sudo.',
            oldStatus: 'RESOLVED',
            newStatus: 'CLOSED',
            createdAt: '2026-05-07T09:00:00Z',
        },
    ],
    6: [
        {
            id: 22,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-05T12:00:00Z',
        },
        {
            id: 23,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Prise en charge.',
            oldStatus: 'OPEN',
            newStatus: 'INVESTIGATING',
            createdAt: '2026-05-05T12:10:00Z',
        },
        {
            id: 24,
            entryType: 'CLOSURE',
            authorFullName: 'Sara El Amrani',
            authorRole: 'L2',
            content: 'Le domaine "update.internal-cdn.xyz" est en réalité le CDN interne configuré par l\'équipe DevOps. Faux positif confirmé.',
            oldStatus: 'INVESTIGATING',
            newStatus: 'CLOSED_FALSE_POSITIVE',
            createdAt: '2026-05-05T15:00:00Z',
        },
    ],
    7: [
        {
            id: 25,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-09T10:30:00Z',
        },
        {
            id: 26,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Karim Ouazzani',
            authorRole: 'L2',
            content: 'Prise en charge. Analyse des logs RDP.',
            oldStatus: 'OPEN',
            newStatus: 'INVESTIGATING',
            createdAt: '2026-05-09T10:45:00Z',
        },
    ],
    8: [
        {
            id: 27,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé — assigné au pool L2',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: '2026-05-09T11:00:00Z',
        },
    ],
};

// ── Alertes sources liées aux incidents ──────────────────────
const incidentAlerts = {
    1: [
        { id: 1, severity: 'HIGH', message: 'Failed password for root from 192.168.1.50 port 44122 ssh2', ruleId: 'AUTH-BRUTE-01', createdAt: '2026-05-09T08:10:00Z' },
        { id: 2, severity: 'HIGH', message: 'Failed password for root from 192.168.1.50 port 44123 ssh2', ruleId: 'AUTH-BRUTE-01', createdAt: '2026-05-09T08:11:00Z' },
    ],
    2: [
        { id: 5, severity: 'CRITICAL', message: 'SYN scan detected from 10.0.0.42 targeting ports 22,80,443,3306,8080', ruleId: 'NET-SCAN-01', createdAt: '2026-05-09T08:55:00Z' },
    ],
    3: [
        { id: 8, severity: 'CRITICAL', message: 'File /etc/shadow modified — checksum mismatch', ruleId: 'FILE-MOD-01', createdAt: '2026-05-08T14:25:00Z' },
    ],
    4: [
        { id: 10, severity: 'MEDIUM', message: 'Process "xmrig" consuming 98% CPU', ruleId: 'PROC-CPU-HIGH', createdAt: '2026-05-07T15:55:00Z' },
    ],
    5: [
        { id: 12, severity: 'HIGH', message: 'User "deploy" executed sudo without being in sudoers', ruleId: 'AUTH-PRIV-01', createdAt: '2026-05-06T09:55:00Z' },
    ],
    6: [
        { id: 14, severity: 'LOW', message: 'Repeated DNS queries to unknown domain update.internal-cdn.xyz', ruleId: 'NET-DNS-01', createdAt: '2026-05-05T11:55:00Z' },
    ],
    7: [
        { id: 16, severity: 'HIGH', message: '12 failed RDP login attempts from 172.16.0.99 in 120s', ruleId: 'AUTH-BRUTE-02', createdAt: '2026-05-09T10:25:00Z' },
    ],
    8: [
        { id: 18, severity: 'CRITICAL', message: 'Binary /usr/bin/sshd checksum mismatch — possible backdoor', ruleId: 'FILE-INTEG-01', createdAt: '2026-05-09T10:55:00Z' },
    ],
};

// ── Compteur pour les IDs auto-incrémentés ───────────────────
let nextIncidentId = 9;
let nextTimelineId = 28;
let nextIncidentNumber = 9;

// ══════════════════════════════════════════════════════════════
//  TRANSITIONS DE STATUT AUTORISÉES (contrat §1)
// ══════════════════════════════════════════════════════════════
const ALLOWED_TRANSITIONS = {
    OPEN: ['INVESTIGATING'],
    INVESTIGATING: ['REMEDIATING'],
    REMEDIATING: ['RESOLVED', 'INVESTIGATING'],
    RESOLVED: ['CLOSED', 'REMEDIATING'],
};

export function getAllowedTransitions(currentStatus) {
    return ALLOWED_TRANSITIONS[currentStatus] || [];
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Liste des L2 disponibles
// ══════════════════════════════════════════════════════════════
export async function mockGetL2Users() {
    await delay();
    return L2_USERS;
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Lister les incidents (GET /api/incidents)
// ══════════════════════════════════════════════════════════════
export async function mockGetIncidents({ page = 0, size = 20, status = [], severity = [], assignedTo = null } = {}) {
    await delay();

    let filtered = [...incidents];

    // Filtre par statut
    if (status.length > 0) {
        filtered = filtered.filter(i => status.includes(i.status));
    }

    // Filtre par sévérité
    if (severity.length > 0) {
        filtered = filtered.filter(i => severity.includes(i.severity));
    }

    // Filtre par assigné
    if (assignedTo) {
        filtered = filtered.filter(i => i.assignedToUserId === Number(assignedTo));
    }

    // Tri : sévérité DESC puis date DESC
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    filtered.sort((a, b) => {
        const sev = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
        if (sev !== 0) return sev;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Pagination
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size);
    const start = page * size;
    const content = filtered.slice(start, start + size);

    return { content, totalElements, totalPages, number: page };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Détail d'un incident (GET /api/incidents/{id})
// ══════════════════════════════════════════════════════════════
export async function mockGetIncidentDetail(incidentId) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    return {
        incident,
        alerts: incidentAlerts[incident.id] || [],
        timeline: timelines[incident.id] || [],
    };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Prendre en charge (PUT /api/incidents/{id}/take)
// ══════════════════════════════════════════════════════════════
export async function mockTakeIncident(incidentId, userId, fullName) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    if (incident.assignedToUserId && incident.assignedToUserId !== userId) {
        throw { response: { status: 409, data: { message: `Cet incident a déjà été pris en charge par ${incident.assignedToFullName}` } } };
    }

    incident.assignedToUserId = userId;
    incident.assignedToFullName = fullName;
    incident.status = 'INVESTIGATING';
    incident.updatedAt = new Date().toISOString();

    // Ajouter à la timeline
    const entry = {
        id: nextTimelineId++,
        entryType: 'STATUS_CHANGE',
        authorFullName: fullName,
        authorRole: 'L2',
        content: 'Prise en charge.',
        oldStatus: 'OPEN',
        newStatus: 'INVESTIGATING',
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    return { message: 'Incident pris en charge', status: 'INVESTIGATING' };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Changer le statut (PUT /api/incidents/{id}/status)
// ══════════════════════════════════════════════════════════════
export async function mockChangeStatus(incidentId, newStatus, note) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    const allowed = getAllowedTransitions(incident.status);
    if (!allowed.includes(newStatus)) {
        throw { response: { status: 400, data: { message: `Transition ${incident.status} → ${newStatus} interdite` } } };
    }

    const oldStatus = incident.status;
    incident.status = newStatus;
    incident.updatedAt = new Date().toISOString();

    const entry = {
        id: nextTimelineId++,
        entryType: 'STATUS_CHANGE',
        authorFullName: incident.assignedToFullName,
        authorRole: 'L2',
        content: note,
        oldStatus,
        newStatus,
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    return { message: 'Statut mis à jour', oldStatus, newStatus };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Réassigner (PUT /api/incidents/{id}/reassign)
// ══════════════════════════════════════════════════════════════
export async function mockReassignIncident(incidentId, newAssigneeUserId, note) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    const newUser = L2_USERS.find(u => u.userId === Number(newAssigneeUserId));
    if (!newUser) throw new Error('Utilisateur introuvable');

    const oldAssignee = incident.assignedToFullName;
    incident.assignedToUserId = newUser.userId;
    incident.assignedToFullName = newUser.fullName;
    incident.updatedAt = new Date().toISOString();

    const entry = {
        id: nextTimelineId++,
        entryType: 'REASSIGNMENT',
        authorFullName: 'Manager SOC',
        authorRole: 'MANAGER',
        content: `Réassigné de ${oldAssignee || 'Pool L2'} à ${newUser.fullName}. ${note}`,
        oldStatus: null,
        newStatus: null,
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    return { message: 'Incident réassigné' };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Renvoyer au L1 (PUT /api/incidents/{id}/return-to-l1)
// ══════════════════════════════════════════════════════════════
export async function mockReturnToL1(incidentId, justification) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    incident.status = 'CLOSED_FALSE_POSITIVE';
    incident.updatedAt = new Date().toISOString();

    const entry = {
        id: nextTimelineId++,
        entryType: 'CLOSURE',
        authorFullName: incident.assignedToFullName,
        authorRole: 'L2',
        content: justification,
        oldStatus: incident.status,
        newStatus: 'CLOSED_FALSE_POSITIVE',
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    return { message: 'Incident renvoyé au L1 comme faux positif' };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Clôturer (PUT /api/incidents/{id}/close)
// ══════════════════════════════════════════════════════════════
export async function mockCloseIncident(incidentId, summary) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    if (incident.status !== 'RESOLVED') {
        throw { response: { status: 400, data: { message: 'L\'incident doit être en statut RESOLVED pour être clôturé' } } };
    }

    incident.status = 'CLOSED';
    incident.updatedAt = new Date().toISOString();

    const entry = {
        id: nextTimelineId++,
        entryType: 'CLOSURE',
        authorFullName: incident.assignedToFullName,
        authorRole: 'L2',
        content: summary,
        oldStatus: 'RESOLVED',
        newStatus: 'CLOSED',
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    return { message: 'Incident clôturé' };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Ajouter une note (POST /api/incidents/{id}/notes)
// ══════════════════════════════════════════════════════════════
export async function mockAddNote(incidentId, content, authorFullName, authorRole) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    const entry = {
        id: nextTimelineId++,
        entryType: 'NOTE',
        authorFullName,
        authorRole,
        content,
        oldStatus: null,
        newStatus: null,
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    return { message: 'Note ajoutée' };
}

// ══════════════════════════════════════════════════════════════
//  FONCTION : Créer un incident (POST /api/incidents)
//  Utilisé par le bouton "Escalader" de la file d'alertes
// ══════════════════════════════════════════════════════════════
export async function mockCreateIncident({ title, severity, triageNote, assignedToUserId, alertIds }) {
    await delay();

    const assignedUser = assignedToUserId ? L2_USERS.find(u => u.userId === Number(assignedToUserId)) : null;

    const incident = {
        id: nextIncidentId++,
        incidentNumber: `INC-${String(nextIncidentNumber++).padStart(4, '0')}`,
        title,
        severity,
        status: 'OPEN',
        assignedToUserId: assignedUser?.userId || null,
        assignedToFullName: assignedUser?.fullName || null,
        createdByUserId: 2,
        createdByFullName: 'Mouad Lahlou',
        triageNote,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    incidents.unshift(incident);

    // Timeline initiale
    timelines[incident.id] = [
        {
            id: nextTimelineId++,
            entryType: 'STATUS_CHANGE',
            authorFullName: 'Mouad Lahlou',
            authorRole: 'L1',
            content: 'Incident créé',
            oldStatus: null,
            newStatus: 'OPEN',
            createdAt: new Date().toISOString(),
        },
    ];

    // Alertes liées
    incidentAlerts[incident.id] = alertIds.map(id => ({
        id,
        severity,
        message: `Alerte #${id} liée à l'incident`,
        ruleId: 'RULE-MOCK',
        createdAt: new Date().toISOString(),
    }));

    return incident;
}

export async function mockAddCountermeasure(incidentId, type, description, technicalCommand, authorFullName, authorRole) {
    await delay();

    const incident = incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('Incident introuvable');

    // Vérifier statut clos
    if (['CLOSED', 'CLOSED_FALSE_POSITIVE'].includes(incident.status)) {
        throw { response: { status: 400, data: { message: 'Impossible d\'ajouter une contre-mesure à un incident clôturé.' } } };
    }

    // Créer l'entrée timeline
    const entry = {
        id: nextTimelineId++,
        entryType: 'COUNTERMEASURE',
        authorFullName,
        authorRole,
        content: description,
        oldStatus: null,
        newStatus: null,
        countermeasureType: type,
        technicalCommand: technicalCommand || null,
        createdAt: new Date().toISOString(),
    };
    if (!timelines[incident.id]) timelines[incident.id] = [];
    timelines[incident.id].push(entry);

    // Warning si pas en REMEDIATING
    const warning = incident.status !== 'REMEDIATING'
        ? "L'incident n'est pas en phase de remédiation"
        : null;

    return {
        id: entry.id,
        message: 'Contre-mesure ajoutée',
        warning,
    };
}
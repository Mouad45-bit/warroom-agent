// /src/api/mockAlerts.js

// ══════════════════════════════════════════════════════════════
//  FAUX BACKEND ALERTES (MOCK) — Module 1
// ══════════════════════════════════════════════════════════════
//
//  35 alertes couvrant TOUS les cas d'interface :
//    - Les 5 sévérités (CRITICAL, HIGH, MEDIUM, LOW, INFO)
//    - Les 4 statuts (NEW, ACKNOWLEDGED, FALSE_POSITIVE, ESCALATED)
//    - Les 6 sourceTypes (auth.log, syslog, kern.log, network, process, file.integrity)
//    - Plusieurs agents différents
//    - Des payloads réalistes
//
//  La pagination fonctionne réellement (page, size, totalPages).
//  Les filtres fonctionnent côté mock (sévérité, statut, sourceType, agentId).
//  Les actions (acquitter, faux positif) modifient l'état en mémoire.
// ══════════════════════════════════════════════════════════════

// ── Agents simulés ──────────────────────────────────────────
const AGENTS = {
    'agt-a1b2c3d4': { agentId: 'agt-a1b2c3d4', hostname: 'srv-web-prod', osName: 'Linux', osVersion: '6.1.0' },
    'agt-e5f6g7h8': { agentId: 'agt-e5f6g7h8', hostname: 'srv-db-01', osName: 'Linux', osVersion: '5.15.0' },
    'agt-i9j0k1l2': { agentId: 'agt-i9j0k1l2', hostname: 'srv-mail', osName: 'Linux', osVersion: '6.5.0' },
    'agt-m3n4o5p6': { agentId: 'agt-m3n4o5p6', hostname: 'srv-backup', osName: 'Ubuntu', osVersion: '22.04' },
};

// ── Générateur de dates récentes ────────────────────────────
// Crée une date dans les dernières `hoursAgo` heures
const recentDate = (hoursAgo) => {
    const d = new Date();
    d.setHours(d.getHours() - hoursAgo);
    d.setMinutes(Math.floor(Math.random() * 60));
    return d.toISOString();
};

// ══════════════════════════════════════════════════════════════
//  BASE DE DONNÉES MOCK — 35 alertes
// ══════════════════════════════════════════════════════════════
//  Chaque alerte suit exactement le format du contrat d'API §2.1
//  "let" car les actions (acquitter, faux positif) modifient ce tableau
let MOCK_ALERTS = [
    // ── CRITICAL (5) ─────────────────────────────────────────
    { id: 1,  eventId: 1001, ruleId: 'NET-REVSHELL-01', severity: 'CRITICAL', status: 'NEW',
        message: 'REVERSE SHELL CONFIRMÉ : Processus nc connecté au port 4444 (10.0.0.99:4444)',
        createdAt: recentDate(0.2), agentId: 'agt-a1b2c3d4', sourceType: 'network.connections',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 2,  eventId: 1002, ruleId: 'AUTH-ROOT-01', severity: 'CRITICAL', status: 'NEW',
        message: 'Connexion ROOT détectée avec succès depuis 192.168.1.50',
        createdAt: recentDate(0.5), agentId: 'agt-e5f6g7h8', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 3,  eventId: 1003, ruleId: 'NET-C2-PORT', severity: 'CRITICAL', status: 'ACKNOWLEDGED',
        message: 'PORT PIRATE DÉTECTÉ : Connexion sortante vers le port 4445 (85.214.33.12:4445)',
        createdAt: recentDate(1), agentId: 'agt-a1b2c3d4', sourceType: 'network.connections',
        qualifiedBy: 4, qualifiedAt: recentDate(0.8), justification: null },

    { id: 4,  eventId: 1004, ruleId: 'PROC-MINER-01', severity: 'CRITICAL', status: 'ESCALATED',
        message: 'Cryptomineur confirmé : ./xmrig --coin=XMR (PID: 9981)',
        createdAt: recentDate(3), agentId: 'agt-i9j0k1l2', sourceType: 'process.list',
        qualifiedBy: 4, qualifiedAt: recentDate(2.5), justification: null },

    { id: 5,  eventId: 1005, ruleId: 'FIM-SSH-SHADOW-ETC', severity: 'CRITICAL', status: 'NEW',
        message: 'INTÉGRITÉ COMPROMISE : Fichier /etc/shadow modifié — Backdoor potentielle',
        createdAt: recentDate(0.1), agentId: 'agt-e5f6g7h8', sourceType: 'file.integrity',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    // ── HIGH (8) ─────────────────────────────────────────────
    { id: 6,  eventId: 1006, ruleId: 'AUTH-BRUTE-01', severity: 'HIGH', status: 'NEW',
        message: 'ATTAQUE FORCE BRUTE : 12 échecs en 60s depuis l\'IP 10.0.0.55',
        createdAt: recentDate(0.3), agentId: 'agt-a1b2c3d4', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 7,  eventId: 1007, ruleId: 'AUTH-BRUTE-01', severity: 'HIGH', status: 'NEW',
        message: 'ATTAQUE FORCE BRUTE : 7 échecs en 60s depuis l\'IP 203.0.113.42',
        createdAt: recentDate(0.7), agentId: 'agt-e5f6g7h8', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 8,  eventId: 1008, ruleId: 'NET-SUSP-EXT', severity: 'HIGH', status: 'ACKNOWLEDGED',
        message: 'PROCESSUS SUSPECT EN RÉSEAU : python3 connecté à l\'IP externe 198.51.100.77:8443',
        createdAt: recentDate(2), agentId: 'agt-i9j0k1l2', sourceType: 'network.connections',
        qualifiedBy: 4, qualifiedAt: recentDate(1.5), justification: null },

    { id: 9,  eventId: 1009, ruleId: 'PROC-NEW-ROOT', severity: 'HIGH', status: 'FALSE_POSITIVE',
        message: 'Nouveau processus root démarré : /usr/bin/apt-get update (PID: 2341)',
        createdAt: recentDate(5), agentId: 'agt-m3n4o5p6', sourceType: 'process.list',
        qualifiedBy: 4, qualifiedAt: recentDate(4.5), justification: 'Mise à jour système planifiée par l\'admin (crontab hebdomadaire).' },

    { id: 10, eventId: 1010, ruleId: 'PROC-OFFENS-01', severity: 'HIGH', status: 'NEW',
        message: 'Processus offensif détecté : nmap -sV 192.168.1.0/24 (PID: 7712)',
        createdAt: recentDate(1.2), agentId: 'agt-a1b2c3d4', sourceType: 'process.list',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 11, eventId: 1011, ruleId: 'FIM-SSH-SHADOW-ETC', severity: 'HIGH', status: 'NEW',
        message: 'Clé SSH ajoutée : /home/deploy/.ssh/authorized_keys modifié',
        createdAt: recentDate(1.5), agentId: 'agt-e5f6g7h8', sourceType: 'file.integrity',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 12, eventId: 1012, ruleId: 'NET-NEW-LISTEN', severity: 'HIGH', status: 'ACKNOWLEDGED',
        message: 'NOUVEAU SERVICE SUSPECT : Port non-standard 8888 en écoute par python3',
        createdAt: recentDate(4), agentId: 'agt-i9j0k1l2', sourceType: 'network.connections',
        qualifiedBy: 4, qualifiedAt: recentDate(3.5), justification: null },

    { id: 13, eventId: 1013, ruleId: 'PROC-CPU-HIGH', severity: 'HIGH', status: 'NEW',
        message: 'Surcharge CPU critique (98.5%) sur processus : java -jar miner.jar (PID: 4421)',
        createdAt: recentDate(0.4), agentId: 'agt-m3n4o5p6', sourceType: 'process.list',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    // ── MEDIUM (10) ──────────────────────────────────────────
    { id: 14, eventId: 1014, ruleId: 'AUTH-SUSP-01', severity: 'MEDIUM', status: 'NEW',
        message: 'Activité Suspecte : 3 échecs d\'authentification depuis l\'IP 10.0.0.55',
        createdAt: recentDate(0.5), agentId: 'agt-a1b2c3d4', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 15, eventId: 1015, ruleId: 'AUTH-SUSP-01', severity: 'MEDIUM', status: 'ACKNOWLEDGED',
        message: 'Activité Suspecte : 4 échecs d\'authentification depuis l\'IP 172.16.0.12',
        createdAt: recentDate(2.5), agentId: 'agt-e5f6g7h8', sourceType: 'linux.auth.log',
        qualifiedBy: 4, qualifiedAt: recentDate(2), justification: null },

    { id: 16, eventId: 1016, ruleId: 'NET-NEW-LISTEN', severity: 'MEDIUM', status: 'NEW',
        message: 'Nouveau service légitime démarré sur le port standard : 443',
        createdAt: recentDate(6), agentId: 'agt-a1b2c3d4', sourceType: 'network.connections',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 17, eventId: 1017, ruleId: 'PROC-CPU-MEDIUM', severity: 'MEDIUM', status: 'FALSE_POSITIVE',
        message: 'Consommation CPU anormale (82%) sur processus : mvn package (PID: 3310)',
        createdAt: recentDate(8), agentId: 'agt-m3n4o5p6', sourceType: 'process.list',
        qualifiedBy: 4, qualifiedAt: recentDate(7), justification: 'Compilation Maven en cours — processus normal de CI/CD.' },

    { id: 18, eventId: 1018, ruleId: 'FIM-SSH-SHADOW-ETC', severity: 'MEDIUM', status: 'NEW',
        message: 'Permissions cron modifiées : /etc/cron.allow',
        createdAt: recentDate(3), agentId: 'agt-i9j0k1l2', sourceType: 'file.integrity',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 19, eventId: 1019, ruleId: 'NET-NEW-LISTEN', severity: 'MEDIUM', status: 'NEW',
        message: 'Connexion vers port inhabituel 9090 — processus non identifié',
        createdAt: recentDate(1.8), agentId: 'agt-e5f6g7h8', sourceType: 'network.connections',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 20, eventId: 1020, ruleId: 'FIM-SSH-SHADOW-ETC', severity: 'MEDIUM', status: 'ACKNOWLEDGED',
        message: 'Clé SSH supprimée : /root/.ssh/authorized_keys2',
        createdAt: recentDate(10), agentId: 'agt-a1b2c3d4', sourceType: 'file.integrity',
        qualifiedBy: 4, qualifiedAt: recentDate(9), justification: null },

    { id: 21, eventId: 1021, ruleId: 'AUTH-SUSP-01', severity: 'MEDIUM', status: 'NEW',
        message: 'Activité suspecte : 3 échecs depuis l\'IP 10.20.30.40',
        createdAt: recentDate(4.5), agentId: 'agt-m3n4o5p6', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 22, eventId: 1022, ruleId: 'FIM-SSH-SHADOW-ETC', severity: 'MEDIUM', status: 'NEW',
        message: 'Nouvelle tâche planifiée créée : /etc/cron.d/backup-suspect',
        createdAt: recentDate(2.2), agentId: 'agt-i9j0k1l2', sourceType: 'file.integrity',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 23, eventId: 1023, ruleId: 'AUTH-SUSP-01', severity: 'MEDIUM', status: 'FALSE_POSITIVE',
        message: 'Activité suspecte : 3 échecs depuis l\'IP 10.0.0.1',
        createdAt: recentDate(12), agentId: 'agt-a1b2c3d4', sourceType: 'linux.auth.log',
        qualifiedBy: 4, qualifiedAt: recentDate(11), justification: 'Scanner de vulnérabilité Nessus interne (IP autorisée).' },

    // ── LOW (4) ──────────────────────────────────────────────
    { id: 24, eventId: 1024, ruleId: 'KERN-SEGFAULT', severity: 'LOW', status: 'NEW',
        message: 'Erreur de segmentation (Segfault) détectée sur le noyau — processus nginx',
        createdAt: recentDate(6), agentId: 'agt-a1b2c3d4', sourceType: 'linux.kern.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 25, eventId: 1025, ruleId: 'KERN-SEGFAULT', severity: 'LOW', status: 'ACKNOWLEDGED',
        message: 'Segfault détecté sur le noyau — processus java',
        createdAt: recentDate(14), agentId: 'agt-e5f6g7h8', sourceType: 'linux.kern.log',
        qualifiedBy: 4, qualifiedAt: recentDate(13), justification: null },

    { id: 26, eventId: 1026, ruleId: 'SYSLOG-OOM', severity: 'LOW', status: 'FALSE_POSITIVE',
        message: 'OOM Killer déclenché — processus chrome tué',
        createdAt: recentDate(20), agentId: 'agt-m3n4o5p6', sourceType: 'linux.syslog',
        qualifiedBy: 4, qualifiedAt: recentDate(19), justification: 'Poste de test développeur, RAM saturée volontairement.' },

    { id: 27, eventId: 1027, ruleId: 'SYSLOG-OOM', severity: 'LOW', status: 'NEW',
        message: 'OOM Killer déclenché — processus mysqld tué (surcharge RAM)',
        createdAt: recentDate(3.5), agentId: 'agt-e5f6g7h8', sourceType: 'linux.syslog',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    // ── INFO (8) ─────────────────────────────────────────────
    { id: 28, eventId: 1028, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'NEW',
        message: 'Échec d\'authentification isolé depuis l\'IP 10.0.0.55',
        createdAt: recentDate(0.6), agentId: 'agt-a1b2c3d4', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 29, eventId: 1029, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'NEW',
        message: 'Échec d\'authentification isolé depuis l\'IP 10.0.0.12',
        createdAt: recentDate(1.1), agentId: 'agt-e5f6g7h8', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 30, eventId: 1030, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'ACKNOWLEDGED',
        message: 'Échec d\'authentification isolé depuis l\'IP 172.16.5.20',
        createdAt: recentDate(7), agentId: 'agt-i9j0k1l2', sourceType: 'linux.auth.log',
        qualifiedBy: 4, qualifiedAt: recentDate(6.5), justification: null },

    { id: 31, eventId: 1031, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'NEW',
        message: 'Échec d\'authentification isolé depuis l\'IP 192.168.10.5',
        createdAt: recentDate(2.8), agentId: 'agt-m3n4o5p6', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 32, eventId: 1032, ruleId: 'NET-NEW-LISTEN', severity: 'INFO', status: 'NEW',
        message: 'Nouveau service standard démarré sur port 22 (sshd)',
        createdAt: recentDate(15), agentId: 'agt-a1b2c3d4', sourceType: 'network.connections',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 33, eventId: 1033, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'FALSE_POSITIVE',
        message: 'Échec d\'authentification isolé depuis l\'IP 10.0.0.100',
        createdAt: recentDate(24), agentId: 'agt-e5f6g7h8', sourceType: 'linux.auth.log',
        qualifiedBy: 4, qualifiedAt: recentDate(23), justification: 'Test de monitoring Nagios (échec volontaire pour vérifier l\'alerte).' },

    { id: 34, eventId: 1034, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'NEW',
        message: 'Échec d\'authentification isolé depuis l\'IP 10.0.0.77',
        createdAt: recentDate(5.5), agentId: 'agt-a1b2c3d4', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },

    { id: 35, eventId: 1035, ruleId: 'AUTH-FAIL-01', severity: 'INFO', status: 'NEW',
        message: 'Échec d\'authentification isolé depuis l\'IP 10.0.0.88',
        createdAt: recentDate(9), agentId: 'agt-i9j0k1l2', sourceType: 'linux.auth.log',
        qualifiedBy: null, qualifiedAt: null, justification: null },
];

// ── Payloads bruts réalistes par sourceType ─────────────────
const MOCK_PAYLOADS = {
    'linux.auth.log':       'May  9 14:32:08 srv-web-prod sshd[4521]: Failed password for root from 10.0.0.55 port 44832 ssh2',
    'linux.syslog':         'May  9 10:15:33 srv-db-01 kernel: [1234567.890] Out of memory: Killed process 3456 (mysqld) total-vm:2048000kB',
    'linux.kern.log':       'May  9 09:00:12 srv-web-prod kernel: [987654.321] nginx[2345]: segfault at 0000000000000000 ip 00007f...',
    'network.connections':  'State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process\nESTAB   0       0       192.168.1.10:45678   10.0.0.99:4444     users:(("nc",pid=7890,fd=3))\nLISTEN  0       128     0.0.0.0:22            0.0.0.0:*          users:(("sshd",pid=1234,fd=3))\nESTAB   0       0       192.168.1.10:22       192.168.1.50:49832 users:(("sshd",pid=5678,fd=3))',
    'process.list':         'USER       PID %CPU %MEM    VSZ   RSS TTY  STAT START  TIME COMMAND\nroot         1  0.0  0.1 169396 13200 ?    Ss   10:00  0:01 /sbin/init\nroot       512  0.2  0.3  72896 28000 ?    Ss   10:00  0:15 /usr/sbin/sshd\nhacker    9981 99.0  5.0 999999 500000 ?   R    11:30  5:00 ./xmrig --coin=XMR',
    'file.integrity':       'action=MODIFIED file=/etc/shadow old_hash=a1b2c3d4e5f6... new_hash=9f8e7d6c5b4a...',
};

// ══════════════════════════════════════════════════════════════
//  FONCTIONS MOCK EXPORTÉES
// ══════════════════════════════════════════════════════════════

// Ordre de tri des sévérités (CRITICAL en premier)
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

/**
 * GET /api/alerts — Liste paginée avec filtres
 * Simule exactement la réponse Spring Data Page<AlertRecord>
 */
export const mockGetAlerts = async ({ page = 0, size = 10, severity = [], status = [], sourceType = [], agentId = '' }) => {
    await new Promise(r => setTimeout(r, 600)); // Simule latence

    // ── Filtrage ──────────────────────────────────────────
    let filtered = [...MOCK_ALERTS];

    if (severity.length > 0)   filtered = filtered.filter(a => severity.includes(a.severity));
    if (status.length > 0)     filtered = filtered.filter(a => status.includes(a.status));
    if (sourceType.length > 0) filtered = filtered.filter(a => sourceType.includes(a.sourceType));
    if (agentId)               filtered = filtered.filter(a => a.agentId === agentId);

    // ── Tri : sévérité DESC puis date DESC ───────────────
    filtered.sort((a, b) => {
        const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // ── Pagination ───────────────────────────────────────
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size);
    const start = page * size;
    const content = filtered.slice(start, start + size).map(a => ({
        ...a,
        agent: { agentId: a.agentId, hostname: AGENTS[a.agentId]?.hostname || 'unknown' },
    }));

    return { content, totalElements, totalPages, number: page, size };
};

/**
 * GET /api/alerts/{alertId} — Détail complet
 * Retourne : { alert, sourceEvent, agent, relatedAlerts }
 */
export const mockGetAlertDetail = async (alertId) => {
    await new Promise(r => setTimeout(r, 400));

    const alert = MOCK_ALERTS.find(a => a.id === alertId);
    if (!alert) throw new Error('Alerte introuvable');

    const agent = AGENTS[alert.agentId];

    // Payload brut réaliste selon le sourceType
    const sourceEvent = {
        id: alert.eventId,
        sourceType: alert.sourceType,
        collectedAt: new Date(new Date(alert.createdAt).getTime() - 2000).toISOString(),
        receivedAt: new Date(new Date(alert.createdAt).getTime() - 1000).toISOString(),
        payload: MOCK_PAYLOADS[alert.sourceType] || 'Payload non disponible',
    };

    // 5 dernières alertes du même agent (exclut l'alerte courante)
    const relatedAlerts = MOCK_ALERTS
        .filter(a => a.agentId === alert.agentId && a.id !== alertId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(a => ({ id: a.id, ruleId: a.ruleId, severity: a.severity, message: a.message, createdAt: a.createdAt, status: a.status }));

    return {
        alert: { ...alert },
        sourceEvent,
        agent,
        relatedAlerts,
    };
};

/**
 * PUT /api/alerts/{alertId}/acknowledge
 * Modifie l'état en mémoire et retourne la réponse du contrat §2.3
 */
export const mockAcknowledgeAlert = async (alertId) => {
    await new Promise(r => setTimeout(r, 300));

    const alert = MOCK_ALERTS.find(a => a.id === alertId);
    if (!alert) throw new Error('Alerte introuvable');
    if (alert.status !== 'NEW') throw new Error('Cette alerte a déjà été traitée.');

    // Modification en mémoire (persiste pendant la session)
    alert.status = 'ACKNOWLEDGED';
    alert.qualifiedBy = 4; // L1 connecté (mock)
    alert.qualifiedAt = new Date().toISOString();

    return { id: alert.id, status: alert.status, qualifiedBy: alert.qualifiedBy, qualifiedAt: alert.qualifiedAt };
};

/**
 * PUT /api/alerts/{alertId}/false-positive
 * Modifie l'état en mémoire et retourne la réponse du contrat §2.4
 */
export const mockFalsePositiveAlert = async (alertId, justification) => {
    await new Promise(r => setTimeout(r, 300));

    if (!justification || justification.trim().length < 10) {
        throw new Error('Une justification est obligatoire (minimum 10 caractères).');
    }

    const alert = MOCK_ALERTS.find(a => a.id === alertId);
    if (!alert) throw new Error('Alerte introuvable');
    if (alert.status === 'FALSE_POSITIVE' || alert.status === 'ESCALATED') {
        throw new Error('Cette alerte a déjà été traitée.');
    }

    alert.status = 'FALSE_POSITIVE';
    alert.qualifiedBy = 4;
    alert.qualifiedAt = new Date().toISOString();
    alert.justification = justification.trim();

    return { id: alert.id, status: alert.status, qualifiedBy: alert.qualifiedBy, qualifiedAt: alert.qualifiedAt, justification: alert.justification };
};
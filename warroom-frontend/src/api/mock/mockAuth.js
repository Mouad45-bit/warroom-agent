// /src/api/mockAuth.js

// ══════════════════════════════════════════════════════════════
//  FAUX BACKEND (MOCK) — À utiliser uniquement pour le dev UI
// ══════════════════════════════════════════════════════════════

const MOCK_USERS = {
    'admin': { userId: 1, username: 'admin', role: 'ADMIN', fullName: 'Administrateur SOC', active: true },
    'manager': { userId: 2, username: 'manager', role: 'MANAGER', fullName: 'Chef de Salle', active: true },
    'l2': { userId: 3, username: 'l2', role: 'L2', fullName: 'Analyste Confirmé', active: true },
    'l1': { userId: 4, username: 'l1', role: 'L1', fullName: 'Analyste Junior', active: true },
};

export const mockCheckSession = async () => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simule latence réseau
    const savedUsername = localStorage.getItem('mock_session');
    if (savedUsername && MOCK_USERS[savedUsername]) {
        return MOCK_USERS[savedUsername];
    }
    throw new Error("Non authentifié");
};

export const mockLogin = async (username, password) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simule vérification BDD

    const lowerUser = username.toLowerCase();
    const mockUser = MOCK_USERS[lowerUser];

    // Succès
    if (mockUser && password === lowerUser) {
        localStorage.setItem('mock_session', lowerUser);
        return { success: true };
    }

    // Cas spécial pour tester le compte verrouillé
    if (lowerUser === 'hacker') {
        return { success: false, status: 423, error: 'Compte verrouillé après 5 échecs consécutifs.' };
    }

    // Échec classique
    return { success: false, status: 401, error: 'Identifiants invalides.' };
};

export const mockLogout = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    localStorage.removeItem('mock_session');
};

// ── MOCKS POUR LA GESTION DES UTILISATEURS ────────────────────

export const mockGetUsers = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simule la latence réseau

    return [
        { userId: 1, username: 'admin', role: 'ADMIN', fullName: 'Administrateur SOC', active: true, email: 'admin@warroom.local', lastLoginAt: new Date().toISOString() },
        { userId: 2, username: 'manager', role: 'MANAGER', fullName: 'Chef de Salle', active: true, email: 'manager@warroom.local', lastLoginAt: new Date().toISOString() },
        { userId: 3, username: 'l2', role: 'L2', fullName: 'Analyste Confirmé', active: false, email: 'l2@warroom.local', lastLoginAt: null },
        { userId: 4, username: 'l1', role: 'L1', fullName: 'Analyste Junior', active: true, email: 'l1@warroom.local', lastLoginAt: new Date().toISOString() }
    ];
};

export const mockDisableUser = async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // On simule une réussite (dans un vrai mock poussé, on irait modifier le tableau,
    // mais ici on simule juste le fait que l'API réponde OK 200)
    return { success: true };
};

export const mockEnableUser = async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
};
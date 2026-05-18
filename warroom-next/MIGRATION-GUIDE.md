# Migration React/Vite → Next.js App Router
## Guide pour WarRoom SOC

---

## Structure des dossiers — Avant / Après

```
AVANT (React/Vite)                      APRÈS (Next.js App Router)
warroom-frontend/                       warroom-next/
├── index.html                          ├── src/app/layout.jsx          ← remplace index.html
├── vite.config.js                      ├── next.config.mjs             ← remplace vite proxy
├── src/
│   ├── main.jsx                        │   (supprimé — Next gère le montage)
│   ├── App.jsx                         │   (supprimé — le routing est par fichiers)
│   ├── api/client.js                   │   ├── api/client.js           ← IDENTIQUE
│   ├── api/mock/...                    │   ├── api/mock/...            ← IDENTIQUE (copier tel quel)
│   ├── context/AuthContext.jsx         │   ├── context/AuthContext.jsx  ← ajout 'use client' + useRouter
│   ├── hooks/useSSE.js                 │   ├── hooks/useSSE.js         ← ajout guard SSR
│   ├── components/
│   │   ├── auth/ProtectedRoute.jsx     │   │   (supprimé — fusionné dans AppShell)
│   │   ├── layout/Layout.jsx           │   │   ├── layout/AppShell.jsx  ← fusion Layout+ProtectedRoute
│   │   ├── modals/...                  │   │   ├── modals/...           ← IDENTIQUE (copier tel quel)
│   │   └── ui/...                      │   │   └── ui/...              ← IDENTIQUE (copier tel quel)
│   └── pages/
│       ├── LoginPage.jsx               │   ├── pages/LoginPage.jsx     ← useRouter au lieu de useNavigate
│       ├── DashboardPage.jsx           │   ├── pages/DashboardPage.jsx ← voir adaptations ci-dessous
│       ├── AlertsPage.jsx              │   ├── pages/AlertsPage.jsx    ← voir adaptations ci-dessous
│       ├── IncidentsPage.jsx           │   ├── pages/IncidentsPage.jsx ← voir adaptations ci-dessous
│       ├── AgentsPage.jsx              │   ├── pages/AgentsPage.jsx    ← IDENTIQUE (pas de useNavigate)
│       ├── AuditLogPage.jsx            │   ├── pages/AuditLogPage.jsx  ← voir adaptations ci-dessous
│       └── UsersPage.jsx               │   └── pages/UsersPage.jsx     ← IDENTIQUE (pas de useNavigate)
│
│                                       │   ├── app/
│                                       │   │   ├── layout.jsx           ← Root layout (AuthProvider)
│                                       │   │   ├── page.jsx             ← / → Dashboard
│                                       │   │   ├── login/page.jsx       ← /login
│                                       │   │   ├── alerts/page.jsx      ← /alerts
│                                       │   │   ├── incidents/page.jsx   ← /incidents
│                                       │   │   ├── agents/page.jsx      ← /agents
│                                       │   │   └── admin/
│                                       │   │       ├── users/page.jsx   ← /admin/users
│                                       │   │       └── audit-log/page.jsx ← /admin/audit-log
```

---

## Les 4 changements systématiques dans les pages

### Changement 1 : Ajouter `'use client'` en première ligne
TOUTES les pages qui utilisent useState/useEffect doivent commencer par :
```jsx
'use client';
```

### Changement 2 : Remplacer les imports React Router par Next.js
```diff
- import { useNavigate } from 'react-router-dom';
+ import { useRouter } from 'next/navigation';

- import { Navigate } from 'react-router-dom';
  (plus besoin — AppShell gère la redirection)
```

### Changement 3 : Remplacer `useNavigate()` par `useRouter()`
```diff
- const navigate = useNavigate();
+ const router = useRouter();

- navigate('/alerts');
+ router.push('/alerts');
```

### Changement 4 : Plus d'import de `<Navigate>` (géré par AppShell)
```diff
- if (!loading && user) return <Navigate to="/" replace />;
+ // Supprimé — AppShell gère la redirection
```

---

## Pages qui NE changent PAS du tout (copier tel quel + ajouter 'use client')

Ces pages n'utilisent ni useNavigate ni <Navigate> :
- **AgentsPage.jsx** → copier tel quel, ajouter 'use client' en ligne 1
- **UsersPage.jsx** → copier tel quel, ajouter 'use client' en ligne 1

---

## Pages qui changent LÉGÈREMENT

### DashboardPage.jsx
```diff
+ 'use client';
- import { useNavigate } from 'react-router-dom';
+ import { useRouter } from 'next/navigation';

  export default function DashboardPage() {
-     const navigate = useNavigate();
+     const router = useRouter();

      // Partout dans le fichier :
-     navigate('/alerts')
+     router.push('/alerts')
-     navigate('/incidents')
+     router.push('/incidents')
-     navigate('/agents')
+     router.push('/agents')
  }
```

### AlertsPage.jsx
Aucun changement de navigation (pas de useNavigate). Seulement :
```diff
+ 'use client';
```

### IncidentsPage.jsx
Aucun changement de navigation. Seulement :
```diff
+ 'use client';
```

### AuditLogPage.jsx
```diff
+ 'use client';
- import { useNavigate } from 'react-router-dom';
+ import { useRouter } from 'next/navigation';

  export default function AuditLogPage() {
-     const navigate = useNavigate();
+     const router = useRouter();

-     navigate('/alerts')
+     router.push('/alerts')
      // etc.
  }
```

---

## Fichiers supprimés (n'existent plus dans Next.js)

| Ancien fichier | Pourquoi supprimé |
|---|---|
| `index.html` | Remplacé par `app/layout.jsx` |
| `main.jsx` | Next.js gère le montage automatiquement |
| `App.jsx` | Le routing est par système de fichiers |
| `ProtectedRoute.jsx` | Fusionné dans `AppShell.jsx` |
| `Layout.jsx` | Fusionné dans `AppShell.jsx` |
| `vite.config.js` | Remplacé par `next.config.mjs` |

---

## Fichiers copiés SANS MODIFICATION (juste 'use client' si nécessaire)

| Fichier | Raison |
|---|---|
| `api/client.js` | Aucun import React Router |
| `api/mock/*.js` | Aucune dépendance React |
| `components/modals/**/*.jsx` | Aucun import React Router |
| `components/ui/**/*.jsx` | Aucun import React Router |
| `hooks/useSSE.js` | Ajout guard `typeof window` uniquement |

---

## Commandes pour la migration

```bash
# 1. Aller dans le projet Next.js
cd warroom-next

# 2. Installer les dépendances manquantes
npm install axios lucide-react

# 3. Copier les fichiers inchangés depuis l'ancien frontend
# (depuis la racine du projet)
cp -r ../warroom-frontend/src/api/mock/ src/api/mock/
cp -r ../warroom-frontend/src/components/modals/ src/components/modals/
cp -r ../warroom-frontend/src/components/ui/ src/components/ui/

# 4. Copier les pages qui ne changent pas
cp ../warroom-frontend/src/pages/AgentsPage.jsx src/pages/
cp ../warroom-frontend/src/pages/UsersPage.jsx src/pages/

# 5. Pour chaque fichier copié dans pages/ et components/modals/,
#    ajouter 'use client'; en première ligne si le fichier utilise
#    useState, useEffect, useCallback, ou des event handlers (onClick).

# 6. Lancer le dev server
npm run dev
```

---

## Le proxy — comment ça marche maintenant

### Avant (Vite)
```js
// vite.config.js
proxy: { '/api': { target: 'http://localhost:8080' } }
```

### Après (Next.js)
```js
// next.config.mjs
async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:8080/api/:path*' }];
}
```

**Même effet** : toute requête vers `/api/...` est redirigée vers Spring Boot sur le port 8080.

---

## Résumé visuel du nouveau flux

```
Navigateur → http://localhost:3000
    → Next.js sert app/layout.jsx (AuthProvider)
    → Route / → app/page.jsx → AppShell + DashboardPage
    → Route /login → app/login/page.jsx → LoginPage (sans AppShell)
    → Route /alerts → app/alerts/page.jsx → AppShell(L1,L2,MANAGER) + AlertsPage
    → Route /admin/users → app/admin/users/page.jsx → AppShell(MANAGER,ADMIN) + UsersPage

    → Requête /api/alerts → Next.js rewrite → http://localhost:8080/api/alerts
    → Cookie JSESSIONID passe grâce à withCredentials: true
```

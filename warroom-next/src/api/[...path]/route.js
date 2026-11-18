// src/app/api/[...path]/route.js
//
// ══════════════════════════════════════════════════════════════
//  PROXY API — Next.js Route Handler vers Spring Boot
// ══════════════════════════════════════════════════════════════
//  Pourquoi ce fichier et pas les rewrites de next.config.mjs ?
//
//  Les rewrites Next.js proxifient les requêtes MAIS ne
//  propagent pas le header Set-Cookie de Spring Boot vers
//  le navigateur. Le JSESSIONID est donc reçu par Node.js
//  mais jamais stocké dans le navigateur → toutes les
//  requêtes suivantes arrivent sans session → 401.
//
//  Ce Route Handler fait la même chose mais correctement :
//  il copie TOUS les headers de la réponse Spring Boot,
//  y compris Set-Cookie, vers le navigateur.
// ══════════════════════════════════════════════════════════════

const SPRING_BASE = 'http://localhost:8080';

export async function GET(request, { params }) {
    return proxyRequest(request, params, 'GET');
}

export async function POST(request, { params }) {
    return proxyRequest(request, params, 'POST');
}

export async function PUT(request, { params }) {
    return proxyRequest(request, params, 'PUT');
}

export async function DELETE(request, { params }) {
    return proxyRequest(request, params, 'DELETE');
}

export async function OPTIONS(request, { params }) {
    return proxyRequest(request, params, 'OPTIONS');
}

async function proxyRequest(request, params, method) {
    const path = (await params).path;
    const url = new URL(request.url);

    // Reconstruit l'URL Spring Boot : /api/alerts?page=0&size=10
    const targetUrl = `${SPRING_BASE}/api/${path.join('/')}${url.search}`;

    // Copie les headers du navigateur (y compris Cookie: JSESSIONID=...)
    const headers = new Headers(request.headers);
    headers.set('host', 'localhost:8080');

    // Options de la requête vers Spring Boot
    const fetchOptions = {
        method,
        headers,
        // Ne pas suivre les redirections automatiquement
        redirect: 'manual',
    };

    // Copie le body pour POST/PUT
    if (method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS') {
        try {
            fetchOptions.body = await request.text();
        } catch {
            // body vide
        }
    }

    try {
        const springResponse = await fetch(targetUrl, fetchOptions);

        // Copie TOUS les headers de Spring Boot vers le navigateur,
        // notamment Set-Cookie: JSESSIONID=... qui est crucial.
        const responseHeaders = new Headers(springResponse.headers);

        // Lit le body de Spring Boot
        const body = await springResponse.arrayBuffer();

        return new Response(body, {
            status: springResponse.status,
            statusText: springResponse.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error(`[Proxy] Erreur lors du forward vers ${targetUrl}:`, error);
        return new Response(
            JSON.stringify({ message: 'Le backend Spring Boot est inaccessible.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
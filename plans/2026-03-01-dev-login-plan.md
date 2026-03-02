# Dev Login & Preview Mode - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Shopify-style dev login system to the Maho Storefront with password gate, preview mode for draft content, and a full debug toolbar.

**Architecture:** Cookie-based sessions on Cloudflare Workers. Dev tokens created in Maho admin and synced to KV. HMAC-signed cookies persist sessions. Preview mode passes `?preview=1` to API calls. Toolbar rendered server-side, interactive via Stimulus.

**Tech Stack:** Hono.js middleware, Cloudflare KV, HMAC-SHA256 (Web Crypto API), Stimulus controller, DaisyUI components.

**Design doc:** `docs/plans/2026-03-01-dev-login-design.md`

---

### Task 1: Add DEV_SECRET to Env Type and Wrangler Configs

**Files:**
- Modify: `src/types.ts:312-317` (Env interface)
- Modify: `wrangler.toml:20-22` (vars section)
- Modify: `wrangler.demo.toml:20-23` (vars section)

**Step 1: Add DEV_SECRET to the Env interface**

In `src/types.ts`, add `DEV_SECRET` to the `Env` interface:

```typescript
export interface Env {
  CONTENT: KVNamespace;
  MAHO_API_URL: string;
  SYNC_SECRET: string;
  DEV_SECRET?: string;        // HMAC signing key for dev session cookies
  DEMO_STORES?: string;       // JSON array of DemoStore
}
```

**Step 2: Add DEV_SECRET to wrangler configs**

In `wrangler.toml`, add under `[vars]`:

```toml
[vars]
MAHO_API_URL = "https://maho.tenniswarehouse.com.au"
SYNC_SECRET = "changeme"
DEV_SECRET = ""
```

In `wrangler.demo.toml`, add under `[vars]`:

```toml
DEV_SECRET = ""
```

Leave empty - dev login is inactive when `DEV_SECRET` is empty. Set a real secret to enable.

**Step 3: Commit**

```bash
git add src/types.ts wrangler.toml wrangler.demo.toml
git commit -m "feat: add DEV_SECRET env var for dev login system"
```

---

### Task 2: Create dev-auth.ts - Cookie Signing & Validation

**Files:**
- Create: `src/dev-auth.ts`

This is the core auth module. All crypto uses the Web Crypto API (available in CF Workers, no dependencies).

**Step 1: Create the dev-auth module**

Create `src/dev-auth.ts`:

```typescript
/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Env } from './types';
import { CloudflareKVStore } from './content-store';

// Cookie name for dev sessions
export const DEV_COOKIE = '__dev_session';

// Cookie TTL: 7 days in seconds
const COOKIE_TTL = 7 * 24 * 60 * 60;

// --- Cookie payload ---

export interface DevSession {
  tokenHash: string;
  preview: boolean;
  pageconfig: string | null;
  issued: number;
  expires: number;
}

// --- HMAC helpers (Web Crypto API) ---

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/** Hash a raw token for KV lookup */
export async function hashToken(token: string, secret: string): Promise<string> {
  return hmacSign(token, secret);
}

// --- Cookie encode/decode ---

export async function encodeSession(session: DevSession, secret: string): Promise<string> {
  const payload = btoa(JSON.stringify(session));
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

export async function decodeSession(cookie: string, secret: string): Promise<DevSession | null> {
  const dotIndex = cookie.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = cookie.slice(0, dotIndex);
  const sig = cookie.slice(dotIndex + 1);

  const valid = await hmacVerify(payload, sig, secret);
  if (!valid) return null;

  try {
    const session = JSON.parse(atob(payload)) as DevSession;
    if (session.expires < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

// --- Cookie header helpers ---

export function setSessionCookie(session: string, hostname: string): string {
  const secure = hostname !== 'localhost' && !hostname.startsWith('127.');
  const parts = [
    `${DEV_COOKIE}=${encodeURIComponent(session)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${COOKIE_TTL}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(): string {
  return `${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

// --- Parse cookies from request ---

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
  }
  return cookies;
}

// --- Token validation against KV ---

export async function validateDevToken(
  rawToken: string,
  env: Env,
): Promise<{ valid: boolean; tokenHash: string; permissions: string[] }> {
  if (!env.DEV_SECRET) return { valid: false, tokenHash: '', permissions: [] };

  const tokenHash = await hashToken(rawToken, env.DEV_SECRET);
  const store = new CloudflareKVStore(env.CONTENT);
  const tokenData = await store.get<{
    label: string;
    created: string;
    expires: string;
    permissions: string[];
  }>(`dev:token:${tokenHash}`);

  if (!tokenData) return { valid: false, tokenHash, permissions: [] };

  // Check expiry
  if (tokenData.expires && new Date(tokenData.expires) < new Date()) {
    return { valid: false, tokenHash, permissions: [] };
  }

  return { valid: true, tokenHash, permissions: tokenData.permissions || ['gate', 'preview'] };
}

// --- Password gate check ---

export async function isPasswordGateActive(env: Env): Promise<boolean> {
  const store = new CloudflareKVStore(env.CONTENT);
  const gateEnabled = await store.get<boolean>('config:password_gate');
  return !!gateEnabled;
}

export async function validatePassword(password: string, env: Env): Promise<boolean> {
  const store = new CloudflareKVStore(env.CONTENT);
  const storedPassword = await store.get<string>('config:storefront_password');
  if (!storedPassword) return false;
  return password === storedPassword;
}

// --- Session from request ---

export async function getSessionFromRequest(c: any): Promise<DevSession | null> {
  const env: Env = c.env;
  if (!env.DEV_SECRET) return null;

  const cookies = parseCookies(c.req.header('Cookie'));
  const cookie = cookies[DEV_COOKIE];
  if (!cookie) return null;

  return decodeSession(cookie, env.DEV_SECRET);
}
```

**Step 2: Commit**

```bash
git add src/dev-auth.ts
git commit -m "feat: add dev-auth module - cookie signing, token validation, password gate"
```

---

### Task 3: Password Gate Middleware & Login Route

**Files:**
- Modify: `src/index.tsx:117-126` (add middleware after Hono init, before routes)
- Add `/dev/login` POST route
- Add `/dev/logout` GET route

**Step 1: Add imports at top of index.tsx**

After the existing imports (around line 31), add:

```typescript
import {
  DEV_COOKIE,
  getSessionFromRequest,
  isPasswordGateActive,
  validatePassword,
  validateDevToken,
  encodeSession,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  type DevSession,
} from './dev-auth';
```

**Step 2: Add the password gate middleware**

After the DOCTYPE middleware (line 126) and before the edge cache function (line 132), add:

```typescript
// ====== DEV LOGIN / PASSWORD GATE ======

// Routes excluded from the password gate
const GATE_EXCLUDED = new Set([
  '/styles.css', '/controllers.js', '/robots.txt', '/favicon.ico',
  '/sync', '/cache/delete', '/cache/keys', '/cache/purge',
  '/dev/login', '/dev/logout', '/dev/preview',
]);

function isGateExcluded(path: string): boolean {
  return GATE_EXCLUDED.has(path) || path.startsWith('/public/');
}

// Password gate page HTML (standalone, no Layout dependency)
function passwordPageHtml(error?: string, returnTo?: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Store Access</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif}
    .card{background:#16213e;border-radius:12px;padding:2.5rem;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
    h1{font-size:1.25rem;margin-bottom:0.25rem}
    p{font-size:0.875rem;color:#999;margin-bottom:1.5rem}
    label{display:block;font-size:0.8rem;font-weight:500;margin-bottom:0.4rem;color:#bbb}
    input{width:100%;padding:0.65rem 0.8rem;border:1px solid #2a2a4a;border-radius:6px;background:#0f3460;color:#e0e0e0;font-size:0.9rem;outline:none;transition:border-color 0.2s}
    input:focus{border-color:#e94560}
    button{width:100%;padding:0.65rem;background:#e94560;color:#fff;border:none;border-radius:6px;font-size:0.9rem;font-weight:600;cursor:pointer;margin-top:1rem;transition:background 0.2s}
    button:hover{background:#c73e54}
    .error{color:#e94560;font-size:0.8rem;margin-top:0.5rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>This store is protected</h1>
    <p>Enter the password to continue.</p>
    <form method="POST" action="/dev/login">
      <input type="hidden" name="return_to" value="${returnTo || '/'}" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter store password" required autofocus />
      ${error ? `<div class="error">${error}</div>` : ''}
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`;
}

// Middleware: password gate + dev token check
app.use('*', async (c, next) => {
  const env: Env = c.env;

  // Dev login disabled when DEV_SECRET is not set
  if (!env.DEV_SECRET) { await next(); return; }

  const path = new URL(c.req.url).pathname;

  // Skip excluded routes
  if (isGateExcluded(path)) { await next(); return; }

  // Check for ?devtoken= param (token bypass)
  const url = new URL(c.req.url);
  const devtoken = url.searchParams.get('devtoken');
  if (devtoken) {
    const result = await validateDevToken(devtoken, env);
    if (result.valid) {
      const now = Math.floor(Date.now() / 1000);
      const session: DevSession = {
        tokenHash: result.tokenHash,
        preview: result.permissions.includes('preview'),
        pageconfig: null,
        issued: now,
        expires: now + 7 * 24 * 60 * 60,
      };
      const cookie = await encodeSession(session, env.DEV_SECRET);
      // Redirect to same URL without devtoken param
      url.searchParams.delete('devtoken');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': url.pathname + url.search,
          'Set-Cookie': setSessionCookie(cookie, url.hostname),
        },
      });
    }
    // Invalid token - fall through to gate check
  }

  // Check existing session cookie
  const session = await getSessionFromRequest(c);
  if (session) {
    // Valid session - store on context for later use (toolbar, preview)
    c.set('devSession', session);
    await next();
    return;
  }

  // Check if password gate is active
  const gateActive = await isPasswordGateActive(env);
  if (!gateActive) {
    // Gate not active - public access allowed
    await next();
    return;
  }

  // No valid session + gate active → show password page
  return c.html(passwordPageHtml(undefined, path));
});
```

**Step 3: Add the /dev/login POST route**

After the gate middleware, before the static asset routes (line 264):

```typescript
// POST /dev/login - validate password and set session
app.post('/dev/login', async (c) => {
  const env: Env = c.env;
  if (!env.DEV_SECRET) return c.text('Dev login not configured', 500);

  const formData = await c.req.parseBody();
  const password = formData['password'] as string;
  const returnTo = (formData['return_to'] as string) || '/';

  const valid = await validatePassword(password, env);
  if (!valid) {
    return c.html(passwordPageHtml('Incorrect password', returnTo));
  }

  // Create a session (password-based sessions get gate access, not preview by default)
  const now = Math.floor(Date.now() / 1000);
  const session: DevSession = {
    tokenHash: 'password',
    preview: false,
    pageconfig: null,
    issued: now,
    expires: now + 7 * 24 * 60 * 60,
  };
  const cookie = await encodeSession(session, env.DEV_SECRET);
  const hostname = new URL(c.req.url).hostname;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': returnTo,
      'Set-Cookie': setSessionCookie(cookie, hostname),
    },
  });
});

// GET /dev/logout - clear session
app.get('/dev/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': clearSessionCookie(),
    },
  });
});
```

**Step 4: Add context variable type**

The middleware uses `c.set('devSession', session)`. Hono needs the type declared. Update the AppEnv type (currently line 116):

```typescript
type AppEnv = { Bindings: Env; Variables: { devSession?: DevSession } };
```

**Step 5: Commit**

```bash
git add src/index.tsx
git commit -m "feat: add password gate middleware with dev token bypass and login route"
```

---

### Task 4: Preview Mode Toggle Route

**Files:**
- Modify: `src/index.tsx` (add /dev/preview POST route)
- Modify: `src/index.tsx` (update edge cache to bypass for preview sessions)

**Step 1: Add the preview toggle route**

After the `/dev/logout` route:

```typescript
// POST /dev/preview - toggle preview mode or switch page config
app.post('/dev/preview', async (c) => {
  const env: Env = c.env;
  if (!env.DEV_SECRET) return c.json({ error: 'Dev login not configured' }, 500);

  const session = await getSessionFromRequest(c);
  if (!session) return c.json({ error: 'Not authenticated' }, 401);

  const body = await c.req.json<{
    preview?: boolean;
    pageconfig?: string | null;
  }>();

  // Update session with new preview state
  const updatedSession: DevSession = {
    ...session,
    preview: body.preview !== undefined ? body.preview : session.preview,
    pageconfig: body.pageconfig !== undefined ? body.pageconfig : session.pageconfig,
  };

  const cookie = await encodeSession(updatedSession, env.DEV_SECRET);
  const hostname = new URL(c.req.url).hostname;

  return new Response(JSON.stringify({ ok: true, preview: updatedSession.preview, pageconfig: updatedSession.pageconfig }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setSessionCookie(cookie, hostname),
    },
  });
});
```

**Step 2: Update the edge cache middleware to bypass for preview sessions**

In the `withEdgeCache` function (currently line 132), add a preview bypass check after the existing `?nocache` check (line 138):

```typescript
    // Bypass cache for dev preview sessions
    const devSession = c.get('devSession') as DevSession | undefined;
    if (devSession?.preview) {
      await next();
      if (c.res) c.res.headers.set('X-Edge-Cache', 'PREVIEW-BYPASS');
      return;
    }
```

**Step 3: Commit**

```bash
git add src/index.tsx
git commit -m "feat: add preview mode toggle route and edge cache bypass"
```

---

### Task 5: Page Config Override for Preview Mode

**Files:**
- Modify: `src/page-config.ts:36-46` (add override support)
- Modify: `src/index.tsx` (pass page config override from session)

**Step 1: Add page config override to page-config.ts**

Add a new variable and setter after the existing `_renderStoreCode` / `_renderApiUrl` (around line 38):

```typescript
let _renderPageConfigOverride: string | null = null;

/**
 * Override the page config for preview mode.
 * When set, getPageConfig() uses this file instead of the store's default.
 */
export function setRenderPageConfigOverride(filename: string | null): void {
  _renderPageConfigOverride = filename;
}
```

Update the `getPageConfig()` function (line 59) to check the override first:

```typescript
function getPageConfig(storeCode?: string): PageConfigShape {
  // Preview mode override takes priority
  if (_renderPageConfigOverride && pageConfigRegistry[_renderPageConfigOverride]) {
    return pageConfigRegistry[_renderPageConfigOverride];
  }
  const code = storeCode ?? _renderStoreCode;
  if (!code) return defaultPageConfig;
  const storeEntry = (storesConfig.stores as Record<string, { theme: string; pageConfig: string }>)[code];
  if (!storeEntry) return defaultPageConfig;
  return pageConfigRegistry[storeEntry.pageConfig] || defaultPageConfig;
}
```

Also export the `pageConfigRegistry` keys so the toolbar can list available configs:

```typescript
export function getAvailablePageConfigs(): string[] {
  return Object.keys(pageConfigRegistry);
}
```

**Step 2: Set the override in index.tsx getDemoContext**

In the `getDemoContext` function (currently line 91), after `setRenderApiUrl`, add:

```typescript
import { setRenderStore, setRenderApiUrl, setRenderPageConfigOverride } from './page-config';

// Inside getDemoContext, after setRenderApiUrl:
const devSession = c.get('devSession') as DevSession | undefined;
setRenderPageConfigOverride(devSession?.pageconfig ?? null);
```

Note: `getDemoContext` will need to accept `c` (Hono context) to read the dev session. Update its signature:

```typescript
async function getDemoContext(c: any): Promise<{ demoStores: DemoStore[]; currentStoreCode: string | undefined }> {
  const demoStores = await getStoreRegistry(c.env);
  const hostname = new URL(c.req.url).hostname;
  const currentStoreCode = getCurrentStoreCode(hostname, demoStores);
  setRenderStore(currentStoreCode);
  setRenderApiUrl(getApiUrl(c.env, demoStores, currentStoreCode));
  // Preview: page config override from dev session
  const devSession = c.get('devSession') as DevSession | undefined;
  setRenderPageConfigOverride(devSession?.pageconfig ?? null);
  return { demoStores, currentStoreCode };
}
```

Check: `getDemoContext` already takes `c` as its parameter (line 91), so the signature doesn't change - just add the two lines.

**Step 3: Commit**

```bash
git add src/page-config.ts src/index.tsx
git commit -m "feat: support page config override in preview mode"
```

---

### Task 6: Timing Instrumentation & __DEV_DATA Injection

**Files:**
- Modify: `src/index.tsx` - wrap API/KV calls with timing, inject `__DEV_DATA`
- Modify: `src/templates/Layout.tsx` - render `__DEV_DATA` script + toolbar

**Step 1: Create a DevData type**

Add to `src/dev-auth.ts`:

```typescript
export interface DevData {
  storeCode: string | undefined;
  pageConfig: string | null;
  themeName: string;
  preview: boolean;
  edgeCache: string; // HIT, MISS, BYPASS, PREVIEW-BYPASS
  kvReads: Array<{ key: string; hit: boolean; ms: number }>;
  apiCalls: Array<{ url: string; ms: number; status: number }>;
  renderMs: number;
  availablePageConfigs: string[];
  currentPath: string;
}
```

**Step 2: Add timing collection to index.tsx**

This is done per-route rather than globally. For each route handler that fetches from KV or API, wrap calls with timing. The pattern:

```typescript
// In route handlers, when dev session is active:
const devSession = c.get('devSession');
const devData: Partial<DevData> = {};
const kvReads: DevData['kvReads'] = [];
const apiCalls: DevData['apiCalls'] = [];

// Wrap KV reads:
const t0 = Date.now();
const data = await store.get<T>(key);
kvReads.push({ key, hit: data !== null, ms: Date.now() - t0 });

// Wrap API calls:
const t1 = Date.now();
const result = await apiClient.fetchSomething();
apiCalls.push({ url: '/api/...', ms: Date.now() - t1, status: 200 });
```

Rather than wrapping every single call inline, create a helper function in `src/dev-auth.ts`:

```typescript
/** Wrap a KV/API call with timing when dev session is active */
export function createDevTimer() {
  const kvReads: DevData['kvReads'] = [];
  const apiCalls: DevData['apiCalls'] = [];
  const startTime = Date.now();

  return {
    kvReads,
    apiCalls,
    startTime,
    async trackKv<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const t0 = Date.now();
      const result = await fn();
      kvReads.push({ key, hit: result !== null && result !== undefined, ms: Date.now() - t0 });
      return result;
    },
    async trackApi<T>(url: string, fn: () => Promise<T & { status?: number }>): Promise<T> {
      const t0 = Date.now();
      try {
        const result = await fn();
        apiCalls.push({ url, ms: Date.now() - t0, status: (result as any)?.status || 200 });
        return result;
      } catch (e) {
        apiCalls.push({ url, ms: Date.now() - t0, status: 500 });
        throw e;
      }
    },
    getRenderMs(): number {
      return Date.now() - startTime;
    },
  };
}
```

The full per-route instrumentation is extensive (12+ route handlers). For the initial implementation, instrument the **home**, **category**, and **product** routes as they are the most visited. Other routes can be instrumented incrementally.

**Step 3: Update Layout.tsx to accept and render DevData**

Add to `LayoutProps`:

```typescript
import type { DevData } from '../dev-auth';

interface LayoutProps {
  config: StoreConfig;
  categories: Category[];
  footerPages?: FooterPage[];
  demoStores?: DemoStore[];
  currentStoreCode?: string;
  storeApiUrl?: string;
  devData?: DevData | null;  // NEW
  children: any;
}
```

Before the closing `</body>` tag, conditionally inject dev data:

```tsx
{devData && (
  <>
    <script dangerouslySetInnerHTML={{
      __html: `window.__DEV_DATA=${JSON.stringify(devData)};`
    }} />
    <div data-controller="dev-toolbar" class="dev-toolbar" />
  </>
)}
```

**Step 4: Commit**

```bash
git add src/dev-auth.ts src/index.tsx src/templates/Layout.tsx
git commit -m "feat: add timing instrumentation and __DEV_DATA injection for dev toolbar"
```

---

### Task 7: Dev Toolbar Stimulus Controller

**Files:**
- Create: `src/js/controllers/dev-toolbar-controller.js`
- Modify: `src/js/app.js:27-55` (register controller)

**Step 1: Create the Stimulus controller**

Create `src/js/controllers/dev-toolbar-controller.js`:

```javascript
/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';

export default class DevToolbarController extends Controller {
  static values = {};

  connect() {
    this.devData = window.__DEV_DATA;
    if (!this.devData) return;

    this.collapsed = localStorage.getItem('dev-toolbar-collapsed') === 'true';
    this.activePanel = null;
    this.render();
  }

  render() {
    const d = this.devData;
    if (!d) return;

    const edgeBadge = this.cacheBadge(d.edgeCache);
    const kvHits = d.kvReads.filter(r => r.hit).length;
    const kvTotal = d.kvReads.length;
    const totalKvMs = d.kvReads.reduce((s, r) => s + r.ms, 0);
    const totalApiMs = d.apiCalls.reduce((s, r) => s + r.ms, 0);

    this.element.innerHTML = `
      <div class="dt-bar ${this.collapsed ? 'dt-collapsed' : ''}">
        <div class="dt-toggle" data-action="click->dev-toolbar#toggle">
          ${this.collapsed ? '&#9650; Dev' : '&#9660; Dev Toolbar'}
        </div>
        ${this.collapsed ? '' : `
          <div class="dt-items">
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="store">
              &#128218; ${d.storeCode || 'default'} &middot; ${d.pageConfig || 'default'}
            </span>
            <span class="dt-item">
              ${edgeBadge} &middot; KV ${kvHits}/${kvTotal}
            </span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="perf">
              &#9201; ${d.renderMs}ms &middot; API ${totalApiMs}ms &middot; KV ${totalKvMs}ms
            </span>
            <span class="dt-item dt-preview ${d.preview ? 'dt-active' : ''}" data-action="click->dev-toolbar#togglePreview">
              ${d.preview ? '&#128065; PREVIEW ON' : '&#128065; Preview'}
            </span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="api">&#128196; API</span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="kv">&#128451; KV</span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="actions">&#9881; Actions</span>
            <a href="/dev/logout" class="dt-item dt-logout">Logout</a>
          </div>
        `}
      </div>
      ${this.activePanel ? this.renderPanel(this.activePanel) : ''}
    `;
  }

  cacheBadge(status) {
    const colors = { HIT: '#36d399', MISS: '#fbbd23', BYPASS: '#f87272', 'PREVIEW-BYPASS': '#a991f7' };
    return `<span style="color:${colors[status] || '#999'}">&#9679; ${status}</span>`;
  }

  renderPanel(panel) {
    const d = this.devData;
    let content = '';

    switch (panel) {
      case 'store':
        content = `
          <div><strong>Store:</strong> ${d.storeCode || 'default'}</div>
          <div><strong>Page Config:</strong> ${d.pageConfig || 'store default'}</div>
          <div><strong>Theme:</strong> ${d.themeName}</div>
          <div><strong>Path:</strong> ${d.currentPath}</div>
          <div style="margin-top:8px"><strong>Switch page config:</strong></div>
          <div class="dt-config-list">
            ${d.availablePageConfigs.map(pc => `
              <button class="dt-config-btn ${d.pageConfig === pc ? 'dt-active' : ''}"
                data-action="click->dev-toolbar#switchPageConfig"
                data-config="${pc}">${pc}</button>
            `).join('')}
            <button class="dt-config-btn ${!d.pageConfig ? 'dt-active' : ''}"
              data-action="click->dev-toolbar#switchPageConfig"
              data-config="">Store default</button>
          </div>
        `;
        break;
      case 'perf':
        content = `
          <div><strong>Render:</strong> ${d.renderMs}ms total</div>
          <div><strong>API Calls:</strong></div>
          ${d.apiCalls.map(a => `<div class="dt-mono">${a.status} ${a.url} (${a.ms}ms)</div>`).join('') || '<div class="dt-mono">None</div>'}
          <div style="margin-top:8px"><strong>KV Reads:</strong></div>
          ${d.kvReads.map(k => `<div class="dt-mono">${k.hit ? '&#9989;' : '&#10060;'} ${k.key} (${k.ms}ms)</div>`).join('') || '<div class="dt-mono">None</div>'}
        `;
        break;
      case 'api':
        content = `<div class="dt-mono" style="max-height:300px;overflow:auto;white-space:pre-wrap">${JSON.stringify(d, null, 2)}</div>`;
        break;
      case 'kv':
        content = `
          <div><strong>KV keys accessed:</strong></div>
          ${d.kvReads.map(k => `
            <div class="dt-mono">${k.hit ? 'HIT' : 'MISS'} ${k.key} (${k.ms}ms)</div>
          `).join('') || '<div class="dt-mono">No KV reads</div>'}
        `;
        break;
      case 'actions':
        content = `
          <button class="dt-action-btn" data-action="click->dev-toolbar#purgePage">Purge current page cache</button>
          <button class="dt-action-btn" data-action="click->dev-toolbar#purgeAll">Purge all cache</button>
          <button class="dt-action-btn" data-action="click->dev-toolbar#forceSync">Force re-sync</button>
          <div class="dt-action-status" data-dev-toolbar-target="actionStatus"></div>
        `;
        break;
    }

    return `<div class="dt-panel">${content}</div>`;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('dev-toolbar-collapsed', this.collapsed);
    this.activePanel = null;
    this.render();
  }

  showPanel(event) {
    const panel = event.currentTarget.dataset.panel;
    this.activePanel = this.activePanel === panel ? null : panel;
    this.render();
  }

  async togglePreview() {
    const newState = !this.devData.preview;
    try {
      const resp = await fetch('/dev/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: newState }),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to toggle preview:', e);
    }
  }

  async switchPageConfig(event) {
    const config = event.currentTarget.dataset.config || null;
    try {
      const resp = await fetch('/dev/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageconfig: config }),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to switch page config:', e);
    }
  }

  async purgePage() {
    const path = window.location.pathname;
    const storeCode = window.MAHO_STORE_CODE;
    const prefix = storeCode ? `${storeCode}:` : '';
    // Determine likely KV keys for this page
    const keys = [];
    if (path === '/') {
      keys.push(`${prefix}homepage`);
    } else {
      keys.push(`${prefix}category:${path.replace(/^\//, '')}`);
      keys.push(`${prefix}product:${path.replace(/^\//, '')}`);
      keys.push(`${prefix}cms:${path.replace(/^\//, '')}`);
    }
    await this.purgeKeys(keys);
  }

  async purgeAll() {
    // Use the sync endpoint to force full re-sync
    await this.forceSync();
  }

  async forceSync() {
    this.setActionStatus('Syncing...');
    try {
      const resp = await fetch('/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.getSyncSecret()}` },
      });
      if (resp.ok) {
        this.setActionStatus('Sync complete. Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.setActionStatus(`Sync failed: ${resp.status}`);
      }
    } catch (e) {
      this.setActionStatus(`Sync error: ${e.message}`);
    }
  }

  async purgeKeys(keys) {
    this.setActionStatus('Purging...');
    try {
      const resp = await fetch('/cache/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSyncSecret()}`,
        },
        body: JSON.stringify({ keys }),
      });
      if (resp.ok) {
        this.setActionStatus('Purged. Reloading...');
        setTimeout(() => window.location.reload(), 500);
      } else {
        this.setActionStatus(`Purge failed: ${resp.status}`);
      }
    } catch (e) {
      this.setActionStatus(`Error: ${e.message}`);
    }
  }

  getSyncSecret() {
    // The sync secret needs to be available client-side for toolbar actions.
    // It's injected via __DEV_DATA when dev session is active.
    return window.__DEV_DATA?.syncSecret || '';
  }

  setActionStatus(msg) {
    const el = this.element.querySelector('[data-dev-toolbar-target="actionStatus"]');
    if (el) el.textContent = msg;
  }
}
```

**Step 2: Register in app.js**

Add import and registration in `src/js/app.js`:

After the existing imports (line 28):
```javascript
import DevToolbarController from './controllers/dev-toolbar-controller.js';
```

After the last `application.register` call (line 55):
```javascript
application.register('dev-toolbar', DevToolbarController);
```

**Step 3: Commit**

```bash
git add src/js/controllers/dev-toolbar-controller.js src/js/app.js
git commit -m "feat: add dev toolbar Stimulus controller with panels and actions"
```

---

### Task 8: Dev Toolbar CSS

**Files:**
- Create: `src/css/dev-toolbar.css`

**Step 1: Create the toolbar styles**

Create `src/css/dev-toolbar.css`:

```css
/* Dev Toolbar - only rendered for authenticated dev sessions */
.dev-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
}

.dt-bar {
  display: flex;
  align-items: center;
  background: #1e1e2e;
  border-top: 1px solid #313244;
  color: #cdd6f4;
  padding: 0;
  min-height: 32px;
}

.dt-collapsed {
  justify-content: center;
}

.dt-toggle {
  padding: 6px 12px;
  cursor: pointer;
  color: #89b4fa;
  font-weight: 600;
  user-select: none;
  white-space: nowrap;
  border-right: 1px solid #313244;
}
.dt-toggle:hover {
  background: #313244;
}

.dt-items {
  display: flex;
  align-items: center;
  overflow-x: auto;
  flex: 1;
}

.dt-item {
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  border-right: 1px solid #313244;
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
}
.dt-item:hover {
  background: #313244;
}

.dt-preview.dt-active {
  background: #1e1e2e;
  color: #a6e3a1;
  font-weight: 600;
}

.dt-logout {
  margin-left: auto;
  color: #f38ba8;
}

/* Panels */
.dt-panel {
  position: fixed;
  bottom: 32px;
  left: 0;
  right: 0;
  background: #1e1e2e;
  border-top: 1px solid #313244;
  color: #cdd6f4;
  padding: 16px;
  max-height: 50vh;
  overflow-y: auto;
  z-index: 99998;
}

.dt-mono {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 11px;
  padding: 2px 0;
  color: #bac2de;
}

.dt-config-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.dt-config-btn {
  padding: 4px 10px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 4px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}
.dt-config-btn:hover {
  background: #45475a;
}
.dt-config-btn.dt-active {
  background: #89b4fa;
  color: #1e1e2e;
  border-color: #89b4fa;
}

.dt-action-btn {
  display: block;
  padding: 6px 14px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 4px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  margin-bottom: 6px;
  transition: background 0.15s;
}
.dt-action-btn:hover {
  background: #45475a;
}

.dt-action-status {
  margin-top: 8px;
  font-size: 11px;
  color: #a6e3a1;
}
```

**Step 2: Include in the CSS build**

The toolbar CSS should only be loaded when a dev session is active. Since our CSS is concatenated at build time and served to all visitors, we have two options:

**Option A (simple):** Include it in the main bundle. It's ~2KB and only contains `.dt-*` classes - zero visual impact when the toolbar div isn't rendered.

**Option B (optimal):** Inline it in the `__DEV_DATA` script block so it's only sent to dev sessions.

Go with **Option A** for simplicity. The CSS file just needs to be in `src/css/` and it'll be picked up by the build.

**Step 3: Commit**

```bash
git add src/css/dev-toolbar.css
git commit -m "feat: add dev toolbar CSS - Catppuccin-inspired dark theme"
```

---

### Task 9: Wire Up Dev Data in Route Handlers

**Files:**
- Modify: `src/index.tsx` - update home, category, and product route handlers

This task instruments the three main route handlers with timing collection and passes `devData` to Layout. The pattern is the same for each route - shown here for the home route as the template.

**Step 1: Create a helper to build DevData in index.tsx**

Add near the dev middleware section:

```typescript
import { getAvailablePageConfigs } from './page-config';
import type { DevData } from './dev-auth';
import { createDevTimer } from './dev-auth';

function buildDevData(
  c: any,
  timer: ReturnType<typeof createDevTimer>,
  storeCode: string | undefined,
  pageConfig: string | null,
  themeName: string,
  edgeCache: string,
): DevData | null {
  const session = c.get('devSession') as DevSession | undefined;
  if (!session) return null;
  return {
    storeCode,
    pageConfig,
    themeName,
    preview: session.preview,
    edgeCache,
    kvReads: timer.kvReads,
    apiCalls: timer.apiCalls,
    renderMs: timer.getRenderMs(),
    availablePageConfigs: getAvailablePageConfigs(),
    currentPath: new URL(c.req.url).pathname,
    syncSecret: c.env.SYNC_SECRET, // For toolbar actions
  };
}
```

Also add `syncSecret` to the `DevData` interface in `src/dev-auth.ts`:

```typescript
export interface DevData {
  storeCode: string | undefined;
  pageConfig: string | null;
  themeName: string;
  preview: boolean;
  edgeCache: string;
  kvReads: Array<{ key: string; hit: boolean; ms: number }>;
  apiCalls: Array<{ url: string; ms: number; status: number }>;
  renderMs: number;
  availablePageConfigs: string[];
  currentPath: string;
  syncSecret?: string;
}
```

**Step 2: Update home route handler**

In the home route handler (the `app.get('/')` route), wrap KV/API calls with the timer and pass `devData` to Layout. The exact modifications depend on the current handler structure - look for the `store.get()` and `apiClient.fetch()` calls and wrap them.

Pattern for each route:

```typescript
app.get('/', withEdgeCache(CACHE_HOME), async (c) => {
  const session = c.get('devSession');
  const timer = session ? createDevTimer() : null;

  // Existing code, but wrap store.get() calls:
  const config = timer
    ? await timer.trackKv(`${prefix}config`, () => store.get<StoreConfig>(`${prefix}config`))
    : await store.get<StoreConfig>(`${prefix}config`);

  // ... rest of handler ...

  // Pass devData to Layout
  const devData = timer ? buildDevData(c, timer, currentStoreCode, session?.pageconfig ?? null, themeName, 'MISS') : null;

  return c.html(
    <Layout config={config} categories={categories} devData={devData} /* ...other props */>
      {/* page content */}
    </Layout>
  );
});
```

Apply this pattern to:
1. Home route (`/`)
2. Category route (`/:slug`)
3. Product route (`/:slug`) - within the product branch of the catch-all

For routes without dev session, `timer` is null and `devData` is null - zero overhead.

**Step 3: Commit**

```bash
git add src/index.tsx src/dev-auth.ts
git commit -m "feat: wire dev data timing to home, category, and product routes"
```

---

### Task 10: Sync Dev Tokens and Password Gate Config

**Files:**
- Modify: `src/index.tsx` - add `/dev/config` admin endpoint for setting password gate + tokens

**Step 1: Add dev config management endpoints**

These endpoints let the Maho admin module (or manual curl) set the password gate and manage tokens:

```typescript
// POST /dev/config - set password gate and storefront password (auth-protected via SYNC_SECRET)
app.post('/dev/config', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    passwordGate?: boolean;
    storefrontPassword?: string;
  }>();

  const store = new CloudflareKVStore(c.env.CONTENT);

  if (body.passwordGate !== undefined) {
    await store.put('config:password_gate', body.passwordGate);
  }
  if (body.storefrontPassword !== undefined) {
    await store.put('config:storefront_password', body.storefrontPassword);
  }

  return c.json({ ok: true });
});

// POST /dev/tokens - create a dev token (auth-protected via SYNC_SECRET)
app.post('/dev/tokens', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  const env: Env = c.env;
  if (!env.DEV_SECRET) return c.json({ error: 'DEV_SECRET not configured' }, 500);

  const body = await c.req.json<{
    label: string;
    permissions?: string[];
    expiresInDays?: number;
  }>();

  // Generate a random token
  const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const tokenHash = await hashToken(rawToken, env.DEV_SECRET);

  const store = new CloudflareKVStore(c.env.CONTENT);
  const now = new Date();
  const expires = new Date(now.getTime() + (body.expiresInDays || 30) * 24 * 60 * 60 * 1000);

  await store.put(`dev:token:${tokenHash}`, {
    label: body.label,
    created: now.toISOString(),
    expires: expires.toISOString(),
    permissions: body.permissions || ['gate', 'preview'],
  });

  return c.json({
    token: rawToken,
    hash: tokenHash,
    label: body.label,
    expires: expires.toISOString(),
  });
});

// DELETE /dev/tokens/:hash - revoke a dev token (auth-protected via SYNC_SECRET)
app.delete('/dev/tokens/:hash', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const hash = c.req.param('hash');
  const store = new CloudflareKVStore(c.env.CONTENT);
  await store.delete(`dev:token:${hash}`);

  return c.json({ ok: true, deleted: hash });
});

// GET /dev/tokens - list all dev tokens (auth-protected via SYNC_SECRET)
app.get('/dev/tokens', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const store = new CloudflareKVStore(c.env.CONTENT);
  const keys = await store.list('dev:token:');
  const tokens = [];

  for (const key of keys) {
    const data = await store.get(key);
    tokens.push({ hash: key.replace('dev:token:', ''), ...data });
  }

  return c.json({ tokens });
});
```

Also add `/dev/config`, `/dev/tokens` to the `GATE_EXCLUDED` set.

**Step 2: Commit**

```bash
git add src/index.tsx
git commit -m "feat: add dev config and token management endpoints"
```

---

### Task 11: Build, Test, and Deploy

**Step 1: Build**

```bash
cd /Volumes/second_disk/Development/Tenniswarehouse/maho-storefront
npm run build
```

Verify no TypeScript errors.

**Step 2: Test locally**

```bash
npm run dev
```

Test the following manually:

1. **Without DEV_SECRET:** All pages load normally, no gate, no toolbar
2. **Set DEV_SECRET in .dev.vars:** `DEV_SECRET=test-secret-123`
3. **Enable gate via curl:**
   ```bash
   curl -X POST http://localhost:8787/dev/config \
     -H "Authorization: Bearer changeme" \
     -H "Content-Type: application/json" \
     -d '{"passwordGate": true, "storefrontPassword": "demo123"}'
   ```
4. **Visit http://localhost:8787** → should show password page
5. **Enter password** → should redirect to home with toolbar
6. **Create a token:**
   ```bash
   curl -X POST http://localhost:8787/dev/tokens \
     -H "Authorization: Bearer changeme" \
     -H "Content-Type: application/json" \
     -d '{"label": "test token"}'
   ```
7. **Use token:** Visit `http://localhost:8787/?devtoken=<token>` → should set cookie and redirect
8. **Toggle preview mode** from toolbar → page should reload
9. **Switch page config** from toolbar → page should reload with different layout
10. **Purge cache** from toolbar → should trigger cache delete

**Step 3: Deploy**

```bash
./deploy.sh
```

Or for demo:
```bash
npx wrangler deploy -c wrangler.demo.toml
```

**Step 4: Set secrets in production**

```bash
npx wrangler secret put DEV_SECRET -c wrangler.demo.toml
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during dev login testing"
```

---

### Task 12: Update Documentation

**Files:**
- Create: `docs/architecture/dev-login.md` (in maho-storefront-docs repo)

**Step 1: Write the dev login documentation**

Document:
- How to enable the password gate (KV config)
- How to generate and manage dev tokens (API endpoints)
- How preview mode works
- Dev toolbar features
- Security considerations
- Environment variables required

**Step 2: Commit to docs repo**

```bash
cd /Volumes/second_disk/Development/Tenniswarehouse/maho-storefront-docs
git add architecture/dev-login.md
git commit -m "docs: add dev login and preview mode documentation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Env type + wrangler config | `types.ts`, `wrangler.toml`, `wrangler.demo.toml` |
| 2 | dev-auth.ts module | `dev-auth.ts` (new) |
| 3 | Password gate middleware + login route | `index.tsx` |
| 4 | Preview mode toggle route + cache bypass | `index.tsx` |
| 5 | Page config override | `page-config.ts`, `index.tsx` |
| 6 | Timing instrumentation + __DEV_DATA | `dev-auth.ts`, `index.tsx`, `Layout.tsx` |
| 7 | Dev toolbar Stimulus controller | `dev-toolbar-controller.js` (new), `app.js` |
| 8 | Dev toolbar CSS | `dev-toolbar.css` (new) |
| 9 | Wire dev data in route handlers | `index.tsx` |
| 10 | Token + password gate management endpoints | `index.tsx` |
| 11 | Build, test, deploy | - |
| 12 | Documentation | `dev-login.md` (new) |

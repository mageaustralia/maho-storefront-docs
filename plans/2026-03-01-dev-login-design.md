# Dev Login & Preview Mode - Design Spec

> **Date:** 2026-03-01
> **Status:** Approved
> **Scope:** Maho Storefront (Cloudflare Workers)

## Problem

The storefront has no access control. Pre-launch stores are publicly visible. Developers and clients can't preview draft content or test alternate configurations without deploying changes. There's no visibility into cache behaviour or API performance without browser dev tools.

Shopify solves this with a "development login" - a password gate with bypass tokens for developers. We need the same for our Cloudflare Workers storefront, plus preview mode and developer tooling.

## Goals

1. **Password-protect** pre-launch or staging storefronts without redeploying workers
2. **Preview** draft CMS pages, disabled products, and alternate page.json configs
3. **Surface** cache status, API performance, and active config to developers in real time
4. **Revoke** access instantly from Maho admin

## Non-Goals

- Customer authentication (handled by Maho backend)
- OAuth / SSO / MFA (use Cloudflare Access for enterprise needs)
- Content editing (Maho admin is the editor; this is read-only preview)

---

## Architecture

### Approach: Cookie-Based Sessions

A dev token in the URL (`?devtoken=<token>`) establishes a session. The worker validates the token against KV, sets an HMAC-signed cookie, and all subsequent requests authenticate via the cookie. Clean URLs after the first visit.

**Why not token-in-every-request?** Tokens leak into analytics, referrer headers, and browser history. Poor UX for browsing a store.

**Why not Cloudflare Access?** Requires a Zero Trust plan, can't differentiate between password gate and preview mode, doesn't provide a dev toolbar.

---

## Layer 1: Password Gate

### When Active

The gate is controlled by a KV key: `config:password_gate`. When the key exists with a truthy value, all public GET requests are intercepted. Toggled via the `/sync` admin endpoint or Maho admin module - no worker redeploy needed.

The password itself is stored in KV as `config:storefront_password`.

### Request Flow

1. Middleware runs on every GET request before route handlers
2. Check for `__dev_session` cookie - if valid HMAC signature and not expired, pass through
3. If no valid cookie, render a minimal password page (standalone HTML, no Layout dependency)
4. Password page POSTs to `/dev/login` with the entered password
5. Worker validates against KV `config:storefront_password`
6. On success, set `__dev_session` cookie (HMAC-signed, 7-day TTL), redirect to original URL
7. On failure, re-render password page with error

### Token Bypass

Admin-generated dev tokens skip the password form. `?devtoken=<token>` validates against KV `dev:token:<hash>`, sets the same `__dev_session` cookie, and strips the query param via redirect.

### Excluded Routes

Static assets (`/public/*`), `/sync`, `/dev/login`, `/robots.txt`, `/favicon.ico`, health checks.

---

## Layer 2: Preview Mode

### Purpose

See unpublished content before it goes live - draft CMS pages, disabled products, alternate page.json configurations.

### Activation

Toggled from the dev toolbar (requires an active dev session). Preview state is stored in the `__dev_session` cookie payload as a `preview: true` flag.

### Behaviour

| Feature | Normal Mode | Preview Mode |
|---------|------------|--------------|
| CMS pages/blocks | Active only | All (including disabled) |
| Products | Enabled + visible only | All (including disabled/hidden) |
| Page config | Store's default page.json | Overridable via `?pageconfig=filename` |
| Edge cache | Active | Bypassed |
| Visual indicator | None | "DRAFT" badges on unpublished items |

### API Integration

When preview mode is active, the worker passes `?preview=1` on all Maho API requests. The API skips `status=enabled` and `is_active=1` filters when this param is present with a valid admin/API token. The admin token is passed server-side - never exposed to the browser.

Public requests with `preview=1` are ignored by the API (no permission escalation).

### Alternate Page Config

Query param `?pageconfig=page-tech.json` loads a different page config file for the session. Stored in the cookie payload so it persists across navigation. Lets developers test switching gallery variants, tab styles, card layouts without touching wrangler.toml.

---

## Layer 3: Dev Toolbar

### When Rendered

Only when `__dev_session` cookie is valid. Never visible to public visitors.

### Information Panels

| Panel | Content |
|-------|---------|
| Store Context | Current store code, active page.json file, theme name |
| Cache Status | Edge cache hit/miss, KV cache hit/miss, cache key used |
| Performance | Total render time, API response time, KV read time |
| Preview Controls | Toggle preview on/off, page.json config dropdown, "PREVIEW ACTIVE" indicator |
| API Inspector | Expandable raw API response for current page |
| KV Inspector | KV keys for current page, TTLs, stored values |
| Actions | Purge cache (current page / entire store), force re-sync from API |

### Implementation

- **Server-side:** Worker collects timing data during request processing (API call duration, KV reads, cache hit/miss) and injects `window.__DEV_DATA` JSON blob into the HTML
- **Client-side:** Stimulus controller (`dev-toolbar-controller.js`) reads `__DEV_DATA`, renders the toolbar, handles interactions
- **Visual:** Fixed bar at viewport bottom. Dark background, monospace text, collapsible panels. Chrome DevTools aesthetic.
- **Actions:** Purge and sync use existing `/cache/delete` and `/sync` endpoints (already gated by `SYNC_SECRET`)

### Performance Impact

Zero overhead for public visitors. For dev sessions: lightweight `Date.now()` instrumentation around existing KV/API calls. `__DEV_DATA` blob adds ~1-2KB to HTML response.

---

## Token Management & Security

### Token Lifecycle

1. **Created** in Maho admin (Storefront module > Dev Access). Admin enters a label (e.g. "Sarah - designer", "CI preview"), module generates a random token, HMAC-SHA256 hashes it, syncs hash to KV
2. **Stored** in KV as `dev:token:<hmac_hash>` with metadata: `{"label", "created", "expires", "permissions": ["gate", "preview"]}`
3. **Used** once in URL (`?devtoken=<raw_token>`), validated by hashing and looking up in KV, sets `__dev_session` cookie
4. **Revoked** by deleting KV key from admin. Existing cookies valid until expiry (7 days) or `DEV_SECRET` rotation

### Cookie Structure

HMAC-signed payload (not encrypted - no sensitive data):

```
base64({
  "token_hash": "<hash>",
  "preview": false,
  "pageconfig": null,
  "issued": 1709300000,
  "expires": 1709904800
}).<hmac_signature>
```

### Security

- Raw tokens never stored - only HMAC hashes in KV
- Cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
- `DEV_SECRET` env var signs cookies - rotating it invalidates all sessions
- Preview API requests use a server-side admin token (not exposed to browser)
- Toolbar actions (purge, sync) go through existing `SYNC_SECRET`-gated endpoints
- No sensitive data in cookie payload - token hash is not reversible

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DEV_SECRET` | HMAC signing key for `__dev_session` cookies | Yes (when dev login is used) |
| `SYNC_SECRET` | Existing - gates `/sync` and `/cache/*` endpoints | Already exists |

The storefront password and gate toggle live in KV, not env vars, so they can be changed without redeploying.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/dev-auth.ts` | New - cookie signing/validation, token checking, password gate middleware |
| `src/dev-toolbar.tsx` | New - JSX component for toolbar HTML |
| `src/js/controllers/dev-toolbar-controller.js` | New - Stimulus controller for toolbar interactivity |
| `src/index.tsx` | Add dev auth middleware, `/dev/login` route, inject `__DEV_DATA` |
| `src/templates/Layout.tsx` | Conditionally render dev toolbar + `__DEV_DATA` script |
| `src/page-config.ts` | Support runtime page config override from cookie |
| `wrangler.toml` / `wrangler.demo.toml` | Add `DEV_SECRET` variable |

### Maho Admin Side

| File | Change |
|------|--------|
| Mageaustralia_Storefront module | Add Dev Access admin section - token CRUD, password gate toggle |
| Sync endpoint | Include `dev:token:*` and `config:password_gate` / `config:storefront_password` keys |

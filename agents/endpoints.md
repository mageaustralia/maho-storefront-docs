# Agent Endpoints Reference

Every endpoint the storefront publishes for AI agents and automated readers. All endpoints are cacheable, public, and shipped by every Maho Storefront deployment without further configuration.

## `/llms.txt`

A curated reading list for AI agents. Follows the [llmstxt.org](https://llmstxt.org/) convention: plain text with light markdown, ≤ a few KB.

The file is **generated per request from KV** so it stays in sync with whatever the rest of the storefront is rendering — store name and description from `store-config`, top categories from the cached category tree (filtered to `includeInMenu`), footer CMS pages from the cached CMS list, plus a "for agents" section pointing at the sitemap, robots, and markdown view.

**Source:** `src/agents/llms-txt.ts`
**Cache:** `public, max-age=3600`

### Example response

```text
# Pickle Warehouse

> Australia's home of pickleball — paddles, balls, nets, shoes, apparel and accessories.

This file describes Pickle Warehouse for AI agents and other automated readers.
The full storefront is at https://pickle.mageaustralia.com.au.

Most pages on this site return clean markdown when requested with `Accept: text/markdown`,
or by appending `/index.md` to the URL (e.g. `/categoryname/index.md`).
Use that format whenever possible — it cuts response size dramatically vs. the HTML view.

## Shop categories

- [Paddles](https://pickle.mageaustralia.com.au/paddles)
  - [Carbon Fibre](https://pickle.mageaustralia.com.au/paddles/carbon-fibre)
- [Balls & Court](https://pickle.mageaustralia.com.au/balls-court)
  - [Pickleball Nets](https://pickle.mageaustralia.com.au/balls-court/pickleball-nets)
...

## For agents

- Sitemap: https://pickle.mageaustralia.com.au/sitemap.xml
- Robots: https://pickle.mageaustralia.com.au/robots.txt
- Markdown view: append `/index.md` to any page URL, or send `Accept: text/markdown`.
- API: this storefront proxies a REST API at `/api/*`...
```

Also linked from `<head>` on every HTML page:

```html
<link rel="alternate" type="text/plain" href="/llms.txt">
```

## `/robots.txt`

Storefront-owned — not proxied from the backend. Carries [Content Signals](https://www.rfc-editor.org/draft-ietf-aicontrol-content-signals/) (the IETF draft popularised by Cloudflare's agent-readiness initiative) plus per-bot rules.

**Source:** `src/agents/robots-txt.ts`
**Cache:** `public, max-age=3600`

### Content signals

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

| Signal | Setting | Meaning |
|---|---|---|
| `search` | `yes` | Search engines may index our content for hyperlink + snippet results |
| `ai-input` | `yes` | Agents may use our content as RAG context / inference input at request time |
| `ai-train` | `no` | No bulk training. Reinforced by explicit `Disallow` rules for CCBot + meta-externalagent. |

::: warning Legal
The robots.txt body includes the EUDR Article 4 reservation-of-rights language:

> Any restrictions expressed via Content Signals are express reservations of rights under Article 4 of the European Union Directive 2019/790 on copyright and related rights in the Digital Single Market.

Don't strip that line — it's how `ai-train=no` becomes legally binding under EU law.
:::

### Disallow paths

User-specific or internal routes — agents that ignore these will either get a password gate or a 404:

```
Disallow: /checkout/
Disallow: /account/
Disallow: /cart/
Disallow: /dev/
Disallow: /sync/
Disallow: /cache/
Disallow: /admin
```

## `/sitemap.xml`

Storefront-generated from KV — **not** proxied from the backend (the backend's own sitemap was 404ing across storefronts and didn't carry `<lastmod>` consistently). Each entry includes a W3C-format `<lastmod>` derived from the entity's `updatedAt`, so crawlers can skip unchanged pages.

**Source:** `src/agents/sitemap.ts`
**Cache:** `public, max-age=3600`
**Spec:** [sitemaps.org 0.9](https://www.sitemaps.org/protocol.html)

### What's included

| Entity | Source | Priority | Changefreq |
|---|---|---|---|
| Homepage | hardcoded | 1.0 | daily |
| Categories (recursive) | `${store}:categories` array in KV | 0.8 | weekly |
| Products | `KV.list("${store}:product:")` | 0.6 | weekly |
| CMS pages | `KV.list("${store}:cms:")` (excludes `home`, `no-route`) | 0.4 | monthly |
| Blog posts | `KV.list("${store}:blog:")` | 0.5 | monthly |

Products are capped at 10,000 entries (well under sitemap.xml's 50k cap) to keep the response cheap on very large catalogues. If we exceed that, the route becomes a sitemap-index and per-type sitemaps move to separate routes.

### `<lastmod>` format

Maho's REST API returns timestamps as `YYYY-MM-DD HH:MM:SS` (space-separated, no timezone). The generator normalises these to W3C datetime by replacing the space with `T` and appending `Z`:

```
2026-04-30 12:34:56  →  2026-04-30T12:34:56Z
```

Missing or malformed timestamps are simply omitted (the `<lastmod>` element is optional in the spec).

## Markdown content negotiation

Any catalogue page (homepage, category, product, CMS page) returns clean markdown when an agent prefers it. This typically cuts response size by 80–90% versus the full HTML render.

**Source:** `src/agents/markdown.ts`
**Cache:** `public, max-age=600` with `Vary: Accept`

### Trigger

The middleware detects markdown intent and sets `c.var.wantsMarkdown` for downstream routes to branch on:

| Trigger | Example | Effect |
|---|---|---|
| `Accept: text/markdown` (no `text/html` fallback) | `Accept: text/markdown` | Markdown response |
| `/index.md` suffix | `GET /category-name/index.md` | Path rewritten to `/category-name`, markdown response |
| `.md` suffix | `GET /product-name.md` | Path rewritten to `/product-name`, markdown response |

::: tip Edge cache interaction
The edge-cache wrapper (`withEdgeCache`) keys on URL alone, so a previously-cached HTML response would clobber a markdown request to the same URL. The wrapper now bypasses the cache when `wantsMarkdown` is true. See `src/index.tsx` for the bypass branch (`withEdgeCache` → `if (wantsMd) return await handler()`).
:::

### Renderers

| Entity | Function | What's included |
|---|---|---|
| Homepage | `homeToMarkdown` | Store name, description, top categories |
| Category | `categoryToMarkdown` | Name, description, subcategories, first page of products with price + stock |
| Product | `productToMarkdown` | Name, SKU, price (with sale price if any), stock, descriptions, configurable options, image gallery |
| CMS page | `cmsPageToMarkdown` | Title, HTML body run through `htmlToText` |

`htmlToText` is a pragmatic regex-based stripper, not a full HTML→Markdown converter — Maho descriptions are mostly `<p>` / `<br>` / inline emphasis, which it handles directly. Heavy embeds (style blocks, scripts) are dropped.

### Example

```bash
curl -sH 'Accept: text/markdown' https://pickle.mageaustralia.com.au/paddles
```

```markdown
# Paddles

Browse Pickle Warehouse's full range of pickleball paddles...

## Subcategories

- [Carbon Fibre](https://pickle.mageaustralia.com.au/paddles/carbon-fibre)
- [Fiberglass](https://pickle.mageaustralia.com.au/paddles/fiberglass)

## Products

- [Selkirk Vanguard 2.0 Power Air Invikta](https://pickle.mageaustralia.com.au/selkirk-vanguard-2-0-power-air-invikta) — A$329.95
- [JOOLA Perseus CFS 16](https://pickle.mageaustralia.com.au/joola-perseus-cfs-16) — A$329.00
- [Engage Pursuit Pro1 6.0](https://pickle.mageaustralia.com.au/engage-pursuit-pro1-6-0) — A$299.95 _(out of stock)_
...
```

## `/.well-known/api-catalog`

A [RFC 9727](https://datatracker.ietf.org/doc/rfc9727/) JSON Resource Descriptor advertising the storefront's API surface. Every response includes a `Link: </.well-known/api-catalog>; rel="api-catalog"` header pointing here.

**Source:** `src/agents/api-catalog.ts`
**Cache:** `public, max-age=3600`

### Shape

```json
{
  "linkset": [
    {
      "anchor": "https://demo.mageaustralia.com.au/.well-known/api-catalog",
      "service-desc": [
        {
          "href": "https://demo.mageaustralia.com.au/api/docs.json",
          "type": "application/vnd.oai.openapi+json",
          "title": "OpenAPI 3 specification (JSON)"
        }
      ],
      "service-doc": [
        {
          "href": "https://demo.mageaustralia.com.au/api/docs",
          "type": "text/html",
          "title": "Swagger UI"
        }
      ],
      "status": [
        {
          "href": "https://demo.mageaustralia.com.au/pulse",
          "type": "application/json",
          "title": "Storefront pulse (worker hash + last-sync timestamp)"
        }
      ],
      "authorization-server": [
        {
          "href": "https://demo.mageaustralia.com.au/.well-known/oauth-authorization-server",
          "type": "application/json"
        }
      ],
      "mcp-server": [
        {
          "href": "https://demo.mageaustralia.com.au/.well-known/mcp/server-card.json",
          "type": "application/json"
        }
      ]
    }
  ]
}
```

The actual OpenAPI spec is auto-generated by Maho's API Platform on the backend and served at `/api/docs.json` (storefront proxies it through the `/api/*` catch-all to `/api/rest/v2/...`).

## `/.well-known/oauth-authorization-server`

[RFC 8414](https://datatracker.ietf.org/doc/rfc8414/) OAuth 2.0 Authorization Server Metadata. Agents discover how to authenticate without being told out-of-band.

**Source:** `src/agents/oauth-discovery.ts`
**Cache:** `public, max-age=3600`

### Shape

```json
{
  "issuer": "https://demo.mageaustralia.com.au",
  "token_endpoint": "https://demo.mageaustralia.com.au/api/auth/token",
  "revocation_endpoint": "https://demo.mageaustralia.com.au/api/auth/logout",
  "grant_types_supported": ["password", "refresh_token", "client_credentials"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "response_types_supported": ["token"],
  "scopes_supported": ["customer", "admin", "api_user"],
  "token_endpoint_auth_signing_alg_values_supported": ["HS256"],
  "service_documentation": "https://demo.mageaustralia.com.au/.well-known/api-catalog"
}
```

The storefront proxies `/api/auth/*` requests to the backend's `/api/rest/v2/auth/*`. From the agent's perspective the storefront origin is the issuer.

::: tip
PKCE isn't advertised because Maho's token endpoint is direct-grant, not redirect-based. If/when we add redirect-based OAuth (e.g. for customer SSO), this descriptor will grow `authorization_endpoint`, `code_challenge_methods_supported`, etc.
:::

## `/.well-known/mcp/server-card.json` and `/mcp`

The MCP discovery card and stub endpoint — see [MCP server](/agents/mcp) for the full breakdown of planned tools and the roadmap to a real server.

The card is published now (with `status: "planned"`) so discovery tooling picks us up; the `/mcp` endpoint itself returns 503 with a structured "coming soon" payload until the dedicated MCP Worker ships.

## Headers and middleware

Two route-wide concerns sit in `src/index.tsx`:

### Markdown negotiation middleware

```ts
import { markdownNegotiation } from './agents/markdown';
app.use('*', markdownNegotiation);
```

Runs before every route. Detects markdown intent (header or path suffix), rewrites the request URL to the canonical entity path, and sets `c.var.wantsMarkdown`. Downstream handlers branch on that to call `productToMarkdown` / `categoryToMarkdown` / etc.

### Link header

```ts
app.use('*', async (c, next) => {
  await next();
  c.header('Link', '</.well-known/api-catalog>; rel="api-catalog"', { append: true });
});
```

Appended to every response (after the handler runs, so handler-set headers are preserved). Per [RFC 8288](https://datatracker.ietf.org/doc/rfc8288/), this is how agents discover the catalog without first having to read robots/llms.

### Gate exclusions

The dev-auth password gate (used on staging/preview deployments) explicitly excludes all agent endpoints so isitagentready.com and external crawlers can validate them even on gated sites:

```ts
function isGateExcluded(path: string): boolean {
  return GATE_EXCLUDED.has(path)
      || path.startsWith('/.well-known/')
      || path === '/llms.txt'
      || path === '/mcp';
}
```

`/sitemap.xml` and `/robots.txt` are already in `GATE_EXCLUDED`; they were also added to a blocked-extension allowlist so the routine `.xml`/`.txt` blocker doesn't 404 them before the route handler runs.

## Source

| File | Lines | Description |
|---|---|---|
| `src/agents/api-catalog.ts` | ~70 | RFC 9727 linkset |
| `src/agents/llms-txt.ts` | ~95 | llmstxt.org reading list |
| `src/agents/markdown.ts` | ~245 | Middleware + per-entity renderers |
| `src/agents/mcp-server-card.ts` | ~90 | MCP discovery card + stub body |
| `src/agents/oauth-discovery.ts` | ~55 | RFC 8414 descriptor |
| `src/agents/robots-txt.ts` | ~65 | Content signals + bot rules |
| `src/agents/sitemap.ts` | ~165 | KV-driven sitemap with `<lastmod>` |

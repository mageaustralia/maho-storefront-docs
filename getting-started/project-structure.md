# Project Structure

```
maho-storefront/
├── src/
│   ├── index.tsx              # Worker entry — middleware stack + route wiring (registers
│   │                          #   the route modules below; thin, not a monolith)
│   ├── api-client.ts          # Maho REST API wrapper (paths under /api/rest/v2/)
│   ├── page-config.ts         # Variant resolver (page.json → component selection)
│   ├── theme-resolver.ts      # Theme resolver (stores.json → theme-*.json)
│   ├── types.ts               # TypeScript type definitions
│   ├── content-store.ts       # KV abstraction layer (with tracked timing)
│   ├── content-rewriter.ts    # Rewrites backend URLs + sanitises CMS HTML
│   ├── dev-auth.ts            # Password gate, dev tokens, preview, toolbar
│   ├── routes/                # Route modules extracted from index.tsx (register* fns)
│   │   ├── static-assets.ts   # /styles.css, /controllers.js, /favicon.*, /plugins/:name
│   │   ├── agents.ts          # /llms.txt, /robots.txt, /sitemap.xml, /.well-known/*, /mcp
│   │   ├── account-pages.tsx  # /login, /register, /account, /checkout, /order/success, …
│   │   ├── embed.ts           # /embed-demo, /embed.js, /embed/products
│   │   ├── cache-ops.ts       # /pulse, /freshness*, /cache/*
│   │   ├── dev-admin.ts       # /dev/config, /dev/tokens CRUD
│   │   └── url-resolver.tsx   # catch-all clean-URL resolver (registered LAST)
│   ├── sync/                  # Content-sync ETL (KV population from the backend)
│   │   ├── routes.ts          # POST /sync (full) + /sync/:type (partial)
│   │   └── entities.ts        # syncCategories (shared, children-preserving)
│   ├── middleware/            # security-headers (CSP), markdown negotiation
│   ├── utils/                 # json-ld, sanitize-html, image (srcset), pagination-links
│   ├── agents/                # Agent-readiness surface
│   │   ├── api-catalog.ts     # RFC 9727 linkset
│   │   ├── llms-txt.ts        # llmstxt.org reading list
│   │   ├── markdown.ts        # Accept: text/markdown renderers
│   │   ├── mcp-server-card.ts # MCP discovery card + stub /mcp body
│   │   ├── oauth-discovery.ts # RFC 8414 OAuth descriptor
│   │   ├── robots-txt.ts      # Content Signals + AI-bot rules
│   │   └── sitemap.ts         # KV-driven sitemap with <lastmod>
│   ├── plugins/               # Plugin system (see Architecture → Plugins)
│   │   ├── types.ts           # PluginManifest contract
│   │   ├── csp.ts             # Aggregates plugin-owned CSP sources
│   │   ├── filterable-pages/  # Brand pages, megamenu, dependent filters (routes + sync + manifest)
│   │   ├── social-login/      # Google/Apple/Facebook (manifest: slots + controller)
│   │   ├── stripe/            # Stripe payments (routes + sync + csp) — NOT core
│   │   └── braintree/         # Braintree payments (sync + csp) — NOT core
│   ├── generated/            # [generated] plugin registry (npm run generate)
│   ├── embed/                 # Standalone embeddable widget (IIFE bundle)
│   │   └── payments/          # PaymentAdapter interface + stripe.ts (gateway-agnostic checkout)
│   ├── css/                   # Legacy CSS source files
│   ├── js/
│   │   ├── app.js             # Stimulus application bootstrap
│   │   ├── api.js             # Client-side API helpers
│   │   ├── utils.js           # Utility fns (incl. reconcileCartBadge)
│   │   ├── payment-methods/   # Client payment adapter registry (self-registering plugins)
│   │   └── controllers/       # Stimulus controllers
│   └── templates/
│       ├── Layout.tsx          # Base HTML layout (site JSON-LD, <link rel=icon>, head hoisting)
│       ├── Home.tsx / Product.tsx / Category.tsx / …
│       └── components/         # Component variant system (navigation/, product-display/, …)
├── maho-module/              # Companion Maho PHP module (Mageaustralia_Storefront — backend half)
├── public/
│   ├── styles.css             # [generated] UnoCSS output
│   ├── controllers.js.txt     # [generated] esbuild JS bundle
│   ├── embed.js.txt           # [generated] embed widget IIFE bundle
│   └── plugins/               # [built] client payment scripts (stripe-payment.js, braintree-payment.js)
├── scripts/
│   ├── generate-plugin-registry.js  # Scans src/plugins/*/index.ts → src/generated/
│   └── generate-store-registry.js
├── wrangler.toml              # Cloudflare Workers configuration (gitignored)
├── uno.config.ts              # UnoCSS + DaisyUI configuration
├── theme.json / theme-*.json  # Theme design tokens (per store)
├── page.json                  # Default component variant config
├── stores.json                # Store → theme mapping
├── deploy.sh                  # Deployment script
└── package.json
```

## Key Directories

### `src/` - Application Source

The core application. `index.tsx` is the Worker entry point — it sets up the
middleware stack (security headers, bot-blocking, password gate, dev-auth, edge
caching) and **wires in the route modules** rather than defining every route
inline. The routes themselves live in `src/routes/` (and `src/sync/` for the
content-sync ETL), each exposing a `register…Routes(app, deps)` function that
`index.tsx` calls. This keeps the entry thin and the routes individually
testable.

### `src/plugins/` - Plugin System

Self-contained, optional features (payments, filterable pages, social login).
Manifest plugins are auto-discovered; server plugins (routes/sync) are wired
explicitly. Stripe and Braintree live here — **payments are plugins, not core**.
See [Plugins](/architecture/plugins).

### `src/templates/components/` - Variant System

Organized by domain (product-display, navigation, cart, etc.). Each slot has:
- `_manifest.json` - variant definitions
- `index.tsx` - variant resolver
- `VariantName.tsx` - individual variant implementations

See [Component Variants](/components/) for details.

### `src/js/controllers/` - Stimulus Controllers

Client-side behavior via Stimulus.js. Controllers attach to server-rendered HTML using `data-controller` attributes. See [Controllers](/controllers/) for details.

### `src/css/` - Stylesheets

Component-specific CSS loaded as UnoCSS preflights. Most styling comes from DaisyUI classes and UnoCSS utilities - these files handle complex component layouts.

## Configuration Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Cloudflare Workers config (KV bindings, env vars) |
| `uno.config.ts` | UnoCSS config (DaisyUI integration, theme tokens, preflights) |
| `theme.json` | Design tokens (colors, fonts, spacing, radii, shadows) |
| `page.json` | Component variant selection per page type |
| `stores.json` | Maps store codes to themes and page configs |

## Generated Files

| File | Generated By | Purpose |
|------|-------------|---------|
| `public/styles.css` | `bun run build:css` | CSS bundle |
| `public/controllers.js.txt` | `bun run build:js` | JS bundle |
| `manifest.json` | `bun run manifest` | Component metadata |

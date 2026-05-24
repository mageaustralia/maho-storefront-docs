# MCP Server

The [Model Context Protocol](https://modelcontextprotocol.io/) is how Claude, ChatGPT, Cursor, and other agent runtimes call tools. By publishing an MCP server, Maho Storefront lets any MCP-aware client *transact* with the store — search the catalogue, manage a cart, place an order — without scraping HTML.

## Status

| Component | Status |
|---|---|
| `/.well-known/mcp/server-card.json` discovery card | ✅ live (`status: "planned"`) |
| `/mcp` endpoint | 🚧 stub (returns 503 + structured "coming soon") |
| Real MCP server (sibling Worker) | 🚧 in progress — Phase 1 read tools next |

The discovery card is shipped now so:

1. **Discovery tooling finds us.** `isitagentready.com`, Cloudflare's URL Scanner agent-readiness check, and agent runtimes that look for `/.well-known/mcp/` all see a valid card. We're a "known planned MCP server", not a 404.
2. **The shape is locked in.** When the real server boots, its tool inventory matches what we've already advertised. Agents can plan against it now.

## Discovery card

`GET /.well-known/mcp/server-card.json`:

```json
{
  "name": "Pickle Warehouse MCP Server",
  "version": "0.1.0-stub",
  "description": "Headless commerce MCP server for Pickle Warehouse. Will expose tools to search the catalogue, fetch product details, manage a guest cart, and complete checkout. Currently a stub while the real server is built.",
  "status": "planned",
  "endpoint": "https://pickle.mageaustralia.com.au/mcp",
  "transport": "streamable-http",
  "authentication": {
    "type": "none",
    "required_for": ["place_order", "get_customer_orders"],
    "notes": "Guest browsing and cart operations are unauthenticated. Checkout and customer-history tools will accept an OAuth2 access token issued by the storefront. See https://pickle.mageaustralia.com.au/.well-known/oauth-authorization-server"
  },
  "planned_tools": [
    { "name": "search_products", "auth": false },
    { "name": "get_product", "auth": false },
    { "name": "list_categories", "auth": false },
    { "name": "get_category", "auth": false },
    { "name": "create_cart", "auth": false },
    { "name": "add_to_cart", "auth": false },
    { "name": "view_cart", "auth": false },
    { "name": "apply_coupon", "auth": false },
    { "name": "get_shipping_methods", "auth": false },
    { "name": "place_order", "auth": "optional" }
  ],
  "icon": "https://pickle.mageaustralia.com.au/favicon.ico",
  "documentation": "https://pickle.mageaustralia.com.au/api/docs",
  "privacy_policy": "https://pickle.mageaustralia.com.au/privacy-policy"
}
```

When the real server boots, this card stays the same except `status: "planned"` becomes `status: "active"`.

## Planned tool inventory

Matches typical headless shopping flows. Each tool is backed by an existing Maho REST API Platform endpoint, so no backend work is required to implement them.

| Tool | Auth | Description | Backed by |
|---|---|---|---|
| `search_products` | none | Free-text + category + price-range search | `GET /api/rest/v2/products?q=...` |
| `get_product` | none | Full product detail by SKU or url-key | `GET /api/rest/v2/products?urlKey=...` |
| `list_categories` | none | Full category tree (children inlined thanks to the upstream serialization fix) | `GET /api/rest/v2/categories` |
| `get_category` | none | Category detail + first page of products | `fetchCategory` + `fetchCategoryProducts` |
| `create_cart` | none | New guest cart, returns masked ID | `POST /api/rest/v2/guest-carts` |
| `add_to_cart` | none | Add SKU + qty + options | `POST /api/rest/v2/guest-carts/{id}/items` |
| `view_cart` | none | Cart contents + totals | `GET /api/rest/v2/guest-carts/{id}` |
| `apply_coupon` | none | Promo code | `POST /api/rest/v2/guest-carts/{id}/coupon` |
| `get_shipping_methods` | none | Quote shipping for an address | `POST /api/rest/v2/guest-carts/{id}/shipping-methods` |
| `place_order` | optional | Submit order; accepts guest checkout or an OAuth2 access token | `POST /api/rest/v2/guest-carts/{id}/place-order` |

## Architecture: sibling Worker

Two reasonable places to put the MCP server:

| Option | ✅ | ❌ |
|---|---|---|
| **A. Inline in this Worker** — add `/mcp` to the existing storefront Worker | Single deploy, shares KV cache, lowest latency | Mixes streaming MCP traffic with HTML rendering; Workers SSE has a 30s response limit that makes long sessions awkward |
| **B. Sibling Worker (`maho-storefront-mcp`)** | Cleanly isolated, separate deploys, room for MCP-specific deps (`@modelcontextprotocol/sdk`) | Two deploys to manage, slight cross-worker latency |

**Decision: B (sibling Worker).** The storefront bundle is already 2.1 MB (compressed 264 KB). MCP streaming infrastructure doesn't belong in the HTML render path, and Cloudflare's own MCP guidance points toward dedicated Workers.

The sibling Worker will:

- Live on the same root domain (e.g. `pickle.mageaustralia.com.au/mcp` via a Cloudflare route) or a subdomain (`mcp.pickle.mageaustralia.com.au`).
- Share the storefront's KV namespace for read tools (no extra sync needed).
- Hit the backend's REST API directly for write tools (cart, checkout).
- Read the same OAuth tokens the storefront accepts at `/api/auth/*`.

## Roadmap

| Phase | Scope | Effort | Status |
|---|---|---|---|
| **Phase 1** | Read-only tools: `search_products`, `get_product`, `list_categories`, `get_category` | ~2 days | next |
| **Phase 2** | Cart-write tools: `create_cart`, `add_to_cart`, `view_cart`, `apply_coupon`, `get_shipping_methods` | ~2 days | after Phase 1 |
| **Phase 3** | Checkout: `place_order` with guest + Stripe | ~3 days | blocked on payment-UX decision |

Total ≈ 1 week for a usable MVP.

## Open decisions

### Payment UX for `place_order`

The Worker already has Stripe Payment Intents wired. For MCP we can either:

- Return a `client_secret` and let the agent confirm out-of-band (handing the human off to a payment surface).
- Wait for **x402** / Universal Commerce Protocol / Agentic Commerce Protocol to stabilise and use that.

**Current direction:** wait. x402 is moving fast and a one-off bespoke confirmation flow now would be churn. Read-and-cart-only is genuinely useful in the meantime.

### Multi-store

Either a card per origin (each storefront is its own MCP server) or one card with a `store` parameter on every tool. The first is simpler and matches how agents discover via public URL — that's the planned shape.

### Auth on read tools

Never. Mirrors the public web view — anything you can see in a browser without logging in, an agent can see via MCP without authenticating.

## Stub endpoint behaviour

Until the real server ships, `/mcp` returns:

```http
HTTP/2 503 Service Unavailable
Content-Type: application/json
Cache-Control: public, max-age=300
Retry-After: 604800
```

```json
{
  "error": "not_yet_available",
  "message": "This storefront publishes an MCP server card at https://pickle.mageaustralia.com.au/.well-known/mcp/server-card.json but the server itself is still being built. See the card for the planned tool inventory.",
  "server_card": "https://pickle.mageaustralia.com.au/.well-known/mcp/server-card.json"
}
```

The 7-day `Retry-After` is intentional — agents back off (we're publishing a real ETA), and we don't churn from clients hammering a planned endpoint.

## References

- Design doc in the repo: `proposals/agent-readiness-next.md`
- [Model Context Protocol spec](https://modelcontextprotocol.io/)
- [Cloudflare MCP server guide](https://developers.cloudflare.com/agents/model-context-protocol/)
- [Cloudflare's agent-readiness blog post](https://blog.cloudflare.com/agent-readiness/)

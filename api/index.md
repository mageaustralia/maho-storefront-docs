# Worker API

The Maho Storefront Worker exposes several internal API endpoints for data synchronization, cache management, and client-side operations. These are not public APIs - they're used by the admin module, freshness controller, and internal tooling.

## Endpoint Categories

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| [Sync](/api/sync) | `POST /sync`, `POST /sync/:type` | Populate KV from Maho backend |
| [Cache](/api/cache-management) | `POST /cache/update`, `POST /cache/purge`, `POST /cache/delete` | Manage cached data |
| [Freshness](/architecture/freshness) | `POST /freshness` | Background revalidation |
| [Proxy](/api/routes) | `GET /media/*`, `GET /robots.txt`, `GET /sitemap.xml` | Proxy to backend |

## Authentication

Internal endpoints use a shared secret passed in the request body:

```json
{
  "secret": "your-sync-secret"
}
```

The secret is configured in `wrangler.toml` as the `SYNC_SECRET` environment variable.

::: warning
The sync secret is transmitted in the request body, not as a header. Ensure all sync/cache management requests are made over HTTPS.
:::

## Client-Side API

The Stimulus controllers use a client-side API wrapper (`src/js/api.js`) that communicates with the Maho backend through the Worker:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cart` | GET | Get current cart |
| `/api/cart/items` | POST | Add item to cart |
| `/api/cart/items/:id` | PATCH | Update item quantity |
| `/api/cart/items/:id` | DELETE | Remove item from cart |
| `/api/checkout/place-order` | POST | Place order |
| `/api/auth/login` | POST | Customer login |
| `/api/customers` | POST | Create account |
| `/api/search` | GET | Search products |

These endpoints proxy to the Maho REST API with appropriate headers.

## Next Steps

- [Routes](/api/routes) - complete route table
- [Sync](/api/sync) - data synchronization reference
- [Cache Management](/api/cache-management) - cache invalidation endpoints
- [API Client](/api/api-client) - `MahoApiClient` class reference

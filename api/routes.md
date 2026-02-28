# Routes

Complete route table for the Maho Storefront Worker.

## Catalog Routes (Edge Cached)

These routes render server-side HTML and are cached at the Cloudflare edge.

| Route | Method | Description | Edge TTL |
|-------|--------|-------------|----------|
| `/` | GET | Homepage | 30 min |
| `/:slug` | GET | Category, product, CMS page, or blog post | 2-4 hours |
| `/:category/:product` | GET | Product with category context | 4 hours |

### URL Resolution

For `/:slug` routes, the Worker resolves the entity type:

1. Check KV for `{store}:product:{slug}` → Product page
2. Check KV for `{store}:category:{slug}` → Category page
3. Check KV for `{store}:cms:{slug}` → CMS page
4. Check KV for `{store}:blog:{slug}` → Blog post
5. API URL resolver fallback → Fetch + cache entity
6. None found → 404 page

## Dynamic Routes (Never Cached)

User-specific pages that always hit the Worker handler.

| Route | Method | Description |
|-------|--------|-------------|
| `/cart` | GET | Shopping cart |
| `/checkout` | GET | Checkout flow |
| `/account` | GET | Account dashboard |
| `/account/orders` | GET | Order history |
| `/account/addresses` | GET | Address book |
| `/login` | GET | Login page |
| `/register` | GET | Registration page |
| `/search` | GET | Search results |
| `/forgot-password` | GET | Password reset |

## Internal Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/sync` | POST | Secret | Full data sync (all entities) |
| `/sync/config` | POST | Secret | Sync store config only |
| `/sync/categories` | POST | Secret | Sync categories only |
| `/sync/products` | POST | Secret | Sync all products |
| `/sync/cms-pages` | POST | Secret | Sync CMS pages |
| `/sync/blog-posts` | POST | Secret | Sync blog posts |
| `/sync/countries` | POST | Secret | Sync country list |
| `/cache/update` | POST | Secret | Update specific KV entries |
| `/cache/purge` | POST | Secret | Purge edge cache for URLs |
| `/cache/delete` | POST | Secret | Delete KV keys |
| `/freshness` | POST | None | Client freshness check |

## Static Assets

| Route | Method | Cache | Description |
|-------|--------|-------|-------------|
| `/styles.css` | GET | 1 year | UnoCSS bundle |
| `/controllers.js` | GET | 1 year | esbuild JS bundle |
| `/robots.txt` | GET | Proxy | Proxied from backend |
| `/sitemap.xml` | GET | Proxy | Proxied from backend |
| `/media/*` | GET | Proxy | Media files proxied from backend |

## Client-Side API Proxy

These routes proxy requests to the Maho REST API.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cart` | GET | Get current cart |
| `/api/cart/items` | POST | Add item to cart |
| `/api/cart/items/:id` | PATCH | Update cart item |
| `/api/cart/items/:id` | DELETE | Remove cart item |
| `/api/cart/coupon` | POST | Apply coupon code |
| `/api/cart/coupon` | DELETE | Remove coupon |
| `/api/cart/shipping-methods` | POST | Get shipping methods |
| `/api/cart/shipping` | POST | Set shipping method |
| `/api/checkout/place-order` | POST | Place order |
| `/api/auth/login` | POST | Customer login |
| `/api/auth/logout` | POST | Customer logout |
| `/api/customers` | POST | Create account |
| `/api/customers/password-reset` | POST | Request password reset |
| `/api/search` | GET | Search products |
| `/api/reviews` | POST | Submit product review |

Source: `src/index.tsx`

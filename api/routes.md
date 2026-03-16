# Routes

Complete route table for the Maho Storefront Worker.

## Catalog Routes (Edge Cached)

Server-side rendered HTML pages, cached at the Cloudflare edge. After deploy, the cache is purged and prewarmed automatically.

| Route | Method | Description | Edge TTL |
|-------|--------|-------------|----------|
| `/` | GET | Homepage | 7 days |
| `/blog` | GET | Blog listing | 7 days |
| `/blog/category/:slug` | GET | Blog category | 7 days |
| `/blog/:slug` | GET | Blog post | 7 days |
| `/page/:identifier` | GET | CMS page by identifier | 7 days |
| `/:parent/:child` | GET | Subcategory (e.g. `/women/dresses`) | 7 days |
| `/:slug` | GET | Category, product, CMS page, or blog post | 7 days |

Browser caching: `max-age=60, stale-while-revalidate=86400` -- browser shows cached page instantly and revalidates in the background. The freshness controller patches any stale content in-place.

### URL Resolution

For `/:slug` routes, the Worker resolves the entity type:

1. Check KV for `{store}:category:{slug}` -- Category page
2. Check KV for `{store}:product:{slug}` -- Product page
3. Check KV for `{store}:cms:{slug}` -- CMS page
4. Check KV for `{store}:blog:{slug}` -- Blog post
5. API URL resolver fallback -- Fetch, cache in KV, and render
6. None found -- 404 page

## Dynamic Routes (Never Cached)

User-specific pages that always hit the Worker handler.

| Route | Method | Description |
|-------|--------|-------------|
| `/cart` | GET | Shopping cart |
| `/checkout` | GET | Checkout flow |
| `/order/success` | GET | Order success page |
| `/account` | GET | Account dashboard |
| `/login` | GET | Login page |
| `/register` | GET | Registration page |
| `/forgot-password` | GET | Password reset request |
| `/reset-password` | GET | Password reset form |
| `/search` | GET | Search results |
| `/contacts` | GET | Contact form |

## Client-Side API Proxy

All `/api/*` requests are proxied to the Maho backend API. The Worker adds store code headers and CORS headers. If `MAHO_API_BASIC_AUTH` is set (for dev/staging sites behind nginx basic auth), it's forwarded too -- this is not needed in production where the API is publicly accessible. The routes below are the actual Maho API Platform endpoints that the storefront JS controllers call.

### Cart (Guest)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/guest-carts` | POST | Create a guest cart |
| `/api/guest-carts/{maskedId}` | GET | Get cart with items and prices |
| `/api/guest-carts/{maskedId}/items` | POST | Add item to cart |
| `/api/guest-carts/{maskedId}/items/{itemId}` | PUT | Update item qty |
| `/api/guest-carts/{maskedId}/items/{itemId}` | DELETE | Remove item |
| `/api/guest-carts/{maskedId}/coupon` | PUT | Apply coupon code |
| `/api/guest-carts/{maskedId}/coupon` | DELETE | Remove coupon |
| `/api/guest-carts/{maskedId}/giftcard` | POST | Apply gift card |
| `/api/guest-carts/{maskedId}/giftcard/{code}` | DELETE | Remove gift card |
| `/api/guest-carts/{maskedId}/estimate-shipping` | POST | Get shipping rates for address |
| `/api/guest-carts/{maskedId}/shipping-information` | POST | Set shipping method + address |
| `/api/guest-carts/{maskedId}/payment-methods` | GET | Get available payment methods |

### Orders

| Route | Method | Description |
|-------|--------|-------------|
| `/api/orders` | POST | Place order |
| `/api/orders/{incrementId}/verify` | GET | Verify order for success page |

### Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/token` | POST | Customer login (email + password) |
| `/api/auth/forgot-password` | POST | Request password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/refresh` | POST | Refresh JWT token |

### Customer Account

| Route | Method | Description |
|-------|--------|-------------|
| `/api/customers` | POST | Create new account |
| `/api/customers/me` | GET | Get current customer profile |
| `/api/customers/me` | PUT | Update customer profile |
| `/api/customers/me/password` | POST | Change password |
| `/api/customers/me/orders` | GET | Order history |
| `/api/customers/me/addresses` | GET, POST | List / create addresses |
| `/api/customers/me/addresses/{id}` | GET, PUT, DELETE | Manage address |
| `/api/customers/me/wishlist` | GET, POST | Wishlist items |
| `/api/customers/me/wishlist/sync` | POST | Sync wishlist product IDs |
| `/api/customers/me/wishlist/{id}` | DELETE | Remove wishlist item |
| `/api/customers/me/reviews` | GET | Customer's reviews |

### Catalog (Read)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/products` | GET | Product listing (with filters) |
| `/api/products/{id}` | GET | Product detail |
| `/api/categories` | GET | Category tree |
| `/api/categories/{id}` | GET | Single category |
| `/api/layered-filters` | GET | Available filter options for category |
| `/api/products/{id}/reviews` | GET, POST | Product reviews |

### Content

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cms-pages` | GET | CMS pages |
| `/api/cms-pages/{id}` | GET | Single CMS page |
| `/api/cms-blocks` | GET | CMS blocks |
| `/api/cms-blocks/{id}` | GET | Single CMS block |
| `/api/blog-posts` | GET | Blog posts |
| `/api/blog-posts/{id}` | GET | Single blog post |
| `/api/blog-categories` | GET | Blog categories |

### Gift Cards

| Route | Method | Description |
|-------|--------|-------------|
| `/api/guest-carts/{maskedId}/giftcard` | POST | Apply gift card to cart |
| `/api/guest-carts/{maskedId}/giftcard/{code}` | DELETE | Remove gift card from cart |

### Other

| Route | Method | Description |
|-------|--------|-------------|
| `/api/store-config` | GET | Store configuration |
| `/api/countries` | GET | Countries and regions |
| `/api/url-resolver` | GET | Resolve URL to entity type |
| `/api/newsletter/subscribe` | POST | Subscribe to newsletter |
| `/api/newsletter/unsubscribe` | POST | Unsubscribe from newsletter |

### Extension Endpoints

These are provided by optional Maho modules, not the core. They appear when the corresponding module is installed and configured.

| Route | Method | Module | Description |
|-------|--------|--------|-------------|
| `/api/customers/social-auth` | POST | MageAustralia_SocialLogin | Social login (Google/Apple/Facebook) |
| `/api/payments/stripe/config` | GET | MageAustralia_Stripe | Stripe publishable key |
| `/api/payments/stripe/payment-intents` | POST | MageAustralia_Stripe | Create Stripe PaymentIntent |

## Storefront-Only Endpoints

These are handled by the Worker directly, not proxied to the backend.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cart-recommendations` | GET | Cross-sell product recommendations for cart |
| `/api/payments/stripe/payment-intents` | POST | Creates Stripe PaymentIntent directly (requires MageAustralia_Stripe) |

## Embed Widget

| Route | Method | Description |
|-------|--------|-------------|
| `/embed.js` | GET | Embeddable product widget script |
| `/embed/products` | GET | Product data API for embed widgets |
| `/embed-demo` | GET | Embed widget demo page |

## Internal / Admin

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/sync` | POST | Bearer | Full data sync (all entities) |
| `/sync/:type` | POST | Bearer | Partial sync (config, categories, products, etc.) |
| `/cache/warm-urls` | GET | Bearer | List all URLs for cache prewarming |
| `/cache/update` | POST | Bearer | Update specific KV entries |
| `/cache/purge` | POST | Bearer | Purge edge cache for URLs |
| `/cache/delete` | POST | Bearer | Delete KV keys |
| `/cache/keys` | GET | Bearer | List KV keys by prefix |
| `/freshness/should-check` | GET | None | Edge-throttled freshness check gate |
| `/freshness` | POST | None | Client reports stale data, updates KV |
| `/pulse` | GET | None | Data version hash (for cache busting) |
| `/dev/login` | POST | Password | Dev password gate login |
| `/dev/logout` | GET | Session | Dev session logout |
| `/dev/preview` | POST | Session | Toggle dev preview mode |
| `/dev/config` | POST | Bearer | Set password gate / storefront password |
| `/dev/tokens` | GET, POST, DELETE | Bearer | Manage dev access tokens |
| `/admin` | GET | None | Redirect to Maho admin panel |

## Static Assets

| Route | Method | Cache | Description |
|-------|--------|-------|-------------|
| `/styles.css` | GET | 1 year (immutable) | UnoCSS bundle (versioned via `?v=`) |
| `/controllers.js` | GET | 1 year (immutable) | esbuild JS bundle (versioned via `?v=`) |
| `/plugins/:name` | GET | 24 hours | Payment plugin scripts |
| `/media/*` | GET | 1 year (immutable) | Product/media images proxied from backend |
| `/robots.txt` | GET | 1 hour | Proxied from backend |
| `/sitemap.xml` | GET | 1 hour | Proxied from backend |

Source: `src/index.tsx`

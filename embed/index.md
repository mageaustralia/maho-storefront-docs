# Embeddable Widget

Sell your products on **any website** — a blog, a landing page, a partner's
site, a CMS you don't control — with one `<script>` tag. The embeddable widget
turns plain `<div>` placeholders into interactive product cards with a full
inline checkout (cart, shipping, payment), all served from your Maho Storefront.

No iframe, no platform lock-in, no build step on the host site. The widget is a
single self-contained IIFE bundle (`/embed.js`, ~50 KB) that registers a few
[custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
and talks back to your store over CORS-enabled JSON endpoints.

::: tip Live demo
Every storefront serves a demo at **`/embed-demo`** (e.g.
`https://your-store.com/embed-demo`) — real product cards plus the copy-paste
snippet, running against that store.
:::

## Quick start

Drop two things on the host page:

```html
<!-- 1. Load the widget once, anywhere on the page -->
<script src="https://your-store.com/embed.js" data-store="https://your-store.com"></script>

<!-- 2. Place a card wherever you want a product, by SKU -->
<div data-maho-product="SKU-001"></div>
<div data-maho-product="SKU-002"></div>
```

That's the whole integration. On load the widget scans the DOM for
`[data-maho-product]` placeholders, fetches those products in one batched
request, and replaces each placeholder with a `<maho-product-card>`. A floating
cart badge is added to the page; clicking a card opens a lightbox with options,
quantity, and **Add to cart**; clicking the badge opens inline checkout.

## Script attributes

Configure the widget with `data-*` attributes on the `<script>` tag:

| Attribute | Required | Default | Description |
|---|---|---|---|
| `data-store` | **yes** | — | Your store origin, e.g. `https://your-store.com`. Falls back to the script's own origin if omitted. |
| `data-store-code` | no | — | Maho store-view code for [multi-store](/architecture/multi-store) setups (selects currency, prices, language). |
| `data-currency` | no | `USD` | Currency code used to format prices. |
| `data-accent` | no | `#2563eb` | Accent colour (hex) for buttons, badges, and highlights. |
| `data-country` | no | `US` | Default country for the checkout address form. |
| `data-google-maps-key` | no | — | Google Maps key for address autocomplete in checkout. If omitted, the store-configured key (synced from the backend) is used. |

```html
<script
  src="https://your-store.com/embed.js"
  data-store="https://your-store.com"
  data-store-code="us"
  data-currency="USD"
  data-accent="#6366f1"
  data-country="US"></script>
```

## How it works

```
host page                        your Maho Storefront (Cloudflare Worker)
─────────                        ────────────────────────────────────────
<script src=".../embed.js">  ──▶ GET /embed.js          (IIFE bundle, cached 1h)
scan [data-maho-product]
batch the SKUs              ──▶ GET /embed/products?skus[]=A&skus[]=B
                                   └─ products + { stripePublishableKey,
                                      googleMapsKey, detectedCountry,
                                      currency, defaultCountry }
replace <div> → <maho-product-card>
click card  → lightbox (options, qty, add to cart)
click badge → inline checkout ─▶ cart / shipping / payment endpoints
```

- **Custom elements** registered by the bundle: `<maho-product-card>`,
  `<maho-lightbox>` (shared, appended to `<body>`), and `<maho-cart-badge>`
  (floating). Each uses Shadow DOM, so the widget's styles never leak into — or
  get clobbered by — the host page's CSS.
- **Batching** — all placeholder SKUs are de-duplicated and fetched in a single
  `/embed/products` call (max 20 per request). A SKU that doesn't resolve simply
  hides its placeholder.
- **Country detection** — the checkout form pre-selects the visitor's country
  from the edge (`request.cf.country`), falling back to `data-country`.

## Programmatic API

The widget exposes `window.MahoEmbed` for dynamic pages (SPAs, infinite scroll,
"quick view" buttons):

```js
// Render a card into a container you create at runtime
MahoEmbed.addProduct('SKU-001', document.getElementById('slot'));

// Open the product lightbox directly
const [product] = await MahoEmbed.api.fetchProducts(['SKU-001']);
MahoEmbed.openProduct(product);

// Open the checkout flow
MahoEmbed.openCheckout();

// Low-level handles
MahoEmbed.api    // EmbedApi — fetchProducts, cart, shipping, payment, placeOrder
MahoEmbed.cart   // CartManager — server-backed cart, badge count
```

## Data endpoints

The widget is backed by three public, CORS-enabled routes on the storefront
(see the [API routes](/api/routes#embed-widget) reference):

| Route | Method | Purpose |
|---|---|---|
| `/embed.js` | GET | The widget bundle (IIFE). `Cache-Control: public, max-age=3600`, `Access-Control-Allow-Origin: *`. |
| `/embed/products` | GET | Batched product data. SKUs via repeated `?skus[]=` params (max 20). Also returns store config the widget needs (Stripe publishable key, Google Maps key, detected/default country, currency). Cached 5 min. |
| `/embed-demo` | GET | Self-contained demo + copy-paste snippet for that store. |

Example:

```
GET /embed/products?skus[]=SKU-001&skus[]=SKU-002
```

```json
{
  "products": [
    {
      "sku": "SKU-001",
      "name": "Example Product",
      "type": "configurable",
      "price": 99.0,
      "finalPrice": 79.0,
      "imageUrl": "https://your-store.com/media/.../image.jpg",
      "stockStatus": "in_stock",
      "configurableOptions": [ /* … */ ],
      "variants": [ /* … */ ]
    }
  ],
  "config": {
    "stripePublishableKey": "pk_live_…",
    "googleMapsKey": null,
    "detectedCountry": "AU",
    "currency": "USD",
    "defaultCountry": "US"
  }
}
```

## Checkout & payments

The lightbox runs a complete checkout against the store's cart/shipping/payment
APIs — create cart, add items, fetch shipping methods, fetch payment methods,
and place the order — without leaving the host page.

Card payments use Stripe: the widget reads the publishable key from the
`/embed/products` config response and creates a PaymentIntent via the store. The
backend needs the **MageAustralia_Stripe** module installed and keys
[synced](/api/sync) into KV.

::: warning Payment adapter
The widget currently calls Stripe directly via its own `PaymentAdapter`
interface, separate from the storefront's [plugin system](/architecture/plugins).
Folding embed payments into the plugin surface is planned work — see the
plugins architecture page.
:::

## Theming

Set `data-accent` for the primary colour. Because each element renders in Shadow
DOM, the host page's stylesheet can't break the widget and vice-versa. Cards
adapt to their container width (responsive grid friendly).

## Security notes

- The bundle and product API send `Access-Control-Allow-Origin: *` by design —
  they're meant to be embedded on third-party origins.
- Only public product data is exposed. Cart and order operations are scoped to a
  per-visitor cart created on the server.
- No secrets ship in the bundle. The Stripe **publishable** key (safe to expose)
  arrives in the config response; secret keys never leave the backend.

## Limitations

- Up to **20 SKUs** per `/embed/products` request (placeholders beyond that are
  fetched in additional batches as they're discovered).
- Embed payments aren't yet on the plugin system (see the note above).
- Prices/currency follow the resolved store-view; cross-store-view URL nuances
  don't apply since the widget addresses products by SKU.

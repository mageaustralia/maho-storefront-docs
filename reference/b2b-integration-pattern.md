# B2B Integration Pattern

How a server-side Maho B2B module integrates with the headless storefront.
Written once, followed by every module so the storefront doesn't need to
know about each module by name.

The pattern generalises the plugin architecture already used for **payments**
(see `src/plugins/stripe/`, `src/plugins/braintree/`). For payments the
question is *"is Stripe installed on the backend, and what's its publishable
key?"*. For B2B the question is *"is B2B Access installed, and what does it
say about the current caller and each product?"*. Same shape.

## Contract

A B2B module ships four things.

### 1. A discovery endpoint

`GET /api/rest/v2/b2b/{module}/config` returns the effective admin config
(after inheritance and store-scope resolution) as a JSON object. If the
module isn't installed the endpoint 404s. That's how the storefront finds
out the module exists.

Example response for `b2b/access/config`:

```json
{
  "enabled": true,
  "hidePrice": true,
  "blockPurchase": true,
  "requireLogin": false,
  "loginMessage": "Log in to see pricing.",
  "hiddenPriceMessage": "Log in to see pricing.",
  "activationMatrix": {
    "byCustomerGroup": true,
    "customerGroups": [0],
    "byCategory": false,
    "categoryIds": []
  }
}
```

Only the surface the *storefront* needs. Admin-only details (email templates,
internal IDs) stay off the wire.

### 2. Per-request annotations on data DTOs

The catalog API's product DTO already ships fields like `sku`, `price`,
`finalPrice`. A B2B module adds a namespaced flag block that reflects its
decision *for the current caller*:

```typescript
interface Product {
  // ...existing fields...
  gateFlags?: {
    requiresLogin: boolean;   // redirect guests off this page
    hidePrice: boolean;       // omit price → storefront shows a login prompt
    canCheckout: boolean;     // suppress add-to-cart / block cart mutations
  };
}
```

**When `hidePrice: true`, the API also omits `price` / `finalPrice` /
`specialPrice` / `minimalPrice` from the DTO before response.** That's the
enforcement — the storefront can't render what the API doesn't ship. A
crafted request can't get the price back; the module refuses at the API
layer, not the JS layer.

The module wires this by observing `api_product_dto_build`
(dispatched by `Mage/Catalog/Api/ProductProvider.php` on both listing
and detail hydration). No core patch required.

Future modules add their own flag blocks under their own namespace:
`myPrice` for per-company pricing, `orderApprovalRequired` for order
approval, `quoteAvailable` for RFQ, etc.

### 3. Cache-key changes

Once catalog responses vary by caller, the API sends:

```
Vary: Authorization
Cache-Control: private, max-age=60
```

Not one CDN response for everyone, but N responses (one per customer
group + one for guests). Still cacheable, just wider. Storefront-side KV
cache splits the same way.

### 4. (Optional) A client-side script

If the module needs interactivity on the storefront (e.g. re-fetching
product data after login so the price appears without a full reload),
it ships a small script at `/plugins/{module}.js`.

Not every B2B module needs one; static gates are handled entirely by the
API annotations + SSR-time template checks. Order approval, quotes, and
on-account will need one because they mutate cart / checkout state.

## Storefront wiring

When a module ships those four things, the storefront needs three tiny
additions.

### 1. `src/plugins/{module}/sync.ts`

Mirror `src/plugins/stripe/sync.ts`. Probe the discovery endpoint. If
`200`, add a plugin manifest to the store config's `extensions.b2bPlugins`
array:

```ts
config.extensions.b2bPlugins.push({
  code: 'b2b-access',
  script: '/plugins/b2b-access.js',  // omit if the module has no client script
  config: {
    hiddenPriceMessage: cfg.hiddenPriceMessage,
    loginMessage: cfg.loginMessage,
  },
});
```

The sync is idempotent and safe — 404 means the plugin doesn't register,
so a store without the module behaves as if the plugin isn't there.

### 2. Template checks

The layout templates (`Product.tsx`, `LayoutMasonry.tsx`,
`InfoPanelCompact.tsx`, `ProductCard.tsx`, category grids, etc.) read
`product.gateFlags` at render time:

```tsx
{product.gateFlags?.hidePrice
  ? <a class="text-sm underline" href="/login">Log in to see pricing</a>
  : <span class="price">{formatPrice(product.finalPrice, currency)}</span>}
```

Same for the add-to-cart button (`!gateFlags.canCheckout` → suppress) and
category-level login walls (`gateFlags.requiresLogin` → redirect).

Because the API strips `price` when `hidePrice` is true, the check is
belt-and-braces — but writing it explicitly makes the storefront author's
intent legible.

### 3. `public/plugins/{module}.js` (if the module ships one)

Mounted at runtime from the plugin registry. Does whatever the module
needs — for B2B Access, refresh the current product data after a
successful login so prices appear without a full reload.

## What DOESN'T change

- **The storefront core has no knowledge of any individual B2B module.**
  Adding a new module never touches `src/index.tsx`, `src/templates/*`,
  or `src/api-client.ts` (beyond the type declaration of `gateFlags` on
  Product). One new file per module in `src/plugins/`.
- **Enforcement stays on the server.** The storefront hides the price
  because the API omits it, not because of a client-side rule. A
  compromised or misconfigured storefront cannot leak protected data.
- **CDN caching stays viable.** The `Vary: Authorization` widening splits
  responses per-group, not per-user; realistic group counts are small
  (guest + 3–5 B2B tiers).

## What changes in core (once, then reusable)

- The `Product` DTO grows an optional `gateFlags` field — additive, no
  breakage for callers that don't consume it.
- The catalog API resource declares `Vary: Authorization` on its response
  headers.

That's the whole core surface. Every module after B2B Access reuses it.

## Applying the pattern to a new module

Recipe. Take per-company pricing as the example.

1. **Data-model side:** the module already has its own price-list tables.
2. **DTO annotation:** add a `myPrice` field to the Product DTO via
   `api_product_dto_build`. Populate from the module's resolver keyed on
   the caller's company (or `null` if no per-company price applies).
3. **Discovery endpoint:** `GET /api/rest/v2/b2b/pricing/config` returns
   whether the module is enabled, and any UX config (rounding, currency
   display preferences).
4. **Storefront plugin:** `src/plugins/company-pricing/sync.ts` probes the
   endpoint, registers a plugin entry.
5. **Templates:** where the price renders, prefer `product.myPrice`
   over `product.finalPrice` when present. That's a one-line change.

Total surface: one new module + one new file in `src/plugins/`. No changes
to templates unless the module needs new UI conventions.

## Reference implementation

**B2B Access** is the reference. When the shape below lands (see the
[B2B Suite reference](./b2b-suite)), every future B2B module can copy its
directory structure and swap the flag names.

- Backend: `mageaustralia/maho-module-b2b-access` extends the Product DTO,
  ships the `/b2b/access/config` endpoint, dispatches the observer.
- Storefront: `src/plugins/b2b-access/sync.ts` + `public/plugins/b2b-access.js`.
- Templates check `product.gateFlags` inline.

The docs page for B2B Suite tracks the current implementation status.

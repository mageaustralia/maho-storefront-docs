# Analytics

Maho Storefront includes a GA4-compatible analytics layer that fires e-commerce events into `window.dataLayer`. Because the storefront runs on Cloudflare Workers, page views never reach the Maho backend — so traditional server-side tracking (like `Mage_Log` visitor logs) doesn't apply.

Instead, analytics are handled entirely on the client side using **Cloudflare Zaraz** (recommended) or a manually injected GTM/gtag script.

## Built-in Events

The storefront pushes the following GA4 e-commerce events automatically:

| Event | Trigger | Source |
|-------|---------|--------|
| `page_view` | Every Turbo navigation | `app.js` |
| `view_item` | Product page load | `product-controller.js` |
| `view_item_list` | Category page load | `category-controller.js` |
| `add_to_cart` | Add to cart action | `product-controller.js` |
| `remove_from_cart` | Remove from cart | `cart-controller.js` |
| `begin_checkout` | Checkout page load | `checkout-controller.js` |
| `purchase` | Order success page | `checkout-controller.js` |

All events follow the [GA4 e-commerce schema](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) and include product data (SKU, name, price, quantity).

Events are pushed to `window.dataLayer` — the standard interface consumed by Google Tag Manager, gtag.js, and Cloudflare Zaraz.

## Cloudflare Zaraz (Recommended)

[Cloudflare Zaraz](https://developers.cloudflare.com/zaraz/) is a built-in analytics manager included with all Cloudflare plans. It runs third-party scripts in a web worker at the edge, so it adds **zero client-side JavaScript** and doesn't block rendering.

Zaraz automatically reads `window.dataLayer` events, making it a drop-in listener for the storefront's existing analytics layer.

### Setup

1. **Open Zaraz** in the Cloudflare dashboard:
   - Go to your zone (e.g. `mageaustralia.com.au`)
   - Navigate to **Zaraz** > **Tools**

2. **Add Google Analytics 4**:
   - Click **Add new tool** > **Google Analytics 4**
   - Enter your GA4 Measurement ID (e.g. `G-XXXXXXXXXX`)
   - Under **Triggers**, ensure it fires on **Pageview**

3. **Map e-commerce events**:
   - In the GA4 tool config, add triggers for each e-commerce event:
     - `add_to_cart`, `view_item`, `view_item_list`, `begin_checkout`, `purchase`
   - Zaraz reads the `ecommerce` object from the dataLayer automatically
   - Map the event properties (items, value, currency, transaction_id) to GA4 parameters

4. **Optional — Add other tools**:
   - **Meta Pixel** — Add with your Pixel ID, map `purchase` event for conversion tracking
   - **Google Ads** — Add conversion tracking for purchases
   - **Google Tag Manager** — If you prefer GTM over direct GA4, add your container ID

### Consent Management

Zaraz includes built-in consent management:
- Configure in **Zaraz** > **Consent**
- Tools can be categorized (Analytics, Marketing, Necessary)
- The consent banner is injected automatically — no code changes needed

### Advantages Over GTM/gtag

- **No JS injected**: Scripts run in a Cloudflare worker, not in the browser
- **Faster pages**: No render-blocking third-party scripts
- **Built-in consent**: GDPR/privacy compliance without extra plugins
- **Edge-managed**: Configuration changes are instant, no code deploys needed
- **Free**: Included with all Cloudflare plans

## Alternative: Google Tag Manager

If you prefer GTM over Zaraz, inject the GTM container script in your store's theme or Layout:

1. **Configure in Maho Admin**:
   - Go to **System** > **Configuration** > **Google API** > **Google Tag Manager**
   - Enable and enter your GTM Container ID (e.g. `GTM-XXXXXXX`)

2. **Expose via Store Config API**:
   The storefront syncs the GTM container ID from the Maho API during `/sync`. Add it to your store config if the API exposes it.

3. **Inject in Layout.tsx**:
   The GTM snippet goes in the `<head>` of `src/templates/Layout.tsx`:

   ```tsx
   {config.gtmContainerId && (
     <script dangerouslySetInnerHTML={{ __html: `
       (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
       new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
       j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
       'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
       })(window,document,'script','dataLayer','${config.gtmContainerId}');
     `}} />
   )}
   ```

4. **Configure GTM**:
   - In the GTM dashboard, add a **GA4 Configuration** tag with your Measurement ID
   - Add e-commerce event triggers that read from the dataLayer

## Alternative: Direct gtag.js

For a simpler setup without GTM:

```tsx
{config.ga4MeasurementId && (
  <>
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementId}`} />
    <script dangerouslySetInnerHTML={{ __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${config.ga4MeasurementId}');
    `}} />
  </>
)}
```

This automatically picks up all `dataLayer.push()` events from the storefront's analytics module.

## Custom Events

You can push custom events from any Stimulus controller or inline script:

```js
// From a Stimulus controller
import { analytics } from '../analytics.js';
analytics.addToCart({ sku: 'ABC-123', name: 'Product', price: 29.95 }, 1);

// From inline JavaScript
window.mahoAnalytics.addToCart({ sku: 'ABC-123', name: 'Product', price: 29.95 }, 1);

// Or push directly to dataLayer
window.dataLayer.push({ event: 'custom_event', custom_param: 'value' });
```

## No Server-Side Tracking

Because the storefront serves pages from Cloudflare Workers (edge-cached HTML), page views never reach the Maho PHP backend. This means:

- **`Mage_Log` visitor tracking** does not fire for storefront visitors
- **Maho's built-in GA block** (`Mage_GoogleAnalytics`) is not rendered
- All analytics must be handled client-side via the dataLayer

This is actually a performance advantage — disabling `Mage_Log` removes unnecessary database writes on the backend, which improves API response times (especially important for SQLite-based deployments).

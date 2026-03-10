# Analytics

Maho Storefront includes a GA4-compatible analytics layer that fires e-commerce events into `window.dataLayer`. Because the storefront runs on Cloudflare Workers, page views never reach the Maho backend — so traditional server-side tracking (like `Mage_Log` visitor logs) doesn't apply.

Instead, analytics are handled entirely on the client side using **Cloudflare Zaraz** (recommended) or a manually injected GTM/gtag script.

## Built-in Events

The storefront pushes the following GA4 e-commerce events automatically:

| Event | Trigger | Source | Data |
|-------|---------|--------|------|
| `page_view` | Every Turbo navigation | `app.js` | URL, title |
| `search` | Site search submitted | `search-controller.js` | search_term |
| `view_item` | Product page load | `product-controller.js` | SKU, name, price, currency |
| `view_item_list` | Category page load | `category-filter-controller.js` | Up to 20 products, list name |
| `add_to_cart` | Add to cart action | `product-controller.js` | SKU, name, price, qty, currency |
| `remove_from_cart` | Remove from cart | `cart-controller.js`, `cart-drawer-controller.js` | SKU, name, price, qty |
| `begin_checkout` | Checkout page load | `checkout-controller.js` | Cart items, grand total |
| `add_shipping_info` | Continue to payment step | `checkout-controller.js` | Cart items, total, shipping method |
| `add_payment_info` | Payment method selected | `checkout-controller.js` | Cart items, total, payment method |
| `purchase` | Order success page verified | `order-success-controller.js` | Order ID, items, total, tax, shipping, currency |

All events follow the [GA4 e-commerce schema](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) and include product data (SKU, name, price, quantity) where applicable.

Events are pushed to `window.dataLayer` — the standard interface consumed by Google Tag Manager, gtag.js, and Cloudflare Zaraz.

## Checkout Funnel

The storefront tracks the complete checkout flow, which maps to GA4's **Checkout journey** report (Reports > Monetization > Checkout journey):

```
begin_checkout → add_shipping_info → add_payment_info → purchase
```

| Step | GA4 Event | Fires when | Data included |
|------|-----------|------------|---------------|
| 1. Start checkout | `begin_checkout` | Checkout page loads with items | Cart items, grand total |
| 2. Shipping selected | `add_shipping_info` | User clicks "Continue to Payment" | Cart items, total, `shipping_tier` (e.g. `flatrate_flatrate`) |
| 3. Payment selected | `add_payment_info` | User selects a payment method | Cart items, total, `payment_type` (e.g. `stripe_card`) |
| 4. Order placed | `purchase` | Order verified on success page | Order ID, items, total, tax, shipping, currency |

This gives you drop-off analysis between each step -- e.g., how many users start checkout but abandon before selecting shipping, or how many select payment but don't complete the order.

::: tip
The `purchase` event fires on the success page after the order is verified by the backend (not on the "Place Order" click). This ensures only confirmed orders are tracked, including redirect-based payments like PayPal and Klarna where the user leaves the site and returns.
:::

## Cloudflare Zaraz (Recommended)

[Cloudflare Zaraz](https://developers.cloudflare.com/zaraz/) is a built-in analytics manager included with all Cloudflare plans. It runs third-party scripts in a web worker at the edge, so it adds **zero client-side JavaScript** and doesn't block rendering.

Zaraz automatically reads `window.dataLayer` events, making it a drop-in listener for the storefront's existing analytics layer.

### Setup

#### Step 1: Add GA4 Tool

1. Open the Cloudflare dashboard for your zone (e.g. `mageaustralia.com.au`)
2. Go to **Zaraz** > **Tools** > **Add new tool**
3. Select **Google Analytics 4**
4. Enter your GA4 Measurement ID (e.g. `G-DB59VKFGTM`)
5. The default **Pageview** trigger is created automatically -- this handles `page_view` events

#### Step 2: Create E-commerce Triggers

For each e-commerce event, you need a **trigger** and an **action**.

First, create the triggers. Go to **Zaraz** > **Triggers** > **Create trigger** for each:

| Trigger name | Rule type | Variable | Operator | Value |
|---|---|---|---|---|
| `E-commerce: search` | Match rule | `{{ client.__zarazTrack }}` | Equals | `search` |
| `E-commerce: view_item` | Match rule | `{{ client.__zarazTrack }}` | Equals | `view_item` |
| `E-commerce: view_item_list` | Match rule | `{{ client.__zarazTrack }}` | Equals | `view_item_list` |
| `E-commerce: add_to_cart` | Match rule | `{{ client.__zarazTrack }}` | Equals | `add_to_cart` |
| `E-commerce: remove_from_cart` | Match rule | `{{ client.__zarazTrack }}` | Equals | `remove_from_cart` |
| `E-commerce: begin_checkout` | Match rule | `{{ client.__zarazTrack }}` | Equals | `begin_checkout` |
| `E-commerce: add_shipping_info` | Match rule | `{{ client.__zarazTrack }}` | Equals | `add_shipping_info` |
| `E-commerce: add_payment_info` | Match rule | `{{ client.__zarazTrack }}` | Equals | `add_payment_info` |
| `E-commerce: purchase` | Match rule | `{{ client.__zarazTrack }}` | Equals | `purchase` |

The `{{ client.__zarazTrack }}` variable matches the `event` property from `window.dataLayer.push({ event: 'purchase', ... })`.

#### Step 3: Create GA4 Actions

Go to **Zaraz** > **Tools** > click your **GA4 tool** > **Add action** for each event:

| Action name | Event name | Firing trigger |
|---|---|---|
| Search | `search` | E-commerce: search |
| View Item | `view_item` | E-commerce: view_item |
| View Item List | `view_item_list` | E-commerce: view_item_list |
| Add to Cart | `add_to_cart` | E-commerce: add_to_cart |
| Remove from Cart | `remove_from_cart` | E-commerce: remove_from_cart |
| Begin Checkout | `begin_checkout` | E-commerce: begin_checkout |
| Add Shipping Info | `add_shipping_info` | E-commerce: add_shipping_info |
| Add Payment Info | `add_payment_info` | E-commerce: add_payment_info |
| Purchase | `purchase` | E-commerce: purchase |

For each action, set the **Event Name** to exactly match the GA4 event name (e.g. `purchase`). Zaraz automatically forwards the `ecommerce` object from the dataLayer, including `items`, `value`, `currency`, `transaction_id`, `shipping_tier`, and `payment_type`.

::: tip
You do not need to manually map individual event parameters. Zaraz reads the full `ecommerce` object from the dataLayer and sends it to GA4 in the correct format.
:::

#### Step 4: Verify in GA4

1. Go to GA4 > **Reports** > **Realtime**
2. Browse the storefront -- you should see events appearing within seconds
3. Check **Monetization** > **Ecommerce purchases** for order data (may take 24-48 hours for historical reports)
4. Check **Monetization** > **Checkout journey** for the checkout funnel drop-off analysis

#### Step 5 (Optional): Mark Purchase as Key Event

In GA4 > **Admin** > **Key Events** > **New Key Event** > enter `purchase`. This marks purchases as conversions, which enables conversion reporting and can be linked to Google Ads.

#### Optional: Add Other Tools

Zaraz supports additional tools that read the same dataLayer events:
- **Meta Pixel** -- Add with your Pixel ID, map `purchase` event for conversion tracking
- **Google Ads** -- Add conversion tracking with the `purchase` trigger
- **Google Tag Manager** -- If you prefer GTM for complex tag management

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

# Payment Method Extensions

The storefront uses a **payment adapter pattern** - each payment gateway has its own adapter, and the checkout controller discovers them automatically. You never edit the checkout controller to add a payment method.

There are two ways to add a payment adapter:

| Approach | When to use | Requires rebuild? |
|----------|------------|-------------------|
| **Bundled** | Core adapters shipped with the storefront | Yes |
| **Standalone plugin** | Third-party or store-specific gateways | No |

## Architecture

```
Checkout Controller (core - never edited for payments)
        |
        v
  getAdapter(methodCode)  <-- payment-methods/index.js
        |
        v
  BraintreeAdapter (bundled) / StripeAdapter (plugin) / etc.
        |
        |-- init(container)   -> Loads SDK, renders fields
        |-- tokenize()        -> Returns { nonce, deviceData, ... }
        '-- destroy()         -> Cleans up
```

Bundled adapters are imported in `src/js/payment-methods/index.js`. Standalone plugins register at runtime via `window.MahoStorefront.registerPaymentAdapter()`.

## The Adapter Interface

```js
class BasePaymentAdapter {
  match(methodCode) -> boolean    // Does this adapter handle this code?
  init(container, context) -> void // Render UI, load SDK
  tokenize() -> object|null       // Pre-submit: return payment data
  destroy() -> void               // Cleanup on unmount
}
```

| Method | When Called | What To Do |
|--------|-----------|------------|
| `match()` | After fetching payment methods | Return `true` if your adapter handles this method code |
| `init()` | User selects your method | Load SDK, render fields into `container` |
| `tokenize()` | User clicks "Place Order" | Get nonce/token, return as object |
| `destroy()` | User selects different method | Tear down SDK, clear container |

The `init()` method receives a `context` object with `{ currency, api, formatPrice }`.

## Approach 1: Bundled Adapter

For adapters shipped as part of the storefront core.

### Step 1: Create the Adapter

Create `src/js/payment-methods/my-gateway-adapter.js`:

```js
import { BasePaymentAdapter } from './base-adapter.js';
import { api } from '../api.js';

export class MyGatewayAdapter extends BasePaymentAdapter {

  match(methodCode) {
    return methodCode === 'my_gateway_cc';
  }

  async init(container, context) {
    await this._loadSDK();

    container.innerHTML = `
      <div class="space-y-3">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Card Number</legend>
          <div id="my-card-field" class="input w-full h-10"></div>
        </fieldset>
      </div>
    `;

    this._instance = await MyGateway.create({
      container: '#my-card-field',
    });
  }

  async tokenize() {
    const { token } = await this._instance.tokenize();
    return {
      payment_method_nonce: token,
    };
  }

  destroy() {
    this._instance?.teardown();
    this._instance = null;
  }

  async _loadSDK() {
    if (window.MyGateway) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.mygateway.com/v1/sdk.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}
```

### Step 2: Register It

Edit `src/js/payment-methods/index.js`:

```js
import { BraintreeAdapter } from './braintree-adapter.js';
import { MyGatewayAdapter } from './my-gateway-adapter.js';

const adapters = [
  new BraintreeAdapter(),
  new MyGatewayAdapter(),   // <-- add here
];
```

### Step 3: Build & Deploy

```bash
npm run build   # Rebuilds JS bundle with new adapter
./deploy.sh     # Deploys to Cloudflare
```

## Approach 2: Standalone Plugin (recommended for third-party)

Standalone plugins don't modify core files. They load as separate `<script>` tags and self-register via `window.MahoStorefront.registerPaymentAdapter()`.

### How it works

1. The Maho backend module adds itself to the store-config API response via the `api_store_config_dto_build` event
2. The storefront syncs config to KV (on deploy or manual sync)
3. The Layout auto-injects config variables and `<script>` tags for any registered plugins
4. The plugin script loads, reads its config from `window.*`, and registers with the adapter system

Zero storefront code changes needed per-gateway.

### Step 1: Create the Plugin Script

Create `public/plugins/my-gateway-payment.js`:

```js
(function () {
  'use strict';

  function MyGatewayAdapter() {
    this._container = null;
    this._instance = null;
  }

  MyGatewayAdapter.prototype.match = function (methodCode) {
    return methodCode === 'my_gateway_cc';
  };

  MyGatewayAdapter.prototype.init = async function (container, context) {
    this._container = container;
    container.innerHTML = '<p class="text-sm text-base-content/60">Loading...</p>';

    // Read config injected by the backend (see Step 2)
    var apiKey = window.MY_GATEWAY_PUBLIC_KEY;
    if (!apiKey) {
      container.innerHTML = '<p class="text-sm text-error">Payment not configured.</p>';
      return;
    }

    await this._loadSDK();

    container.innerHTML = `
      <div class="space-y-3">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Card Details <span class="text-error">*</span></legend>
          <div id="my-card-field" class="input w-full h-10"></div>
        </fieldset>
      </div>
    `;

    this._instance = await window.MyGateway.create({ key: apiKey, container: '#my-card-field' });
  };

  MyGatewayAdapter.prototype.tokenize = async function () {
    if (!this._instance) throw new Error('Card fields not ready.');
    var result = await this._instance.tokenize();
    return { payment_method_nonce: result.token };
  };

  MyGatewayAdapter.prototype.destroy = function () {
    if (this._instance) { this._instance.teardown(); this._instance = null; }
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
  };

  MyGatewayAdapter.prototype._loadSDK = function () {
    if (window.MyGateway) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://js.mygateway.com/v1/sdk.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  // Self-register with the storefront
  function register() {
    if (window.MahoStorefront && window.MahoStorefront.registerPaymentAdapter) {
      window.MahoStorefront.registerPaymentAdapter(new MyGatewayAdapter());
      return true;
    }
    return false;
  }

  // Retry briefly in case core bundle loads after this plugin
  if (!register()) {
    var attempts = 0;
    var interval = setInterval(function () {
      if (register() || ++attempts > 40) clearInterval(interval);
    }, 100);
  }
})();
```

**Important**: Plugin scripts use plain ES5/IIFE style (no `import` statements) since they're loaded as standalone `<script>` tags, not bundled by esbuild.

### Step 2: Backend - Register via Store Config API

The Maho backend module advertises itself by observing the `api_store_config_dto_build` event and adding to `$dto->extensions['paymentPlugins']`.

**config.xml** - Add the event observer:

```xml
<global>
    <events>
        <api_store_config_dto_build>
            <observers>
                <mygateway_register_payment_plugin>
                    <type>singleton</type>
                    <class>MyCompany_MyGateway_Model_Observer</class>
                    <method>registerStorefrontPaymentPlugin</method>
                </mygateway_register_payment_plugin>
            </observers>
        </api_store_config_dto_build>
    </events>
</global>
```

**Observer.php** - Add the plugin registration:

```php
public function registerStorefrontPaymentPlugin(Varien_Event_Observer $observer): void
{
    $dto = $observer->getEvent()->getDto();
    if (!property_exists($dto, 'extensions')) {
        return;
    }

    // Only register if the payment method is active
    if (!Mage::getStoreConfigFlag('payment/my_gateway_cc/active')) {
        return;
    }

    $publicKey = Mage::getStoreConfig('payment/my_gateway/public_key');
    if (empty($publicKey)) {
        return;
    }

    $plugins = $dto->extensions['paymentPlugins'] ?? [];
    $plugins[] = [
        'code'   => 'my_gateway',
        'script' => '/plugins/my-gateway-payment.js',
        'config' => [
            'MY_GATEWAY_PUBLIC_KEY' => $publicKey,
        ],
    ];
    $dto->extensions['paymentPlugins'] = $plugins;
}
```

### Step 3: Sync & Done

After enabling the payment method in Maho admin:

```bash
# Trigger a config sync so the storefront picks up the new plugin
curl -X POST https://your-store.com/sync/config \
  -H 'Authorization: Bearer YOUR_SYNC_SECRET'
```

The storefront will now:
1. Render `<script>window.MY_GATEWAY_PUBLIC_KEY="pk_xxx";</script>` in the `<head>`
2. Load `<script src="/plugins/my-gateway-payment.js" defer></script>`
3. The plugin self-registers and handles checkout for `my_gateway_cc`

### What the storefront renders

When `extensions.paymentPlugins` exists in the store config, the Layout automatically outputs:

```html
<!-- Config variables from all plugins -->
<script>window.MY_GATEWAY_PUBLIC_KEY="pk_xxx";window.STRIPE_PUBLISHABLE_KEY="pk_live_yyy";</script>

<!-- Plugin scripts (one per plugin) -->
<script src="/plugins/my-gateway-payment.js" defer></script>
<script src="/plugins/stripe-payment.js" defer></script>
```

## The paymentPlugins Schema

Each entry in `extensions.paymentPlugins` has this shape:

```json
{
  "code": "stripe",
  "script": "/plugins/stripe-payment.js",
  "config": {
    "STRIPE_PUBLISHABLE_KEY": "pk_live_xxx"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `code` | Yes | Unique identifier for this plugin |
| `script` | Yes | URL path to the plugin JS file (served from `public/plugins/`) |
| `config` | No | Key-value pairs injected as `window.*` globals |

## Backend Requirements

For any Maho payment module to work with the storefront:

1. **Payment method must be enabled** in Maho admin
2. **The module's `assignData()` method** must read from the same keys returned by `tokenize()`
3. **API credentials** must be configured in Maho admin
4. If the gateway needs a client token/session, add an API endpoint and have the adapter call it during `init()`

The storefront sends payment data to `POST /api/guest-carts/{id}/place-order`:

```json
{
  "paymentMethod": "my_gateway_cc",
  "paymentData": {
    "payment_method_nonce": "abc123"
  }
}
```

The API passes `paymentData` to `CartService::setPaymentMethod()`, which calls `$payment->importData(...)`, triggering the payment model's `assignData()`.

## CSS Considerations

Payment adapters render HTML at runtime, so UnoCSS can't scan their templates at build time. Two options:

1. **Use classes that already exist in .tsx files** - DaisyUI classes like `fieldset`, `input`, `btn`, `text-sm`, etc. are already in the CSS because other templates use them. This is the preferred approach.

2. **Add to safelist** - If your adapter needs a class not used anywhere else, add it to the `safelist` array in `uno.config.ts`.

## Existing Adapters

| Type | File | Gateway | Method Code |
|------|------|---------|-------------|
| Bundled | `src/js/payment-methods/braintree-adapter.js` | Braintree (Hosted Fields) | `gene_braintree_creditcard` |
| Plugin | `public/plugins/stripe-payment.js` | Stripe (Elements) | `stripe_card` |

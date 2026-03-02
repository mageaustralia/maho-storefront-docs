# Adding Payment Methods to the Storefront

The storefront uses a **payment adapter pattern** - each payment gateway has its own adapter file, and the checkout controller discovers them automatically via a registry. You never edit the checkout controller to add a payment method.

## Architecture

```
src/js/payment-methods/
  index.js              ← Registry (imports + exports all adapters)
  base-adapter.js       ← Base class with the adapter interface
  braintree-adapter.js  ← Braintree: hosted fields, nonce tokenization
```

```
Checkout Controller (core - never edited for payments)
        │
        ▼
  getAdapter(methodCode)  ←── payment-methods/index.js
        │
        ▼
  BraintreeAdapter / StripeAdapter / etc.
        │
        ├── init(container)   → Loads SDK, renders fields
        ├── tokenize()        → Returns { nonce, deviceData, ... }
        └── destroy()         → Cleans up
```

## How It Works

1. Checkout controller fetches available payment methods from the Maho API
2. User selects a payment method (radio buttons)
3. Controller calls `getAdapter(methodCode)` - returns an adapter or `null`
4. If an adapter exists, controller calls `adapter.init(container)` which renders gateway-specific UI into a generic `<div>` in the checkout template
5. On "Place Order", controller calls `adapter.tokenize()` which returns payment data (nonce, device data, etc.)
6. Controller sends `paymentData` alongside the order to the Maho API
7. Maho's API calls `importData()` on the payment model, triggering the gateway's `assignData()` method

## Adding a New Payment Gateway

### Step 1: Create the Adapter

Create `src/js/payment-methods/my-gateway-adapter.js`:

```js
import { BasePaymentAdapter } from './base-adapter.js';
import { api } from '../api.js';

export class MyGatewayAdapter extends BasePaymentAdapter {

  // Which Maho payment method code does this handle?
  match(methodCode) {
    return methodCode === 'my_gateway_cc';
  }

  // Called when user selects this payment method.
  // `container` is an empty <div> - render your UI into it.
  async init(container, context) {
    // Load external SDK
    await this._loadSDK();

    // Render fields
    container.innerHTML = `
      <div class="space-y-3">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Card Number</legend>
          <div id="my-card-field" class="input w-full h-10"></div>
        </fieldset>
      </div>
    `;

    // Initialize the gateway's JS SDK
    this._instance = await MyGateway.create({
      container: '#my-card-field',
      // ...
    });
  }

  // Called just before place-order.
  // Return an object - it gets sent as `paymentData` in the API request.
  async tokenize() {
    const { token } = await this._instance.tokenize();
    return {
      payment_method_nonce: token,
      // any other fields the Maho payment model expects
    };
  }

  // Called when user switches to a different payment method.
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
  new MyGatewayAdapter(),   // ← add here
];
```

### Step 3: Backend - Maho API

The storefront sends this to `POST /api/guest-carts/{id}/place-order`:

```json
{
  "paymentMethod": "my_gateway_cc",
  "paymentData": {
    "payment_method_nonce": "abc123",
    "device_data": "..."
  }
}
```

The API controller passes `paymentData` to `CartService::setPaymentMethod()`, which calls `$payment->importData(...)`. This triggers the Maho payment model's `assignData()` method, which stores the nonce/token in `additional_information`.

**You don't need to change any API code** - the pipeline is generic. As long as your Maho payment module's `assignData()` reads from the same keys you return in `tokenize()`, it works.

### Step 4: Build & Deploy

```bash
bun run build   # Rebuilds JS bundle with new adapter
./deploy.sh     # Deploys to Cloudflare
```

## CSS Considerations

Payment adapters render HTML at runtime, so UnoCSS can't scan their templates at build time. Two options:

1. **Use classes that already exist in .tsx files** - DaisyUI classes like `fieldset`, `input`, `btn`, `text-sm`, etc. are already in the CSS because other templates use them. This is the preferred approach.

2. **Add to safelist** - If your adapter needs a class not used anywhere else, add it to the `safelist` array in `uno.config.ts`:

```ts
export default defineConfig({
  safelist: ['my-special-class'],
  // ...
});
```

## The Adapter Interface

```js
class BasePaymentAdapter {
  match(methodCode) → boolean    // Does this adapter handle this code?
  init(container, context) → void // Render UI, load SDK
  tokenize() → object|null       // Pre-submit: return payment data
  destroy() → void               // Cleanup on unmount
}
```

| Method | When Called | What To Do |
|--------|-----------|------------|
| `match()` | After fetching payment methods | Return `true` if your adapter handles this method code |
| `init()` | User selects your method | Load SDK, render fields into `container` |
| `tokenize()` | User clicks "Place Order" | Get nonce/token, return as object |
| `destroy()` | User selects different method | Tear down SDK, clear container |

## Existing Adapters

| File | Gateway | Maho Method Code |
|------|---------|-----------------|
| `braintree-adapter.js` | Braintree (Hosted Fields) | `gene_braintree_creditcard` |

## Backend Requirements

For a Maho payment module to work with the storefront:

1. **Payment method must be enabled** in Maho admin (System > Configuration > Payment Methods)
2. **The module's `assignData()` method** must read from the keys returned by `tokenize()`
3. **API credentials** must be configured in Maho admin
4. If the gateway needs a client token/session, add an API endpoint (like `/api/braintree/client-token`) and have the adapter call it during `init()`

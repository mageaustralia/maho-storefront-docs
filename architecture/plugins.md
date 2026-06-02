# Plugin System

Maho Storefront has a plugin architecture that lets extensions add functionality — UI components, Stimulus controllers, SDK scripts, **server routes, and data-sync hooks** — without living in the core. This means:

- Upgrading the storefront core never conflicts with your plugins
- Upgrading a plugin never requires patching core files
- Removing a plugin is (close to) as simple as deleting its directory

Every plugin lives in its own directory under `src/plugins/<name>/`.

## Two extension surfaces

A plugin extends the storefront through one or both of these surfaces:

| Surface | What it adds | Wiring | Examples |
|---------|--------------|--------|----------|
| **Manifest** (auto-discovered) | SSR slot components, Stimulus controllers, `<head>` scripts | Zero core edits — discovered at build time from a `PluginManifest` default export | `social-login` |
| **Server** (manually wired) | HTTP routes, `/sync` data hooks | One `register…Routes(app, deps)` call + one `sync…()` call in `src/index.tsx` | `stripe`, `filterable-pages` |

A plugin can use both. `filterable-pages` ships a manifest (its megamenu slot + controllers) **and** server routes + a sync hook. The `stripe` plugin is server-only (its UI is a client script served as a static asset — see [Payment plugins](#payment-plugins)).

The rest of this page covers the **manifest** surface first (the zero-config path), then the **server** surface.

## Manifest plugins (auto-discovered)

Manifest plugins live in `src/plugins/<name>/` and are auto-discovered at **build time**. A build script (`scripts/generate-plugin-registry.js`, run by `npm run generate` as part of `npm run build`) scans every `src/plugins/*/index.ts` for a `PluginManifest` default export, generates a registry, and esbuild bundles everything statically. No runtime filesystem access is needed (Cloudflare Workers has no filesystem).

```
src/plugins/
├── social-login/          # Social login plugin
│   ├── index.ts           # Plugin manifest
│   ├── controller.js      # Stimulus controller
│   └── SocialLoginButtons.tsx  # JSX component
├── loyalty-points/        # Another plugin
│   ├── index.ts
│   ├── controller.js
│   └── PointsBadge.tsx
```

When you run `npm run build`, the generator produces:
- `src/generated/plugin-registry.ts` — SSR registry (components + head scripts) used by the Worker
- `src/generated/plugin-controllers.ts` — Client-side controllers only (no JSX shipped to browser)

## Writing a Plugin

### 1. Create the directory

```bash
mkdir -p src/plugins/my-plugin
```

### 2. Create the manifest (`index.ts`)

Every plugin must export a default `PluginManifest`:

```ts
// src/plugins/my-plugin/index.ts
import type { PluginManifest } from '../types';
import { MyComponent } from './MyComponent';
import MyController from './controller';

const manifest: PluginManifest = {
  name: 'my-plugin',

  // Register JSX components into named template slots
  slots: [
    { slot: 'product.info.after', component: MyComponent, order: 10 },
  ],

  // Register Stimulus controllers (auto-registered in app.js)
  controllers: [
    { name: 'my-plugin', controller: MyController },
  ],

  // Inject SDK scripts into <head> (conditionally)
  headScripts: [
    {
      key: 'my-sdk',
      src: 'https://cdn.example.com/sdk.js',
      async: true,
      defer: true,
      when: (config) => !!config.extensions?.myPluginEnabled,
    },
  ],
};

export default manifest;
```

### 3. Create the component

Components receive the store config and render based on it. If the data they need isn't present (because the PHP module isn't installed), they should return `null`:

```tsx
// src/plugins/my-plugin/MyComponent.tsx
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../types';

export const MyComponent: FC<{ config: StoreConfig }> = ({ config }) => {
  const data = config.extensions?.myPluginData;
  if (!data) return null;  // PHP module not installed — render nothing

  return (
    <div data-controller="my-plugin" data-my-plugin-key-value={data.apiKey}>
      {/* Your UI here */}
    </div>
  );
};
```

### 4. Create the controller

Standard Stimulus controller — the only difference is the import paths use `../../js/` since you're in the plugins directory:

```js
// src/plugins/my-plugin/controller.js
import { Controller } from '../../js/stimulus.js';
import { api } from '../../js/api.js';

export default class extends Controller {
  static values = { key: String };

  connect() {
    // Initialize your client-side logic
  }
}
```

### 5. Build

```bash
npm run build
```

The generator discovers your plugin, adds it to the registry, and esbuild bundles it. That's it — no other files to edit.

## Extension Slots

Core templates have named extension slots where plugins can inject components:

```tsx
// In a core template:
<ExtensionSlot name="auth.login.after" config={config} />
```

Multiple plugins can register for the same slot. They're rendered in `order` sequence.

### Available Slots

| Slot | Template | Description |
|------|----------|-------------|
| `auth.login.after` | Login page | After the login form (e.g. social login buttons) |
| `auth.register.after` | Register page | After the registration form |
| `product.info.after` | Product page | After product details |
| `checkout.payment.after` | Checkout | After payment method selection |
| `header.actions.after` | Header | After header action links |
| `layout.body.end` | Layout | Before `</body>` (modals, popups, widgets) |

To add a new slot to a core template, add `<ExtensionSlot name="your.slot.name" config={config} />` where you want plugins to render.

## Head Scripts

Plugins can inject scripts into `<head>` — useful for loading third-party SDKs. Scripts are conditional: the `when` function receives the store config and decides whether to load.

```ts
headScripts: [
  {
    key: 'unique-key',
    src: 'https://cdn.example.com/sdk.js',
    async: true,
    defer: true,
    when: (config) => !!config.extensions?.myFeatureEnabled,
  },
  {
    key: 'inline-config',
    inline: (config) => `window.MY_KEY="${config.extensions?.myKey}";`,
    when: (config) => !!config.extensions?.myKey,
  },
],
```

If `when` is omitted, the script always loads. If `when` returns false, the script tag is not rendered.

## PHP Module Integration

The plugin system works hand-in-hand with Maho PHP modules. The typical pattern:

1. **PHP module** hooks `api_store_config_dto_build` to inject config data:
   ```php
   // In your Observer.php
   public function injectConfig(Varien_Event_Observer $observer): void
   {
       $dto = $observer->getEvent()->getDto();
       $dto->extensions['myPluginData'] = [
           'apiKey' => Mage::getStoreConfig('my/plugin/api_key'),
           'enabled' => true,
       ];
   }
   ```

2. **Storefront plugin** reads that data from `config.extensions` and renders UI accordingly.

3. If the PHP module isn't installed, `config.extensions.myPluginData` is `undefined`, and the plugin component returns `null` — zero visual impact.

This means you can ship the storefront plugin as part of the core storefront, and it's completely inert until the PHP module is installed and configured.

## Real-World Example: Social Login

The social login plugin (`src/plugins/social-login/`) is a complete reference implementation:

**PHP module** (`MageAustralia_SocialLogin`):
- Admin config for Google/Apple/Facebook credentials
- Observer injects `socialLoginProviders` array into store config
- API endpoint `POST /api/customers/social-auth` verifies tokens and issues JWTs

**Storefront plugin** (`src/plugins/social-login/`):
- `index.ts` — Registers for `auth.login.after` and `auth.register.after` slots, loads Google/Apple/Facebook SDKs conditionally
- `SocialLoginButtons.tsx` — Renders branded buttons for each enabled provider, or nothing if none are enabled
- `controller.js` — Handles popup flows (Google GIS, Apple SIWA, Facebook SDK), calls the API, manages account linking

**Key design points:**
- The component checks `config.extensions?.socialLoginProviders` — returns null if absent
- Head scripts use `when()` to only load Google SDK if Google is enabled, etc.
- The controller is registered automatically — no edits to `app.js`
- Zero core file modifications needed

## Server-side plugins (routes & sync)

Some plugins need to run code on the server — handle an HTTP route, or pull data
from the Maho backend during a sync. The `PluginManifest` doesn't cover this
(it's SSR/client only), so server plugins export plain functions that the worker
entry wires in explicitly. This is the same dependency-injection pattern the
core uses for its own route modules.

A server plugin's `index.ts` is a **barrel** that re-exports:

- a `register<Name>Routes(app, deps)` function — registers its routes on the Hono app
- (optional) a `sync<Name>(...)` function — called inside the core `/sync` loop
- (optional) small config readers used by core endpoints

```ts
// src/plugins/my-plugin/index.ts
export { registerMyPluginRoutes } from './routes';
export { syncMyPlugin } from './sync';
```

```ts
// src/plugins/my-plugin/routes.ts
import type { Hono } from 'hono';
import type { Env, StorefrontStore } from '../../types';

// Core-owned helpers the plugin needs are passed IN — the plugin never reaches
// back into index.tsx. This keeps the dependency direction one-way.
export interface MyPluginDeps {
  getStoreContext: (c: any) => Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }>;
  getApiUrl: (env: Env, stores: StorefrontStore[], storeCode?: string) => string;
}

export function registerMyPluginRoutes(app: Hono<any>, deps: MyPluginDeps): void {
  app.get('/api/my-plugin/thing', async (c) => {
    // ...
    return c.json({ ok: true });
  });
}
```

### Wiring it into the worker

Server plugins are **not** auto-discovered — registering a route has ordering
and dependency implications, so it's an explicit two-line wiring in
`src/index.tsx`:

```ts
import { registerMyPluginRoutes, syncMyPlugin } from './plugins/my-plugin';

// near the other route registrations:
registerMyPluginRoutes(app, { getStoreContext, getApiUrl });

// inside the per-store loop of the POST /sync handler:
await syncMyPlugin({ apiUrl: getApiUrl(c.env, stores, storeCode), config, store, prefix });
```

That's the whole core footprint — two call sites. Everything else lives in the
plugin directory, so the plugin can be removed by deleting its folder and those
two lines.

::: tip Why not auto-discover routes too?
Route registration order matters (e.g. the catch-all URL resolver must be last),
and routes often need core helpers (`getStoreContext`, rate limiting, the API
client). Explicit wiring keeps both under the author's control and the
dependency direction one-way (plugin depends on core, never the reverse).
:::

## Payment plugins

Payment methods are a specialised kind of plugin with up to four parts:

1. **A client script** served as a static asset at `/plugins/<name>-payment.js`
   (built from `public/plugins/<name>-payment.js.txt`). It registers a payment
   adapter (see `src/js/payment-methods/`) that the checkout controller drives.
2. **A server sync hook** that, during `/sync`, asks the Maho backend for this
   method's config and registers it in `config.extensions.paymentPlugins`:
   ```ts
   config.extensions.paymentPlugins.push({
     code: 'stripe',
     script: '/plugins/stripe-payment.js',     // client adapter to load
     config: { STRIPE_PUBLISHABLE_KEY: '…' },  // PUBLIC values only
   });
   ```
   The storefront renders the registered scripts on checkout; the client adapter
   reads its `config` block. **Only publishable/public values go here** — secrets
   never reach `paymentPlugins`.
3. **(If the method authorises server-side) a route + a KV-stored secret.** The
   secret is written to KV (e.g. `${prefix}stripe:secretKey`) during sync and
   read only on the server.
4. **CSP sources it owns.** A plugin that loads a third-party SDK declares the
   Content-Security-Policy sources it needs in its own `csp.ts`, and registers
   them in the aggregator `src/plugins/csp.ts`. The `security-headers`
   middleware folds those into the base policy — so gateway domains are **not**
   hardcoded in core, and removing the plugin removes its CSP footprint:
   ```ts
   // src/plugins/stripe/csp.ts
   export const STRIPE_CSP: PluginCsp = {
     scriptSrc: ['https://js.stripe.com'],
     connectSrc: ['https://api.stripe.com'],
     frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
   };
   // src/plugins/csp.ts → const CONTRIBUTIONS = [STRIPE_CSP];  // one line per plugin
   ```

### Real-World Example: Stripe

The Stripe plugin (`src/plugins/stripe/`) is the reference server/payment plugin.
Stripe is **not** part of core — it's entirely contained here:

- `routes.ts` → `registerStripeRoutes(app, deps)` — `POST /api/payments/stripe/payment-intents`
  (+ CORS preflight). Creates a Stripe PaymentIntent (`capture_method=manual`)
  from the Maho cart total. **No-ops** (falls through) when no secret key is
  configured, so a store without the Maho Stripe module is unaffected.
- `sync.ts` → `syncStripeConfig(...)` — on `/sync`, fetches `/api/payments/stripe/config`
  from the backend, registers the `stripe` payment plugin (publishable key), and
  stores the secret key in KV for PaymentIntent creation.
- `config.ts` → `getStripePublishableKey(config)` — reader used by the embed
  products endpoint to surface the public key.
- `csp.ts` → `STRIPE_CSP` — the CSP sources Stripe needs, merged via `src/plugins/csp.ts`.
- `index.ts` — barrel; `INTEGRATION.md` — plugin-local integration notes.

The client side (`public/plugins/stripe-payment.js.txt`) was already plugin-shaped
and is unchanged. Core's total footprint is the two wiring lines in `index.tsx`,
the one `getStripePublishableKey` reader, and one line in the CSP aggregator.

::: tip Embed widget — payment adapters
The standalone **embed widget** (`src/embed/*`, a separate IIFE bundle for
third-party sites) is its own runtime, so it can't use the storefront plugin
registry. It applies the **same principle** with a local `PaymentAdapter`
interface (`src/embed/payments/`): the checkout flow is gateway-agnostic and
mounts whatever adapter matches the selected method (`createPaymentAdapter`).
Stripe lives in `src/embed/payments/stripe.ts` as one adapter — adding a gateway
is a new adapter module + one registry line, with no change to the checkout flow.
:::

**Backend requirement:** the Maho Stripe module exposing
`GET /api/payments/stripe/config` (returns `{ publishableKey, secretKey }`; the
secret is only returned when the request carries `X-Storefront-Sync: <SYNC_SECRET>`).

### Second example: Braintree

`src/plugins/braintree/` is a leaner payment plugin (`gene_braintree_creditcard`):

- `sync.ts` → `syncBraintreeConfig` — registers the `braintree` payment plugin on
  `/sync` if the backend exposes `/api/payments/braintree/config`; no-ops otherwise.
- `csp.ts` → `BRAINTREE_CSP` — Hosted Fields + Cardinal 3DS sources.
- No server route and **no stored secret**: the client adapter fetches a
  short-lived **client token** at runtime from `/api/payments/braintree/client-token`,
  so there's nothing to persist in KV (unlike Stripe's publishable/secret split).
- Client adapter: `public/plugins/braintree-payment.js`, served via `/plugins/:name`.

So a payment plugin needs only as much server surface as its gateway requires —
Stripe has a server route (PaymentIntent creation), Braintree has none.

> **Backend caveat:** the module must be installed on the *same* backend the
> store points at, and at a compatible Maho version — installing a module whose
> API Platform resources need a newer Maho than the backend runs can break the
> whole `/api/rest/v2` surface.

## Manifest Reference

```ts
interface PluginManifest {
  name: string;               // Unique plugin identifier
  slots?: PluginSlotEntry[];  // SSR component registrations
  controllers?: PluginControllerEntry[];  // Stimulus controllers
  headScripts?: PluginHeadScript[];       // SDK/script injection
}

interface PluginSlotEntry {
  slot: string;                           // Named slot (e.g. "auth.login.after")
  component: FC<{ config: StoreConfig }>; // JSX component
  order?: number;                         // Sort order (default: 10)
}

interface PluginControllerEntry {
  name: string;    // Stimulus controller name
  controller: any; // Controller class
}

interface PluginHeadScript {
  key: string;                                     // Unique key
  src?: string;                                    // External URL
  inline?: string | ((config: StoreConfig) => string); // Inline JS
  when?: (config: StoreConfig) => boolean;         // Conditional load
  async?: boolean;
  defer?: boolean;
}
```

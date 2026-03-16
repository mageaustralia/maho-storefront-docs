# Plugin System

Maho Storefront has a plugin architecture that lets extensions add UI components, Stimulus controllers, and SDK scripts without modifying any core files. This means:

- Upgrading the storefront core never conflicts with your plugins
- Upgrading a plugin never requires patching core files
- Removing a plugin is as simple as deleting its directory

## How It Works

Plugins live in `src/plugins/<name>/` and are auto-discovered at **build time**. A build script scans for plugin manifests, generates a registry, and esbuild bundles everything statically. No runtime filesystem access is needed (Cloudflare Workers has no filesystem).

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

# JavaScript Bundling

esbuild bundles all Stimulus controllers and supporting libraries into a single minified ESM file.

## Build Command

```bash
bun run build:js
# Runs: esbuild src/js/app.js --bundle --minify --format=esm \
#   --outfile=public/controllers.js.txt \
#   --external:https://cdn.jsdelivr.net/*
```

## Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `--bundle` | — | Bundle all imports into one file |
| `--minify` | — | Minify output (variable names, whitespace) |
| `--format=esm` | — | Output as ES module |
| `--outfile` | `public/controllers.js.txt` | Output path |
| `--external` | CDN URLs | Don't bundle CDN imports |

## Entry Point

`src/js/app.js` bootstraps the Stimulus application and registers all controllers:

```javascript
import { Application } from './stimulus.js';
import ProductController from './controllers/product-controller.js';
import CartController from './controllers/cart-controller.js';
import CheckoutController from './controllers/checkout-controller.js';
// ... all 19 controllers

const app = Application.start();
app.register('product', ProductController);
app.register('cart', CartController);
app.register('checkout', CheckoutController);
// ...
```

## Bundle Contents

The output includes:

- **Stimulus runtime** (~8KB minified) — from `@hotwired/stimulus`
- **19 controllers** (~30-40KB minified) — all application logic
- **Supporting libraries** (~5-10KB) — api.js, utils.js, template-helpers.js, analytics.js
- **Payment adapters** (~5KB) — Braintree integration

## .js.txt Extension

The output uses `.js.txt` instead of `.js` because:

1. Cloudflare Workers import `.js` files as executable modules
2. We want the JS bundle imported as a **text string** (not executed in the Worker)
3. The `wrangler.toml` text rule maps `.txt` to text imports
4. The Worker serves the text at `/controllers.js` with `Content-Type: application/javascript`

## External Dependencies

CDN-loaded scripts (excluded from the bundle):

```javascript
// Not bundled — loaded via <script> tag in HTML
import 'https://cdn.jsdelivr.net/npm/braintree-web@3/client.min.js';
```

These are declared as `--external` so esbuild doesn't try to bundle them.

Source: `package.json`, `src/js/app.js`

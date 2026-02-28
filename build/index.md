# Build System

The Maho Storefront uses two build tools: **UnoCSS** for CSS generation and **esbuild** for JavaScript bundling. Both run as npm scripts and output to the `public/` directory.

## Build Pipeline

```mermaid
flowchart LR
    subgraph CSS
        Theme[theme.json] --> Uno[UnoCSS]
        DaisyUI[DaisyUI v5] --> Uno
        TSX[src/**/*.tsx] --> Uno
        Uno --> CSS[public/styles.css]
    end

    subgraph JS
        App[src/js/app.js] --> ES[esbuild]
        Controllers[19 controllers] --> ES
        Libs[utils, api, helpers] --> ES
        ES --> Bundle[public/controllers.js.txt]
    end

    CSS --> Deploy[wrangler deploy]
    Bundle --> Deploy
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Build CSS + JS (runs both below) |
| `bun run build:css` | Generate CSS with UnoCSS |
| `bun run build:js` | Bundle JS with esbuild |
| `bun run manifest` | Generate component manifest |
| `bun run dev` | Start local Wrangler dev server |
| `bun run deploy` | Deploy to Cloudflare Workers |

## Output Files

| File | Size (typical) | Source | Cache |
|------|---------------|--------|-------|
| `public/styles.css` | ~80-120KB | UnoCSS | 1 year (hash-versioned) |
| `public/controllers.js.txt` | ~40-60KB | esbuild | 1 year (hash-versioned) |

Both files are imported as text modules by the Worker (via `wrangler.toml` text rules) and served with immutable cache headers. The `.js.txt` extension prevents Cloudflare from treating the file as executable JavaScript during upload.

## Asset Versioning

The `ASSET_HASH` (in `src/asset-version.ts`) is a hash of the CSS + JS + page config contents. When any of these change, the hash changes, which:

1. Updates the `<link>` and `<script>` URLs in rendered HTML
2. Invalidates the edge cache version tag
3. Forces browsers to fetch the new assets

This means zero-downtime deployments — old cached pages reference old asset URLs (still served from the 1-year cache), while new pages reference new URLs.

## Next Steps

- [UnoCSS](/build/unocss) — CSS generation details
- [JavaScript Bundling](/build/esbuild) — esbuild configuration
- [Maho CLI](/build/maho-cli) — `./maho storefront:build` command

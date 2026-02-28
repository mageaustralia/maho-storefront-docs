# Configuration Reference

All configuration files and environment variables used by the Maho Storefront.

## wrangler.toml

Cloudflare Workers deployment configuration.

```toml
name = "maho-storefront"
main = "src/index.tsx"
compatibility_flags = ["nodejs_compat"]

[vars]
MAHO_API_URL = "https://your-maho-instance.com"
SYNC_SECRET = "your-secret-key"

[[kv_namespaces]]
binding = "CONTENT"
id = "your-kv-namespace-id"

[[rules]]
type = "Text"
globs = ["**/*.css", "**/*.txt"]
fallthrough = true
```

### Environment Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `MAHO_API_URL` | string | Yes | Base URL of Maho backend |
| `SYNC_SECRET` | string | Yes | Shared secret for /sync and /cache endpoints |
| `DEMO_STORES` | string (JSON) | No | Hostname → store code mapping |

### KV Namespace

| Setting | Description |
|---------|-------------|
| `binding` | Variable name in Worker code (`env.CONTENT`) |
| `id` | Cloudflare KV namespace ID |

### Text Rules

The `[[rules]]` section tells Wrangler to import `.css` and `.txt` files as text strings rather than JavaScript modules. This is how `public/styles.css` and `public/controllers.js.txt` get embedded in the Worker.

## stores.json

Maps store codes to theme and page configuration files. Each store code corresponds to a Maho store view.

```json
{
  "stores": {
    "en": { "theme": "maho", "pageConfig": "page.json" },
    "sv_2": { "theme": "tech", "pageConfig": "page-tech.json" },
    "store_view_3": { "theme": "brew-beyond", "pageConfig": "page-brew-beyond.json" }
  },
  "defaultTheme": "maho",
  "defaultPageConfig": "page.json"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stores` | object | Store code → config mapping |
| `stores[code].theme` | string | Theme name (maps to `theme-{name}.json`) |
| `stores[code].pageConfig` | string | Page config filename |
| `defaultTheme` | string | Fallback theme for unmapped stores |
| `defaultPageConfig` | string | Fallback page config |

## theme.json

Full design token configuration. Each store can have its own theme file (`theme-tech.json`, `theme-brew-beyond.json`) that overrides the base `theme.json`.

::: details Full theme.json example (Fashion Demo — default theme)
```json
{
  "name": "Fashion Demo",
  "description": "Bold fashion theme with punchy type, clean minimalism, and high contrast",
  "colors": {
    "primary": "#111111",
    "primaryLight": "#1a1a1a",
    "accent": "#ff2d87",
    "accentHover": "#e6006e",
    "accentLight": "#fff0f6",
    "success": "#10b981",
    "successBg": "#ecfdf5",
    "error": "#ef4444",
    "errorBg": "#fef2f2",
    "sale": "#ef4444",
    "outOfStock": "#9ca3af",
    "text": "#111111",
    "textSecondary": "#525252",
    "textMuted": "#9ca3af",
    "border": "#e5e5e5",
    "borderLight": "#f5f5f5",
    "bg": "#ffffff",
    "bgSubtle": "#fafafa",
    "bgMuted": "#f5f5f5",
    "bgOverlay": "rgba(17, 17, 17, 0.04)",
    "white": "#ffffff",
    "black": "#000000",
    "overlay": "rgba(15, 23, 42, 0.4)",
    "overlayLight": "rgba(0, 0, 0, 0.5)"
  },
  "fonts": {
    "sans": "'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    "mono": "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    "heading": "'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    "googleFontsImport": "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap"
  },
  "typography": {
    "baseFontSize": "15px",
    "baseLineHeight": 1.6,
    "h1Size": "2.25rem",
    "h2Size": "1.625rem",
    "h3Size": "1.25rem",
    "h4Size": "1.125rem",
    "letterSpacing": "-0.01em",
    "headingWeight": 700,
    "bodyWeight": 400
  },
  "radii": {
    "xs": "4px",
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "24px",
    "2xl": "32px",
    "full": "9999px"
  },
  "shadows": {
    "xs": "0 1px 2px rgba(0, 0, 0, 0.04)",
    "sm": "0 2px 4px rgba(0, 0, 0, 0.06)",
    "md": "0 4px 12px rgba(0, 0, 0, 0.08)",
    "lg": "0 8px 24px rgba(0, 0, 0, 0.1)",
    "xl": "0 16px 48px rgba(0, 0, 0, 0.12)"
  },
  "layout": {
    "productGridColumns": { "mobile": 2, "tablet": 3, "desktop": 4 },
    "sidebarWidth": "240px",
    "headerStyle": "sticky",
    "footerColumns": 4,
    "categoryDisplayMode": "sidebar-left"
  },
  "components": {
    "buttons": {
      "borderRadius": "xl",
      "textTransform": "none",
      "fontWeight": 600,
      "padding": "12px 28px"
    },
    "cards": {
      "borderRadius": "md",
      "shadow": "none",
      "hoverShadow": "md",
      "border": false
    },
    "badges": {
      "borderRadius": "sm",
      "textTransform": "uppercase",
      "fontSize": "0.7rem",
      "fontWeight": 700
    },
    "inputs": {
      "borderRadius": "sm",
      "borderColor": "border",
      "focusRing": "accent"
    }
  }
}
```
:::

::: details theme-tech.json (TechZone — key differences highlighted)
The tech theme uses **sharp corners** (`radii.xs: 2px`), **blue accent** (`#3b82f6`), **Space Grotesk headings**, and **bordered cards with shadows**:

```json
{
  "name": "TechZone",
  "description": "Modern tech store with sharp corners, blue accent, and clean utility aesthetic",
  "colors": {
    "primary": "#0f172a",
    "accent": "#3b82f6",
    "accentHover": "#2563eb",
    "accentLight": "#eff6ff"
  },
  "fonts": {
    "sans": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    "heading": "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    "googleFontsImport": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
  },
  "radii": {
    "xs": "2px",
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "xl": "10px",
    "2xl": "12px"
  },
  "components": {
    "buttons": { "borderRadius": "sm" },
    "cards": { "borderRadius": "sm", "shadow": "sm", "hoverShadow": "lg", "border": true },
    "badges": { "borderRadius": "xs" }
  }
}
```
:::

See [theme.json Reference](/theming/theme-json) for complete token documentation.

## page.json

Controls which component variant renders for each page and slot. Each store can have its own page config.

::: details Full page.json example (Fashion Demo — default)
```json
{
  "pages": {
    "product": {
      "components": {
        "layout": "masonry",
        "gallery": "masonry",
        "info-panel": "compact",
        "card": "minimal",
        "price": "standard",
        "variant-picker": "swatch",
        "quantity-stepper": "standard",
        "tabs": "accordion"
      },
      "sections": {
        "showBreadcrumbs": true,
        "showSizeGuide": true,
        "sizeGuideVariant": "table",
        "showRelated": true,
        "showUpsell": true,
        "showRecentlyViewed": true,
        "showReviews": true,
        "reviewsPosition": "tabbed"
      }
    },
    "category": {
      "components": {
        "card": "minimal",
        "filter": "sidebar",
        "sort": "standard",
        "pagination": "standard"
      },
      "gridColumns": { "mobile": 2, "tablet": 3, "desktop": 4 },
      "filterPosition": "sidebar-left",
      "showSubcategories": true
    },
    "cart": {
      "components": {
        "drawer": "slide",
        "line-item": "standard",
        "summary": "standard"
      },
      "showRecommendations": true,
      "showProgressBar": true
    },
    "header": { "variant": "centered" },
    "footer": { "variant": "mega" },
    "homepage": {
      "components": {
        "hero": "split",
        "promo-grid": "3up"
      }
    },
    "search": {
      "components": {
        "bar": "overlay",
        "results": "standard"
      }
    }
  }
}
```
:::

::: details page-tech.json (TechZone — key differences)
The tech store uses **standard cards** (not minimal), **tabbed product info** (not accordion), **mega header**, **standard footer**, and a **fullwidth hero**:

```json
{
  "pages": {
    "product": {
      "components": {
        "card": "standard",
        "tabs": "tabbed"
      },
      "sections": {
        "showSizeGuide": false
      }
    },
    "category": {
      "components": { "card": "standard" },
      "gridColumns": { "mobile": 2, "tablet": 3, "desktop": 3 },
      "cmsInsertion": "row",
      "cmsInsertPosition": 3
    },
    "header": { "variant": "mega" },
    "footer": { "variant": "standard" },
    "homepage": {
      "components": { "hero": "fullwidth" }
    }
  }
}
```
:::

See [page.json Reference](/components/page-config) for all available slots and variants.

## package.json Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `wrangler dev` | Local development server |
| `deploy` | `wrangler deploy` | Deploy to Cloudflare |
| `build` | `build:css && build:js` | Build all assets |
| `build:css` | `unocss ... --out-file public/styles.css` | Generate CSS |
| `build:js` | `esbuild ... --outfile=public/controllers.js.txt` | Bundle JS |
| `manifest` | `node scripts/generate-manifest.js` | Generate component manifest |
| `test` | `vitest run` | Run tests |
| `types` | `wrangler types` | Generate TypeScript types |

All scripts are run via **Bun** (`bun run build`, `bun run dev`, etc.). The Maho CLI command `./maho storefront:build` handles Bun installation automatically.

## File Reference

| File | Purpose | Docs |
|------|---------|------|
| `wrangler.toml` | Workers config | This page |
| `stores.json` | Store → theme mapping | This page |
| `theme.json` | Design tokens | [Theme Reference](/theming/theme-json) |
| `page.json` | Variant config | [Page Config](/components/page-config) |
| `uno.config.ts` | UnoCSS config | [UnoCSS](/build/unocss) |
| `manifest.json` | Component metadata | [Variant System](/components/) |
| `deploy.sh` | Deploy script | [Deployment](/getting-started/deployment) |

Source: `wrangler.toml`, `stores.json`, `package.json`

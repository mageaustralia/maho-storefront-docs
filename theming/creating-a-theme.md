# Creating a Theme

This guide walks through creating a new theme for a store.

![Tech theme category page — different colors, fonts, and layout from the same codebase](/screenshots/category-tech.png)

## Step 1: Create a Theme File

Copy `theme.json` and customize:

```bash
cp theme.json theme-mystore.json
```

Edit the new file with your brand tokens:

```json
{
  "colors": {
    "primary": "#1a1a2e",
    "accent": "#e94560",
    "success": "#10b981",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "text": "#1a1a2e",
    "textSecondary": "#64748b",
    "bg": "#ffffff",
    "bgSubtle": "#f8fafc",
    "border": "#e2e8f0"
  },
  "fonts": {
    "sans": "Inter, system-ui, sans-serif",
    "heading": "Inter",
    "googleFontsImport": "Inter:wght@400;500;600;700"
  },
  "radii": {
    "xs": "2px",
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "xl": "12px"
  }
}
```

::: tip
You only need to include tokens you want to override. Missing tokens inherit from the default `theme.json`.
:::

## Step 2: Register the Store

Add your store to `stores.json`:

```json
{
  "stores": {
    "en": { "theme": "maho", "pageConfig": "page.json" },
    "mystore": { "theme": "mystore", "pageConfig": "page-mystore.json" }
  },
  "defaultTheme": "maho",
  "defaultPageConfig": "page.json"
}
```

## Step 3: Create a Page Config (Optional)

If your store needs different component variants:

```bash
cp page.json page-mystore.json
```

Edit to select which variants each page uses:

```json
{
  "pages": {
    "product": {
      "components": {
        "gallery": "grid",
        "card": "standard"
      }
    },
    "header": { "variant": "centered" },
    "footer": { "variant": "mega" }
  }
}
```

## Step 4: Add Theme-Specific CSS (Optional)

For styles that go beyond token changes, create a CSS file:

```css
/* src/css/theme-mystore.css */

[data-theme="mystore"] {
  /* Custom overrides */
  .hero-section {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
  }
}
```

Include it in `uno.config.ts` preflights if needed.

## Step 5: Build and Test

```bash
# Rebuild CSS with new theme tokens
bun run build:css

# Start local dev server
bun run dev
```

Visit your store URL — the theme resolves automatically from the hostname → store code → theme mapping.

## Step 6: Deploy

```bash
bun run build
bun run deploy
```

## Theme Inheritance

Themes are composable. The build system:

1. Loads the default `theme.json` as the base
2. Deep-merges any store-specific `theme-{name}.json` overrides
3. Generates CSS custom properties for both `:root` (default) and `[data-theme="{name}"]` (store themes)

This means a store theme file can be as small as:

```json
{
  "colors": {
    "accent": "#00d4ff"
  },
  "fonts": {
    "sans": "Roboto, sans-serif",
    "googleFontsImport": "Roboto:wght@400;500;700"
  }
}
```

Everything else inherits from the default theme.

Source: `uno.config.ts`, `stores.json`

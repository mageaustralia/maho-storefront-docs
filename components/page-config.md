# page.json Reference

The `page.json` file controls which component variant renders on each page type. Each store can have its own page config file.

## Structure

```json
{
  "pages": {
    "product": {
      "components": {
        "layout": "masonry",
        "gallery": "masonry",
        "card": "minimal",
        "variant-picker": "swatch",
        "tabs": "accordion"
      },
      "sections": {
        "showReviews": true,
        "reviewsPosition": "tabbed"
      }
    },
    "category": {
      "components": {
        "card": "minimal",
        "filter": "sidebar"
      },
      "gridColumns": {
        "mobile": 2,
        "tablet": 3,
        "desktop": 4
      }
    },
    "header": {
      "variant": "centered"
    },
    "footer": {
      "variant": "mega"
    }
  }
}
```

## Page Types

| Page | Available Component Slots |
|------|--------------------------|
| `product` | layout, gallery, card, variant-picker, tabs, price, badge, quantity-stepper, sticky-atc, stock-indicator, info-panel |
| `category` | card, filter, grid, hero, toolbar |
| `header` | variant (single top-level variant) |
| `footer` | variant (single top-level variant) |
| `homepage` | hero, promo-grid, featured-products, icon-features |

## Resolving Variants

### Components

```typescript
import { getVariant } from './page-config';

// getVariant(page, slot, fallback?)
const gallery = getVariant('product', 'gallery', 'carousel');
```

Resolution chain:
1. `pages.product.components.gallery` → found? return it
2. `pages.product.gallery` → found? return it (top-level shorthand)
3. Return fallback (`'carousel'`)

### Sections

```typescript
import { getSection } from './page-config';

// getSection<T>(page, key, fallback?)
const showReviews = getSection<boolean>('product', 'showReviews', true);
const gridCols = getSection('category', 'gridColumns', { mobile: 2, tablet: 3, desktop: 4 });
```

### Grid Columns

Convenience helper for grid layouts:

```typescript
import { getGridColumns } from './page-config';

const cols = getGridColumns('category');
// Returns: { mobile: 2, tablet: 3, desktop: 4 }
```

## Multi-Store Configuration

Each store can reference a different page config in `stores.json`:

```json
{
  "stores": {
    "en": { "theme": "maho", "pageConfig": "page.json" },
    "sv_2": { "theme": "tech", "pageConfig": "page-tech.json" }
  }
}
```

The resolver reads the correct config based on the current render context (set via `setRenderStore()`).

## Store Context

Before rendering, the store context must be set:

```typescript
import { setRenderStore } from './page-config';

// In route handler, before JSX rendering
setRenderStore(storeCode);

// All getVariant/getSection calls now use this store's config
```

This is handled automatically by the main router in `src/index.tsx`.

Source: `src/page-config.ts`, `page.json`

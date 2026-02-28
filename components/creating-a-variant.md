# Creating a Variant

This guide walks through adding a new product card variant as an example. The same pattern applies to any component slot.

## Step 1: Create the Component

Create a new file in the slot directory:

```
src/templates/components/product-display/card/CardHighlight.tsx
```

```tsx
import type { Product } from '../../../../types';

interface Props {
  product: Product;
}

export default function CardHighlight({ product }: Props) {
  const discount = product.specialPrice
    ? Math.round((1 - product.specialPrice / product.price) * 100)
    : 0;

  return (
    <div class="card bg-gradient-to-br from-base-100 to-base-200 shadow-lg hover:shadow-xl transition-shadow">
      <figure class="relative">
        <img
          src={product.smallImageUrl}
          alt={product.name}
          class="w-full aspect-square object-contain"
          loading="lazy"
        />
        {discount > 0 && (
          <span class="badge badge-error absolute top-2 right-2">
            -{discount}%
          </span>
        )}
      </figure>
      <div class="card-body p-4">
        <h3 class="card-title text-sm line-clamp-2">{product.name}</h3>
        <div class="flex items-baseline gap-2">
          {product.specialPrice ? (
            <>
              <span class="text-error font-bold">${product.specialPrice.toFixed(2)}</span>
              <span class="text-text-muted line-through text-xs">${product.price.toFixed(2)}</span>
            </>
          ) : (
            <span class="font-bold">${product.price.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Step 2: Register in Manifest

Add the variant to `_manifest.json`:

```json
{
  "slot": "card",
  "domain": "product-display",
  "description": "Product card shown in category grids and search results",
  "variants": {
    "standard": { "label": "Standard Card", "file": "CardStandard.tsx" },
    "minimal": { "label": "Minimal Card", "file": "CardMinimal.tsx" },
    "highlight": {
      "label": "Highlight Card",
      "description": "Gradient background card with prominent discount badge",
      "file": "CardHighlight.tsx"
    }
  },
  "default": "standard"
}
```

## Step 3: Add to Index

Update the slot's `index.tsx` to import and map the new variant:

```tsx
import { getVariant } from '../../../page-config';
import CardStandard from './CardStandard';
import CardMinimal from './CardMinimal';
import CardHighlight from './CardHighlight';

const variants = {
  standard: CardStandard,
  minimal: CardMinimal,
  highlight: CardHighlight,
};

export default function ProductCard(props) {
  const variant = getVariant('product', 'card', 'standard');
  const Component = variants[variant] || CardStandard;
  return <Component {...props} />;
}
```

## Step 4: Use in Page Config

Enable the variant for a store by updating its `page.json`:

```json
{
  "pages": {
    "product": {
      "components": {
        "card": "highlight"
      }
    },
    "category": {
      "components": {
        "card": "highlight"
      }
    }
  }
}
```

## Step 5: Regenerate Manifest

```bash
bun run manifest
```

## Step 6: Build and Test

```bash
bun run build
bun run dev
```

## Variant Checklist

When creating a variant, ensure:

- [ ] Component accepts the same props as sibling variants
- [ ] Uses DaisyUI classes and UnoCSS utilities (not custom CSS where possible)
- [ ] Respects theme tokens (CSS custom properties, not hardcoded colors)
- [ ] Images use `loading="lazy"` for off-screen content
- [ ] Interactive elements have appropriate `data-controller` attributes if needed
- [ ] Added to `_manifest.json` with label and description
- [ ] Added to `index.tsx` variant map
- [ ] Works at all breakpoints (mobile, tablet, desktop)

Source: `src/templates/components/`, `scripts/generate-manifest.js`

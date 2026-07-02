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

---

## Adding a New Product Type

Product-type option UI (configurable, grouped, bundle, downloadable, giftcard,
custom-options) is not a slot variant — it lives in the shared
`product-options/` module. Adding a new product type is a four-file change.

### Step 1: Add the type-specific fields to `types.ts`

Extend the `Product` interface with any fields the API returns for the new
type. Example for a hypothetical `subscription` type:

```ts
// src/types.ts
subscriptionInterval?: 'weekly' | 'monthly' | 'quarterly' | null;
subscriptionMinCommitment?: number | null;
```

### Step 2: Create the option component

```
src/templates/components/product-options/SubscriptionOptions.tsx
```

Render form controls using **DaisyUI classes** (matches every other option
component) and wire the JS contract with `data-<type>-field="..."` attributes:

```tsx
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export const SubscriptionOptions: FC<OptionsProps> = ({ product }) => {
  return (
    <div class="flex flex-col gap-3">
      <label class="text-sm font-medium mb-1 block">
        Delivery frequency <span class="text-error ml-0.5">*</span>
      </label>
      <select
        class="select select-sm w-full"
        required
        data-subscription-field="interval"
      >
        <option value="">Choose…</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
      </select>
    </div>
  );
};
```

### Step 3: Register with the dispatcher

Add one line to `product-options/index.tsx`:

```tsx
import { SubscriptionOptions } from './SubscriptionOptions';

// inside <ProductOptions>:
{product.type === 'subscription' && <SubscriptionOptions {...props} />}
```

Every layout (`Product.tsx`, `LayoutMasonry.tsx`, `InfoPanelCompact.tsx`) already
renders `<ProductOptions>` — no per-layout changes needed.

### Step 4: Extract the payload in the controller

Add a per-type builder to `product-controller.js` and register it in the
`builders` table inside `add()`:

```js
_buildSubscriptionBody(body) {
  body.sku = this.skuValue;
  const interval = this.element.querySelector('[data-subscription-field="interval"]')?.value;
  if (!interval) throw new Error('Please select a delivery frequency');
  body.subscriptionInterval = interval;  // camelCase — see product controller docs
}

// then in add():
const builders = {
  // ...
  subscription: () => this._buildSubscriptionBody(body),
};
```

The camelCase field name has to match the backend API-Platform DTO field
(`Mage_Checkout_Api_CartProcessor::addItemToCart`). Snake_case fields are
silently dropped by the DTO validator.

### Step 5: Add a listing-stub refetch

If the new type has child arrays (like `groupedProducts`, `bundleOptions`)
that the category-listing endpoint drops, extend the `isListingStub` guard in
`src/routes/url-resolver.tsx` so the URL resolver refetches full detail:

```ts
|| (kvProduct.type === 'subscription' && !kvProduct.subscriptionInterval)
```

Skip this step for types whose full data already comes back in the listing
response (e.g. simple products with just custom options).

### Product-type checklist

- [ ] `types.ts` extended with the new type's fields
- [ ] `<Type>Options.tsx` created with DaisyUI classes
- [ ] Case added to `product-options/index.tsx`
- [ ] `_build<Type>Body` method + `builders` table entry in `product-controller.js`
- [ ] `isListingStub` extended in `url-resolver.tsx` (if the type has child arrays)
- [ ] Backend DTO (`Cart.php` mutation args + `CartProcessor.php` forwarding) also updated in the mahocommerce/maho repo
- [ ] Tested add-to-cart on `demo.mageaustralia.com.au` for the new type

Source: `src/templates/components/product-options/`,
`src/js/controllers/product-controller.js`,
`src/routes/url-resolver.tsx`

# Product Controller

The product controller manages the product detail page — variant selection, gallery interaction, pricing updates, and add-to-cart functionality.

**Source:** `src/js/controllers/product-controller.js` (~800 lines)

## Targets

| Target | Element | Purpose |
|--------|---------|---------|
| `price` | Price display | Updated when variant changes |
| `addButton` | Add to cart button | Disabled when out of stock |
| `qty` | Quantity input | Quantity selector |
| `gallery` | Image gallery container | Gallery image swapping |
| `mainImage` | Main product image | Updated on variant/swatch selection |
| `thumbnail` | Gallery thumbnails | Active state management |
| `sku` | SKU display | Updated on variant selection |
| `stock` | Stock indicator | In/out of stock messaging |
| `optionSelect` | Option dropdowns/swatches | Configurable product options |

## Values

| Value | Type | Description |
|-------|------|-------------|
| `variants` | String (JSON) | Configurable product variants array |
| `sku` | String | Base product SKU |
| `type` | String | Product type (simple, configurable, bundle, grouped) |
| `productId` | Number | Product entity ID |
| `mediaGallery` | String (JSON) | Gallery image URLs |

## Actions

| Action | Trigger | Behavior |
|--------|---------|----------|
| `addToCart` | Click add button | POST to cart API, open cart drawer |
| `selectOption` | Change option select/click swatch | Filter available variants, update price/image |
| `updateQty` | Click +/- or input change | Update quantity value |
| `selectThumbnail` | Click thumbnail | Switch main gallery image |
| `zoomImage` | Click main image | Open full-size image overlay |

## Variant Selection Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Controller
    participant D as DOM
    participant API as Cart API

    U->>C: Select color "Red"
    C->>C: Filter variants matching color=Red
    C->>C: Find matching variant (size + color)
    C->>D: Update price display
    C->>D: Update main image
    C->>D: Update stock status
    C->>D: Update SKU display
    C->>D: Enable/disable add button

    U->>C: Click "Add to Cart"
    C->>API: POST /api/cart/items
    API-->>C: Cart response
    C->>D: Update cart badge
    C->>D: Open cart drawer
```

## Configurable Product Handling

For configurable products, the controller:

1. Parses the `variants` value (JSON array of all variant combinations)
2. On each option change, filters to find the matching variant
3. Updates price (variant may have a different price than the parent)
4. Swaps the gallery image if the variant has a unique image
5. Checks stock quantity for the selected variant

```javascript
// Variant data structure
{
  id: 123,
  sku: "PROD-RED-M",
  price: 49.95,
  finalPrice: 39.95,
  stockQty: 5,
  attributes: { color: "Red", size: "M" },
  imageUrl: "/media/catalog/product/red-variant.jpg"
}
```

## Gallery Interaction

- **Thumbnail click** → swaps main image with smooth transition
- **Main image click** → opens zoom overlay (pinch-zoom on mobile)
- **Variant selection** → auto-scrolls to the variant's image in the gallery
- **Keyboard navigation** → arrow keys cycle through gallery images

## Add to Cart

The add-to-cart flow:

1. Validates all required options are selected
2. Ensures quantity > 0 and within stock limits
3. POSTs to the Maho API via `api.post('/cart/items', { sku, qty, options })`
4. On success: dispatches `cart:updated` custom event, opens cart drawer
5. On error: displays inline error message

Source: `src/js/controllers/product-controller.js`

# Homepage Components

Components for the homepage - hero banners, promotional grids, featured products, and marketing sections.

![Homepage - header, navigation bar, and hero banner](/screenshots/homepage.png)

## Component Slots

| Slot | Description |
|------|-------------|
| `hero` | Full-width hero banner/carousel |
| `promo-grid` | Grid of promotional tiles |
| `promo-banner` | Full-width promotional banner |
| `featured-products` | Curated product carousel |
| `icon-features` | Feature icons (free shipping, returns, etc.) |
| `countdown-timer` | Sale countdown timer |
| `shop-by-category` | Visual category navigation grid |
| `brand-logo-strip` | Brand logo carousel/strip |
| `collection-spotlight` | Featured collection with image + products |
| `promo-strip` | Thin promotional strip (site-wide announcement) |

## Hero Banner

The hero section typically features:
- Full-width image or carousel
- Overlay text with heading and CTA button
- Mobile-optimized image sizing
- Swipe support on mobile (via `home-carousel-controller.js`)

### Carousel Features

- Auto-advance with configurable interval
- Pause on hover/focus
- Dot indicators
- Mobile swipe gestures
- Keyboard arrow key navigation

## Featured Products

Horizontal scrolling product carousel showing curated products:
- Uses the same `ProductCard` component (variant from `page.json`)
- Swipeable on mobile
- Arrow buttons on desktop
- Typically shows 4-6 products

## Icon Features

Trust-building icons strip, usually below the hero:

```
┌──────────┬──────────┬──────────┬──────────┐
│ 🚚       │ 🔄       │ 🔒       │ 💬       │
│ Free      │ Easy     │ Secure   │ 24/7     │
│ Shipping  │ Returns  │ Payment  │ Support  │
└──────────┴──────────┴──────────┴──────────┘
```

## Shop by Category

Visual grid of top-level categories with images:
- Category images from Maho admin
- Hover effect with category name overlay
- Links directly to category pages

## Promo Grid

Flexible grid of promotional tiles:
- Configurable columns (2, 3, or 4)
- Each tile: image + overlay text + link
- CMS block-driven content (editable in admin)

## Configuration

Homepage component selection via `page.json`:

```json
{
  "pages": {
    "homepage": {
      "components": {
        "hero": "carousel",
        "featured-products": "carousel"
      },
      "sections": {
        "showIconFeatures": true,
        "showBrandStrip": true,
        "showShopByCategory": true
      }
    }
  }
}
```

Source: `src/templates/components/homepage/`, `src/templates/Home.tsx`

# Navigation Components

Header and footer components with multiple layout variants.

| Desktop Header | Mobile Header |
|:--:|:--:|
| ![Desktop header with nav links](/screenshots/homepage.png) | ![Mobile header with hamburger menu](/screenshots/homepage-mobile.png) |

## Header Variants

| Variant | Description |
|---------|-------------|
| `sticky` | Fixed header that stays visible on scroll. Logo left, nav center, cart/account right. |
| `centered` | Centered logo with navigation below. |
| `minimal` | Compact single-line header. |
| `mega` | Full-width mega menu with category dropdowns. |
| `split` | Logo centered, nav split left/right. |

### HeaderSticky (Default)

```
┌────────────────────────────────────────────┐
│ [Logo]    [Nav Links]    [Search] [Cart] [Account] │
└────────────────────────────────────────────┘
```

- Stays fixed to top of viewport on scroll
- Condensed mode when scrolled (reduced height)
- Mobile: hamburger menu replaces nav links
- Cart badge shows item count
- Search icon opens search overlay

### Configuration

```json
{
  "pages": {
    "header": {
      "variant": "sticky"
    }
  }
}
```

## Footer Variants

| Variant | Description |
|---------|-------------|
| `standard` | Simple footer with links and copyright. |
| `mega` | Multi-column footer with link groups, newsletter signup, social icons. |
| `minimal` | Single-line copyright footer. |
| `centered` | Centered layout with stacked sections. |

### FooterStandard (Default)

```
┌──────────────────────────────────────────────┐
│ [About]     [Help]      [Policies]  [Follow]  │
│  About Us    FAQ         Shipping    Facebook  │
│  Contact     Returns     Privacy     Instagram │
│  Blog        Size Guide  Terms       Twitter   │
├──────────────────────────────────────────────┤
│ © 2026 Store Name. All rights reserved.       │
└──────────────────────────────────────────────┘
```

### Configuration

```json
{
  "pages": {
    "footer": {
      "variant": "standard"
    }
  }
}
```

## Mobile Navigation

The `mobile-drawer` component provides a slide-out navigation drawer for mobile devices:

- Triggered by hamburger menu in header
- Full category tree with expandable subcategories
- Account links (login/register or account dashboard)
- Search bar at top
- Close button or swipe-to-dismiss

### Controller

The `mobile-menu-controller.js` handles:
- Open/close animation
- Body scroll lock when open
- Backdrop click to close
- Escape key to close

## Breadcrumb

Category breadcrumb trail showing the navigation path:

```
Home > Women > Tops > Tori Tank
```

- Links to each parent category
- Current page shown as plain text (not linked)
- Schema.org breadcrumb markup for SEO

Source: `src/templates/components/navigation/`

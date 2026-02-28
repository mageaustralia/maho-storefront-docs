# Cart & Checkout Components

Components for the shopping cart and checkout flow.

## Cart Components

| Slot | Description |
|------|-------------|
| `drawer` | Slide-out mini cart panel |
| `line-item` | Individual cart item display |
| `summary` | Cart totals summary |
| `coupon-field` | Coupon code input |
| `progress-bar` | Free shipping progress indicator |

### Cart Drawer (DrawerSlide)

The default cart interaction — a slide-out panel from the right side:

```
┌───────────────────────────┐
│ Shopping Cart (3)     [×] │
├───────────────────────────┤
│ ┌─────┐ Product Name      │
│ │ img │ Size: M            │
│ └─────┘ $49.95   [- 1 +]  │
│                    [🗑]    │
├───────────────────────────┤
│ ┌─────┐ Another Product   │
│ │ img │ Color: Red         │
│ └─────┘ $29.95   [- 2 +]  │
├───────────────────────────┤
│ Subtotal          $129.85  │
│ [View Cart]                │
│ [Checkout]                 │
└───────────────────────────┘
```

- Opens automatically when item is added to cart
- Updates in real-time via `cart:updated` events
- Backdrop click or X button to close
- CSS transform animation

### Line Item

Each cart item shows:
- Product thumbnail image
- Product name (linked to product page)
- Selected options (size, color, etc.)
- Unit price
- Quantity stepper (+/-)
- Remove button
- Row total

### Cart Summary

Totals breakdown:
- Subtotal
- Discount (if coupon applied)
- Shipping estimate
- Tax
- Grand total

## Checkout Components

| Slot | Description |
|------|-------------|
| `address-form` | Shipping/billing address form |
| `order-summary` | Checkout order summary sidebar |
| `payment-block` | Payment method selection + form |
| `step-indicator` | Checkout step progress indicator |
| `trust-badges` | Security/trust badge display |

### Step Indicator

Visual progress through checkout:

```
(1) Shipping ─── (2) Payment ─── (3) Review
    ●               ○               ○
```

- Active step is highlighted
- Completed steps are clickable (go back)
- Step labels below icons

### Address Form

Standard address form with:
- First/last name
- Street address (2 lines)
- City, state/region, postcode
- Country (dropdown with region auto-populate)
- Phone and email
- "Same as shipping" checkbox for billing

### Payment Block

Payment method selection and hosted payment fields:
- Radio buttons for available methods
- Braintree hosted fields (card number, expiry, CVV)
- PayPal button
- Payment method icons

### Order Summary

Persistent sidebar showing:
- Cart items with thumbnails
- Applied coupons/discounts
- Shipping method and cost
- Tax breakdown
- Grand total
- Edit cart link

Source: `src/templates/components/cart/`, `src/templates/components/checkout/`

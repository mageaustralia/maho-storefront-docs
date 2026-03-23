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

The default cart interaction - a slide-out panel from the right side:

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

## Checkout Layout

The checkout layout is a **variant** -- each store can choose between different checkout flows via `page.json`.

### Configuration

```json
{
  "checkout": {
    "components": {
      "layout": "single-page"
    }
  }
}
```

### Available Variants

| Variant | Description |
|---------|-------------|
| `single-page` | All sections visible on one scrollable page. No "Continue to..." buttons. Shipping methods load when address is filled, payment loads when shipping is selected. Recommended for higher conversion. |
| `multi-step` | Accordion-style 3-step flow: (1) Address → (2) Shipping → (3) Payment. Each step must be completed before the next opens. Traditional Magento-style. |

### Single-Page Layout (default)

```
┌─ Guest Login / Social Login ────────────┐  ┌─ Order Summary ──────┐
├─ Contact (Email / Stripe Link) ─────────┤  │ Item 1        $28.00 │
├─ Shipping Address ──────────────────────┤  │ Item 2         $5.00 │
│  Name, Street, City, State, Zip, Phone  │  ├──────────────────────┤
│  [Google Maps autocomplete]             │  │ Subtotal       $33.00│
├─ Shipping Method ───────────────────────┤  │ Shipping        $5.00│
│  ○ Standard ($5.00)  (auto-selected)    │  │ Tax             $0.00│
├─ Payment ───────────────────────────────┤  │ Total          $38.00│
│  Card fields / Google Pay / Apple Pay   │  └──────────────────────┘
│  [x] Billing same as shipping           │
├─ Promo Codes ───────────────────────────┤
│  Coupon | Gift Card                     │
├─ Save Info + Place Order ───────────────┤
│  [ ] Save my info for faster checkout   │
│  [        Place Order        ]          │
└─────────────────────────────────────────┘
```

Key features:
- Shipping methods auto-load when address is complete
- Payment methods auto-load when shipping is selected
- Billing address toggle (checkbox, form slides down if unchecked)
- "Save my information" checkbox for guest account creation
- No step navigation -- everything visible, fields reveal progressively
- Stripe Link Authentication Element replaces email field (if Stripe configured)
- Social login buttons in guest login section (via plugin system)

### Multi-Step Layout

```
┌─────────────────────────────────────────┐
│ (1) Shipping Address  ✓                 │
│ (2) Shipping Method   ✓                 │
│ (3) Payment           ← active          │
│     [card fields]                       │
│     [Place Order]                       │
└─────────────────────────────────────────┘
```

Key features:
- Accordion steps with checkmarks for completed steps
- "Continue to Shipping" / "Continue to Payment" buttons
- Click completed step headers to go back
- Same address form, shipping, and payment as single-page

### Shared Checkout Controller

Both variants use the same `checkout-controller.js`. The controller detects which layout is active:
- If step targets (`step1`, `body1`, etc.) exist → multi-step mode with accordion navigation
- If step targets are absent → single-page mode with auto-progression

This means the JS bundle includes one controller that works with both templates. No code duplication.

### Payment Adapter Integration

Payment methods are handled by the adapter system (`src/js/payment-methods/`). Both checkout variants use the same adapters:

- **Stripe Elements** -- inline card fields, Google Pay, Apple Pay
- **Stripe Link** -- email authentication element (single-page: `initEarly()` hook)
- **Braintree** -- hosted fields

Payment adapters are registered via `window.MahoStorefront.registerPaymentAdapter()` and loaded as standalone plugin scripts. See [Payment Methods](/PAYMENT-METHODS) for details.

## Checkout Sub-Components

| Slot | Description |
|------|-------------|
| `address-form` | Shipping/billing address form |
| `order-summary` | Checkout order summary sidebar |
| `payment-block` | Payment method selection + form |
| `step-indicator` | Checkout step progress indicator (multi-step only) |
| `trust-badges` | Security/trust badge display |

### Address Form

Standard address form with:
- First/last name
- Company (optional)
- Street address (2 lines)
- City, state/region, postcode
- Country (dropdown with region auto-populate)
- Phone
- Google Maps Places autocomplete (if configured)
- Saved address selector (for logged-in customers)

### Payment Block

Payment method selection and hosted payment fields:
- Radio buttons for available methods
- Stripe Elements card input (inline)
- Google Pay / Apple Pay via Payment Request Button
- Stripe Link for one-tap payment
- "Billing address same as shipping" toggle with slide-down form
- Payment adapter fields render inline under the selected method

### Order Summary

Persistent sidebar showing:
- Cart items with thumbnails
- Applied coupons/discounts
- Gift card balances
- Shipping method and cost
- Tax breakdown
- Grand total
- Promo code / gift card tabs

Source: `src/templates/Checkout.tsx`, `src/templates/components/checkout/layout/`

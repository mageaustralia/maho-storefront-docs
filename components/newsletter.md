# Newsletter Components

The newsletter system provides 4 engagement variants for collecting email subscriptions. Each variant uses a Stimulus controller for async form submission and can be configured per-store via `page.json`.

## Variants

| Variant | Controller | Description |
|---------|-----------|-------------|
| `inline` | `newsletter` | Horizontal form embedded in the footer. Default - no overlay, no popup. |
| `popup` | `newsletter-popup` | Centered modal dialog. Appears after a configurable delay. Pins to bottom as a sheet on mobile. |
| `popup-image` | `newsletter-popup` | Split-layout modal with image on the left and form on the right. Image hidden on mobile. |
| `flyout` | `newsletter-flyout` | Small floating card that slides in from the bottom-right corner. Full-width bottom panel on mobile. |

## Configuration

Set the newsletter variant in your store's `page.json`:

```json
{
  "pages": {
    "engagement": {
      "components": {
        "newsletter": "popup"
      }
    }
  }
}
```

Valid values: `"inline"` (default), `"popup"`, `"popup-image"`, `"flyout"`.

The `inline` variant is always rendered in the footer. When `popup`, `popup-image`, or `flyout` is configured, the overlay component is rendered in `Layout.tsx` before `</body>`.

## Inline

The inline form lives inside the footer components (`FooterStandard`, `FooterMega`, `Footer`). It uses the `newsletter` controller with targets: `email`, `form`, `submit`, `success`, `error`.

No configuration needed - it's the default behaviour when no `engagement.newsletter` key is present in `page.json`.

## Popup

A DaisyUI `<dialog>` modal that auto-shows after a delay (default 5000ms).

```html
<dialog data-controller="newsletter-popup"
        data-newsletter-popup-delay-value="5000">
```

**Behaviour:**
- Checks `localStorage('newsletter_dismissed')` - if set, does not show
- After the delay, calls `element.showModal()`
- Closing the modal (X button, backdrop click, or ESC) sets the localStorage flag
- After successful subscription, auto-closes after 2 seconds

**Mobile:** Uses `modal-bottom` class to pin to the bottom of the screen as a sheet, complying with Google's interstitial guidelines.

## Popup with Image

Same controller as `popup`, but with a split layout:

- **Desktop:** Image occupies ~45% of the left side, form on the right
- **Mobile:** Image hidden, renders as a bottom sheet identical to the regular popup

The image is configurable via the component prop:

```tsx
<NewsletterPopupImage image="/media/my-promo-image.jpg" />
```

Default: Unsplash placeholder image. Replace with your own product/lifestyle imagery.

## Flyout

A fixed-position card that slides in from the bottom-right after 3 seconds.

**Behaviour:**
- Checks `localStorage('newsletter_dismissed')` - if set, removes element from DOM
- After 3 seconds, removes `translate-y-[120%]` class to slide the card in
- Dismiss button slides it back out and sets localStorage flag
- After successful subscription, auto-dismisses after 2 seconds

**Mobile:** Full-width bottom panel (no side margins), minimum height 150px, flush to screen bottom.

## Google Interstitial Compliance

The newsletter components are designed to comply with Google's interstitial guidelines:

- **Popup/popup-image:** On mobile (`< 768px`), renders as a `modal-bottom` sheet rather than a centered full-screen overlay
- **Flyout:** Compact card in the corner (desktop) or full-width bottom panel (mobile) - always under 30% of viewport height
- **Inline:** No overlay, no compliance concerns

## Cart/Checkout Suppression

The popup and flyout controllers check `window.location.pathname` on connect and do **not** show on:

- `/cart` and `/cart/*`
- `/checkout` and `/checkout/*`

This prevents newsletter interruptions during the purchase flow.

## localStorage

All overlay variants share a single localStorage key:

| Key | Value | Effect |
|-----|-------|--------|
| `newsletter_dismissed` | `"1"` | Prevents popup/flyout from showing again |

To re-test newsletter popups during development, clear this key:

```javascript
localStorage.removeItem('newsletter_dismissed');
```

## API

All variants POST to the same endpoint:

```
POST /api/newsletter/subscribe
Content-Type: application/ld+json

{ "email": "user@example.com" }
```

This is proxied through the Worker to the Maho backend - no CORS or authentication configuration needed on the client side.

## Files

| File | Purpose |
|------|---------|
| `src/templates/components/engagement/newsletter/NewsletterInline.tsx` | Inline form component |
| `src/templates/components/engagement/newsletter/NewsletterPopup.tsx` | Modal popup component |
| `src/templates/components/engagement/newsletter/NewsletterPopupImage.tsx` | Split image+form popup |
| `src/templates/components/engagement/newsletter/NewsletterFlyout.tsx` | Slide-in flyout component |
| `src/js/controllers/newsletter-controller.js` | Inline form controller |
| `src/js/controllers/newsletter-popup-controller.js` | Popup/popup-image controller |
| `src/js/controllers/newsletter-flyout-controller.js` | Flyout controller |
| `src/templates/Layout.tsx` | Renders popup/flyout based on page.json |

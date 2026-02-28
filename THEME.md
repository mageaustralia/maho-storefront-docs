# Theme System

The Maho Storefront uses a JSON-based theming system that generates CSS variables. This makes it easy for both humans and AI to create consistent, professional themes.

## Quick Start

1. Edit `theme.json` in the project root
2. Run `bun run build:css` to regenerate CSS
3. Deploy with `./deploy.sh`

## theme.json Structure

```json
{
  "name": "My Theme",
  "description": "A brief description of the theme",
  "colors": { ... },
  "fonts": { ... },
  "typography": { ... },
  "spacing": { ... },
  "radii": { ... },
  "shadows": { ... },
  "transitions": { ... },
  "layout": { ... },
  "components": { ... }
}
```

## Color Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `primary` | Main brand color (headers, text) | `#111111` |
| `primaryLight` | Lighter variant of primary | `#1a1a1a` |
| `accent` | Call-to-action, links, buttons | `#ff2d87` |
| `accentHover` | Accent hover state | `#e6006e` |
| `accentLight` | Light accent background | `#fff0f6` |
| `success` | Success states | `#10b981` |
| `successBg` | Success background | `#ecfdf5` |
| `error` | Error states | `#ef4444` |
| `errorBg` | Error background | `#fef2f2` |
| `sale` | Sale badges/prices | `#ef4444` |
| `outOfStock` | Out of stock indicators | `#9ca3af` |
| `text` | Primary text color | `#111111` |
| `textSecondary` | Secondary text | `#525252` |
| `textMuted` | Muted/helper text | `#9ca3af` |
| `border` | Standard borders | `#e5e5e5` |
| `borderLight` | Subtle borders | `#f5f5f5` |
| `bg` | Page background | `#ffffff` |
| `bgSubtle` | Subtle background | `#fafafa` |
| `bgMuted` | Muted sections | `#f5f5f5` |
| `bgOverlay` | Modal overlays | `rgba(0,0,0,0.04)` |

## Font Tokens

| Token | Description |
|-------|-------------|
| `sans` | Primary font stack |
| `mono` | Monospace font (prices, codes) |
| `heading` | Heading font (can match sans) |
| `googleFontsImport` | Google Fonts URL |

Example:
```json
"fonts": {
  "sans": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  "mono": "ui-monospace, SFMono-Regular, monospace",
  "heading": "'Playfair Display', Georgia, serif",
  "googleFontsImport": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
}
```

## Typography

| Token | Description | Example |
|-------|-------------|---------|
| `baseFontSize` | Body text size | `15px` |
| `baseLineHeight` | Body line height | `1.6` |
| `h1Size` | H1 heading size | `2.25rem` |
| `h2Size` | H2 heading size | `1.625rem` |
| `h3Size` | H3 heading size | `1.25rem` |
| `letterSpacing` | Default letter spacing | `-0.01em` |
| `headingWeight` | Heading font weight | `700` |
| `bodyWeight` | Body font weight | `400` |

## Spacing

| Token | Description |
|-------|-------------|
| `headerHeight` | Fixed header height |
| `contentMax` | Max content width |
| `contentPadding` | Content side padding |

## Border Radii

Semantic radius scale:
- `sm` - Small elements (badges, chips)
- `md` - Cards, panels
- `lg` - Inputs, larger cards
- `xl` - Buttons (pill style), modals

## Shadows

Elevation scale:
- `xs` - Subtle elevation
- `sm` - Cards at rest
- `md` - Cards on hover
- `lg` - Dropdowns, popovers
- `xl` - Modals, drawers

## Component Tokens

### Buttons
```json
"buttons": {
  "borderRadius": "xl",      // References radii.xl
  "textTransform": "none",   // or "uppercase"
  "fontWeight": 600,
  "padding": "12px 28px"
}
```

### Cards
```json
"cards": {
  "borderRadius": "md",      // References radii.md
  "shadow": "none",          // or "sm", "md", etc.
  "hoverShadow": "md",
  "border": false            // Show border?
}
```

### Badges
```json
"badges": {
  "borderRadius": "sm",
  "textTransform": "uppercase",
  "fontSize": "0.7rem",
  "fontWeight": 700
}
```

### Inputs
```json
"inputs": {
  "borderRadius": "lg",
  "borderColor": "border",   // References colors.border
  "focusRing": "accent"      // References colors.accent
}
```

## CSS Architecture

```
src/css/
├── _variables.css     # Generated from theme.json (DO NOT EDIT)
├── _reset.css         # CSS reset and base styles
├── _base.css          # Base HTML element styles
├── header.css         # Site header
├── navigation.css     # Nav menus, breadcrumbs, mobile menu
├── footer.css         # Site footer
├── home.css           # Homepage components
├── product-grid.css   # Product listings
├── product.css        # Product detail page
├── category.css       # Category page
├── cart.css           # Cart page and drawer
├── checkout.css       # Checkout flow
├── account.css        # Account/auth pages
├── search.css         # Search overlay
├── cms.css            # CMS pages, blog
├── utilities.css      # Helper classes, animations
└── responsive.css     # Media queries
```

## Build Commands

```bash
# Generate CSS from theme.json + components
bun run build:css

# Build everything (CSS + JS)
bun run build

# One-time: split monolithic CSS into components
bun run split-css
```

## Creating a New Theme

### From Scratch

1. Copy `theme.json` to `theme.yourname.json`
2. Edit all color, font, and component values
3. Replace `theme.json` with your version
4. Run `bun run build:css`
5. Test with `bun run dev`

### Theme Presets

Some example themes to start from:

**Minimal (Light)**
```json
{
  "colors": {
    "primary": "#000000",
    "accent": "#000000",
    "bg": "#ffffff"
  },
  "components": {
    "buttons": { "borderRadius": "sm" },
    "cards": { "shadow": "none", "border": true }
  }
}
```

**Bold Fashion**
```json
{
  "colors": {
    "primary": "#111111",
    "accent": "#ff2d87"
  },
  "fonts": {
    "heading": "'Bebas Neue', sans-serif"
  },
  "components": {
    "buttons": { "borderRadius": "xl", "textTransform": "uppercase" }
  }
}
```

**Luxury**
```json
{
  "colors": {
    "primary": "#1a1a1a",
    "accent": "#c9a962"
  },
  "fonts": {
    "heading": "'Playfair Display', serif"
  },
  "typography": {
    "letterSpacing": "0.05em"
  }
}
```

## Using CSS Variables

In component CSS files, always reference variables:

```css
/* Good */
.my-component {
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base);
}

.my-component:hover {
  box-shadow: var(--shadow-md);
}

/* Bad - hardcoded values */
.my-component {
  background: #fafafa;
  border-radius: 12px;
}
```

## Tips for AI Theme Generation

When asking an AI to create a theme:

1. **Describe the vibe**: "Modern minimalist with warm accents"
2. **Reference brands**: "Similar to Everlane's clean aesthetic"
3. **Specify constraints**: "Must have high contrast for accessibility"
4. **Mention target audience**: "Fashion-forward 25-35 year olds"

The AI can then generate a complete `theme.json` that you can drop in and build.

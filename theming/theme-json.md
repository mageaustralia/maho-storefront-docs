# theme.json Reference

The `theme.json` file defines all design tokens for a theme. Each token maps to a CSS custom property used throughout the storefront.

## Structure

```json
{
  "colors": { ... },
  "fonts": { ... },
  "typography": { ... },
  "space": { ... },
  "breakpoints": { ... },
  "sizes": { ... },
  "radii": { ... },
  "shadows": { ... },
  "transitions": { ... },
  "components": { ... }
}
```

## Colors

Semantic color tokens used by both DaisyUI and custom components.

| Token | Default | CSS Variable | Usage |
|-------|---------|-------------|-------|
| `primary` | `#111111` | `--color-primary` | Primary brand color |
| `accent` | `#ff2d87` | `--color-accent` | Accent / CTA color |
| `success` | `#10b981` | `--color-success` | Success states |
| `warning` | `#f59e0b` | `--color-warning` | Warning states |
| `error` | `#ef4444` | `--color-error` | Error states |
| `info` | `#3b82f6` | `--color-info` | Informational states |
| `text` | `#111111` | `--color-text` | Primary text |
| `textSecondary` | `#6b7280` | `--color-text-secondary` | Secondary text |
| `textMuted` | `#9ca3af` | `--color-text-muted` | Muted/disabled text |
| `bg` | `#ffffff` | `--color-bg` | Page background |
| `bgSubtle` | `#f9fafb` | `--color-bg-subtle` | Subtle background |
| `bgMuted` | `#f3f4f6` | `--color-bg-muted` | Muted background |
| `border` | `#e5e7eb` | `--color-border` | Default borders |
| `borderLight` | `#f3f4f6` | `--color-border-light` | Light borders |
| `overlay` | `rgba(0,0,0,0.5)` | `--color-overlay` | Modal/drawer overlays |

### DaisyUI Color Mapping

Theme colors are mapped to DaisyUI's token system in `uno.config.ts`:

| theme.json | DaisyUI Variable | DaisyUI Class |
|-----------|------------------|---------------|
| `accent` | `--color-primary` | `btn-primary`, `bg-primary` |
| `primary` | `--color-secondary` | `btn-secondary`, `bg-secondary` |
| `success` | `--color-success` | `btn-success`, `badge-success` |
| `error` | `--color-error` | `btn-error`, `alert-error` |

::: tip
The `accent` color maps to DaisyUI's `primary` (the main CTA color), while the theme's `primary` maps to DaisyUI's `secondary`. This mapping ensures the most visually prominent UI elements use the accent color.
:::

## Fonts

| Token | Default | CSS Variable |
|-------|---------|-------------|
| `sans` | `Sora, system-ui, sans-serif` | `--font-sans` |
| `heading` | `Sora` | `--font-heading` |
| `mono` | `SF Mono, monospace` | `--font-mono` |
| `googleFontsImport` | `Sora:wght@400;500;600;700;800` | N/A (generates `@import`) |

## Typography

| Token | Default | CSS Variable |
|-------|---------|-------------|
| `baseFontSize` | `15px` | `--text-base-size` |
| `baseLineHeight` | `1.6` | `--text-base-leading` |
| `h1Size` | `2.25rem` | `--text-h1` |
| `h2Size` | `1.75rem` | `--text-h2` |
| `h3Size` | `1.375rem` | `--text-h3` |
| `h4Size` | `1.125rem` | `--text-h4` |
| `letterSpacing` | `-0.01em` | `--tracking` |
| `headingWeight` | `700` | `--font-weight-heading` |
| `bodyWeight` | `400` | `--font-weight-body` |

## Space Scale

The space scale follows a 4px base unit. All values map to `--space-{key}` CSS variables.

| Token | Value | Example Usage |
|-------|-------|--------------|
| `0` | `0` | `p-0` |
| `px` | `1px` | `border-px` |
| `0.5` | `2px` | `gap-0.5` |
| `1` | `4px` | `p-1` |
| `2` | `8px` | `m-2` |
| `3` | `12px` | `p-3` |
| `4` | `16px` | `gap-4` |
| `6` | `24px` | `p-6` |
| `8` | `32px` | `m-8` |
| `12` | `48px` | `py-12` |
| `16` | `64px` | `mt-16` |
| `24` | `96px` | `mb-24` |

## Sizes

| Token | Default | CSS Variable |
|-------|---------|-------------|
| `headerHeight` | `60px` | `--header-height` |
| `headerHeightMobile` | `56px` | `--header-height-mobile` |
| `contentMax` | `1320px` | `--content-max` |
| `contentPadding` | `20px` | `--content-padding` |
| `inputHeight` | `44px` | `--input-height` |
| `buttonHeight` | `44px` | `--button-height` |
| `drawerWidth` | `380px` | `--drawer-width` |
| `sidebarWidth` | `240px` | `--sidebar-width` |

## Radii

| Token | Default | CSS Variable |
|-------|---------|-------------|
| `xs` | `4px` | `--radius-xs` |
| `sm` | `6px` | `--radius-sm` |
| `md` | `8px` | `--radius-md` |
| `lg` | `12px` | `--radius-lg` |
| `xl` | `16px` | `--radius-xl` |
| `2xl` | `24px` | `--radius-2xl` |
| `full` | `9999px` | `--radius-full` |

## Shadows

| Token | Default | CSS Variable |
|-------|---------|-------------|
| `xs` | `0 1px 2px rgba(0,0,0,0.05)` | `--shadow-xs` |
| `sm` | `0 2px 4px rgba(0,0,0,0.06)` | `--shadow-sm` |
| `md` | `0 4px 12px rgba(0,0,0,0.08)` | `--shadow-md` |
| `lg` | `0 8px 24px rgba(0,0,0,0.12)` | `--shadow-lg` |
| `xl` | `0 16px 48px rgba(0,0,0,0.16)` | `--shadow-xl` |

## Transitions

| Token | Default | CSS Variable |
|-------|---------|-------------|
| `fast` | `120ms` | `--transition-fast` |
| `base` | `180ms` | `--transition-base` |
| `slow` | `280ms` | `--transition-slow` |

## Components

Override default radii and styles for specific component types:

```json
{
  "components": {
    "buttons": {
      "borderRadius": "xl",
      "textTransform": "none",
      "padding": "12px 28px"
    },
    "cards": {
      "borderRadius": "md",
      "shadow": "none",
      "hoverShadow": "md"
    },
    "badges": {
      "borderRadius": "sm",
      "textTransform": "uppercase"
    },
    "inputs": {
      "borderRadius": "sm"
    }
  }
}
```

Source: `theme.json`

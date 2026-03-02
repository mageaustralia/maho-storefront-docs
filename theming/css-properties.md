# CSS Custom Properties

At build time, `uno.config.ts` transforms `theme.json` tokens into CSS custom properties on `:root` (default theme) and `[data-theme]` selectors (store themes).

## Generated Properties

### Colors

```css
:root {
  --color-primary: #111111;
  --color-accent: #ff2d87;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  --color-text: #111111;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  --color-bg: #ffffff;
  --color-bg-subtle: #f9fafb;
  --color-bg-muted: #f3f4f6;
  --color-border: #e5e7eb;
  --color-border-light: #f3f4f6;
  --color-overlay: rgba(0, 0, 0, 0.5);
}
```

### Typography

```css
:root {
  --font-sans: Sora, system-ui, sans-serif;
  --font-heading: Sora;
  --font-mono: SF Mono, monospace;
  --text-base-size: 15px;
  --text-base-leading: 1.6;
  --text-h1: 2.25rem;
  --text-h2: 1.75rem;
  --text-h3: 1.375rem;
  --text-h4: 1.125rem;
  --tracking: -0.01em;
  --font-weight-heading: 700;
  --font-weight-body: 400;
}
```

### Spacing

```css
:root {
  --space-0: 0;
  --space-px: 1px;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

### Sizes

```css
:root {
  --header-height: 60px;
  --header-height-mobile: 56px;
  --content-max: 1320px;
  --content-padding: 20px;
  --input-height: 44px;
  --button-height: 44px;
  --drawer-width: 380px;
  --sidebar-width: 240px;
}
```

### Radii

```css
:root {
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);
}
```

### Transitions

```css
:root {
  --transition-fast: 120ms;
  --transition-base: 180ms;
  --transition-slow: 280ms;
}
```

## Using Properties in Components

```css
/* Use in custom CSS */
.my-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base);
}

.my-card:hover {
  box-shadow: var(--shadow-md);
}
```

```html
<!-- Or use UnoCSS utilities that map to the same tokens -->
<div class="bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md">
  ...
</div>
```

## Multi-Theme Override

Store themes override the same properties under `[data-theme]`:

```css
[data-theme="tech"] {
  --color-primary: #0a0a0a;
  --color-accent: #00d4ff;
  --font-sans: Roboto, sans-serif;
  --radius-md: 4px;
}
```

All components using these properties automatically adopt the new theme values - no per-component changes needed.

Source: `uno.config.ts`

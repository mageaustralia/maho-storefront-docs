---
layout: home
hero:
  name: Maho Storefront
  text: Headless Commerce on the Edge
  tagline: A high-performance, themeable storefront built on Cloudflare Workers, Hono.js, and DaisyUI v5
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: Architecture
      link: /architecture/
features:
  - icon: "⚡"
    title: Edge-First Performance
    details: Sub-100ms responses via Cloudflare Workers with three-tier caching (edge, KV, origin) and automatic freshness revalidation.
  - icon: "🎨"
    title: Themeable Design System
    details: JSON-driven theming with DaisyUI v5 + UnoCSS. Change colors, typography, spacing, and component variants per store — no CSS required.
  - icon: "🧩"
    title: Component Variants
    details: 36 component slots across 8 domains with swappable variants. Configure which card, header, footer, and gallery style each store uses via page.json.
  - icon: "🏪"
    title: Multi-Store Architecture
    details: One Worker serves multiple stores with isolated themes, configs, and catalog data — all resolved at the edge from a single deployment.
  - icon: "🔌"
    title: Hotwire (Turbo + Stimulus)
    details: SPA-like page transitions via Turbo with 19 Stimulus controllers for interactivity. No framework runtime — just declarative behavior on server-rendered HTML.
  - icon: "🔄"
    title: Real-Time Freshness
    details: Background freshness checks keep edge-cached pages up to date without sacrificing performance. New products appear within minutes.
---

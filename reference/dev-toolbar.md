# Dev Toolbar

The dev toolbar is a developer-only overlay that shows performance metrics, cache status, and quick actions. It renders as a fixed dark bar at the bottom of the page.

## Accessing the Toolbar

The toolbar is only visible to authenticated dev sessions. To log in:

1. Navigate to `/_dev/login` on your storefront
2. Enter a valid dev token
3. The toolbar appears on all pages for the duration of your session (7 days)

Dev tokens are managed via the `/_dev/tokens` endpoint and require the `DEV_SECRET` environment variable to be set in `wrangler.toml`.

## The Status Bar

The always-visible bottom bar contains:

| Section | Example | Description |
|---------|---------|-------------|
| Toggle | `▼ Dev Toolbar` | Collapse/expand the panel above |
| Store | `en · default` | Current store code and page config |
| Cache badge | `● MISS · KV 4/6` | Edge cache status + KV hit ratio (hits/total reads) |
| Timing | `18ms · API 0ms · KV 28ms` | Render time, API latency, total KV latency |
| Tabs | `Preview · API · KV · Actions` | Open detail panels |
| Logout | | End the dev session |

### Cache Badge Colours

| Badge | Meaning |
|-------|---------|
| HIT (green) | Served from Cloudflare edge cache |
| MISS (yellow) | Cache miss, rendered fresh |
| BYPASS (red) | Cache bypassed (e.g., cart page) |
| PREVIEW-BYPASS (purple) | Cache bypassed due to preview mode |

## Expanded Panel

Clicking the `▼ Dev Toolbar` toggle opens a panel above the status bar. The default view shows **Performance**:

- **Render** - total server-side render time (e.g., `18ms total`)
- **API Calls** - each backend API request with status and latency; `None` if no API calls were made
- **KV Reads** - each KV key accessed, with:
  - ✅ green checkmark = cache hit
  - ❌ red cross = cache miss
  - Latency in ms (e.g., `en:categories (5ms)`)

### Tabs

| Tab | Content |
|-----|---------|
| **Preview** | Toggle preview mode on/off. When active, edge cache is bypassed and every request renders fresh - useful for testing without clearing cache. |
| **API** | Raw JSON dump of all dev metrics for the current request. |
| **KV** | Full list of every KV key accessed, with hit/miss status and individual read latency. |
| **Actions** | Quick cache management: purge current page, purge all cache, or force a full re-sync from the backend API. |

## Configuration

### Required Environment Variable

```toml
# wrangler.toml
[vars]
DEV_SECRET = "your-secret-key"
```

If `DEV_SECRET` is not set, the entire dev toolbar system is disabled - no login route, no toolbar rendering, zero overhead for production visitors.

### Collapsible

The toolbar remembers its collapsed/expanded state in `localStorage` (`dev-toolbar-collapsed`). Click `▼ Dev Toolbar` to collapse it.

## Page Config Switching

The store context indicator (`en · default`) also works as a page config switcher. Click it to cycle through available page configs and preview different component variants without changing any files. This is session-scoped - other visitors are unaffected.

Source: `src/js/controllers/dev-toolbar-controller.js`, `src/dev-auth.ts`

# Installation

## Prerequisites

- **Maho** — a running Maho instance with the REST API enabled
- **Cloudflare account** — free tier works for development
- **Node.js 18+** or **Bun** — for building assets

## Quick Start

### 1. Install the Maho Storefront Admin Module

Install the `Mageaustralia_Storefront` module into your Maho instance:

```bash
# Via Composer (recommended)
composer require mageaustralia/storefront

# Or copy manually to app/code/local/Mageaustralia/Storefront/
```

Clear the cache after installation:

```bash
./maho cache:flush
```

### 2. Configure Cloudflare Credentials

Go to **System > Configuration > Mage Australia > Storefront** in Maho admin.

**Cloudflare Credentials** section:

| Field | Description |
|-------|-------------|
| Account ID | Your Cloudflare account ID (found on the Workers dashboard) |
| API Token / Key | API Token (recommended) or legacy Global API Key |
| API Email | Only needed if using a legacy Global API Key |
| Zone ID | The zone ID for your domain |

**API Token permissions needed:**
- Account > Workers Scripts > Edit
- Account > Workers KV Storage > Edit
- Zone > Cache Purge > Purge
- Zone > Zone > Read

**Worker Settings** section:

| Field | Description |
|-------|-------------|
| Storefront URL | Your deployed Worker URL (e.g., `https://storefront.your-domain.com`) |
| Worker Store Code | Maps this store view to a KV prefix (leave blank for default store) |
| Sync Secret | Bearer token for `/sync` endpoint authentication |
| KV Namespace ID | The Cloudflare KV namespace ID for content storage |

### 3. Clone the Storefront

```bash
git clone https://github.com/mageaustralia/maho-storefront.git
cd maho-storefront
bun install  # or: npm install
```

### 4. Configure Wrangler

Edit `wrangler.toml` (or copy from `wrangler.demo-only.toml`):

```toml
[vars]
MAHO_API_URL = "https://your-maho-instance.com"
SYNC_SECRET = "your-secret-key"

[[kv_namespaces]]
binding = "CONTENT"
id = "your-kv-namespace-id"
```

| Variable | Description |
|----------|-------------|
| `MAHO_API_URL` | Base URL of your Maho backend (no trailing slash) |
| `SYNC_SECRET` | Shared secret for the `/sync` endpoint (must match admin config) |

### 5. Build & Deploy

Using the Maho CLI (recommended — reads credentials from admin config):

```bash
./maho storefront:build --deploy
```

Or manually:

```bash
bun run build          # Build CSS + JS
bun x wrangler deploy  # Deploy to Cloudflare Workers
```

### 6. Sync Data

Populate the KV store with your catalog data:

```bash
curl -X POST https://your-storefront.com/sync \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json"
```

Or use the **Sync Now** button in Maho admin (System > Config > Storefront > Worker Settings).

## Build Options

```bash
# Build both CSS and JS
bun run build

# Build individually
bun run build:css   # UnoCSS → public/styles.css
bun run build:js    # esbuild → public/controllers.js.txt

# Generate component manifest
bun run manifest
```

### Maho CLI Build

The `storefront:build` command handles everything:

```bash
./maho storefront:build              # Build only
./maho storefront:build --deploy     # Build + deploy + purge cache
./maho storefront:build --install    # Run bun install first
./maho storefront:build --css-only   # CSS only
./maho storefront:build --js-only    # JS only
```

It auto-detects the storefront path (looks for `maho-storefront/` next to your web root), downloads Bun if needed, and reads Cloudflare credentials from admin config.

## Local Development

```bash
bun run dev
```

Starts Wrangler's local dev server at `http://localhost:8787`. Uses local KV simulation — run a sync to populate data:

```bash
curl -X POST http://localhost:8787/sync \
  -H "Authorization: Bearer your-secret-key"
```

## Admin Access

Visiting `/admin` on your storefront domain redirects to the Maho backend admin panel.

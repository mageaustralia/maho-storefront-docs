# Maho CLI — storefront:build

The Maho backend includes a CLI command that builds storefront assets using [Bun](https://bun.sh/). It auto-downloads Bun if not installed, runs CSS/JS builds, and optionally deploys to Cloudflare Workers with cache purging.

## Usage

```bash
./maho storefront:build [options]
```

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--path` | `-p` | Storefront project path (auto-detected if omitted) |
| `--css-only` | | Only build CSS |
| `--js-only` | | Only build JS |
| `--install` | `-i` | Run `bun install` before building |
| `--deploy` | `-d` | Deploy to Cloudflare Workers after build |
| `--update-bun` | | Force re-download of Bun binary |

## Examples

```bash
# Full build (CSS + JS)
./maho storefront:build

# Build and deploy
./maho storefront:build --deploy

# CSS only, with dependency install
./maho storefront:build --css-only --install

# Specify custom storefront path
./maho storefront:build --path /var/www/maho-storefront
```

## What It Does

```mermaid
flowchart TD
    CLI[./maho storefront:build] --> Bun{Bun installed?}
    Bun -->|No| Download["Download Bun<br/>from GitHub"]
    Download --> Build
    Bun -->|Yes| Build[Build CSS + JS]
    Build --> Size[Report file sizes]
    Size --> Deploy{--deploy flag?}
    Deploy -->|Yes| Wrangler[wrangler deploy]
    Wrangler --> Purge[Purge edge cache]
    Deploy -->|No| Done[Done]
    Purge --> Done
```

### 1. Bun Resolution

The command finds Bun in this order:

1. **Project-local** — `.bun/bin/bun` in the storefront directory
2. **System PATH** — globally installed `bun`
3. **Auto-download** — downloads the correct binary from GitHub (Linux/macOS, x64/arm64)

Downloaded Bun is stored at `{storefront}/.bun/bin/bun` for future use.

### 2. Build

Runs `bun run build:css` and `bun run build:js`, which execute:

| Script | Command | Output |
|--------|---------|--------|
| `build:css` | UnoCSS scan + DaisyUI + theme tokens | `public/styles.css` |
| `build:js` | esbuild bundle + minify | `public/controllers.js.txt` |

After each build, file sizes are reported in human-readable format.

### 3. Deploy (with `--deploy`)

1. Reads Cloudflare credentials from `deploy.sh` in the storefront directory
2. Runs `bun x wrangler deploy -c wrangler.demo-only.toml`
3. Purges Cloudflare edge cache for all configured demo hosts

### Storefront Path Resolution

If `--path` is not specified:

1. `STOREFRONT_PATH` environment variable
2. Auto-detect: `{maho-web-root}/../maho-storefront/`

This means on a standard Maho installation where the storefront lives next to the web root, no path configuration is needed.

## Manual Alternative

The same steps can be run directly with Bun:

```bash
cd maho-storefront

# Install dependencies
bun install

# Build assets
bun run build

# Deploy
bun run deploy

# Sync data
curl -X POST https://your-store.com/sync \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-sync-secret"}'
```

## Deploy Script

The `deploy.sh` script handles deployment to demo environments:

```bash
./deploy.sh
```

This script:
1. Runs `bun run build` (CSS + JS)
2. Deploys via `wrangler deploy --config wrangler.demo-only.toml`
3. Purges Cloudflare edge cache for all demo hostnames

Source: `lib/MahoCLI/Commands/StorefrontBuild.php`, `deploy.sh`, `package.json`

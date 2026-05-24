# Agent Readiness

Maho Storefront is built to be **read and transacted on by AI agents**, not just by humans and search-engine crawlers. The storefront publishes a set of well-known endpoints, a curated reading list, and structured signals so that any agent — Claude, ChatGPT, Perplexity, custom RAG pipelines, MCP-aware clients — can discover what the site offers and consume it efficiently.

This section documents every piece of that surface.

## Goals

| Goal | How we deliver it |
|---|---|
| **Discoverability** — agents can find our APIs without scraping HTML | `/.well-known/api-catalog` (RFC 9727), `Link: rel="api-catalog"` header on every response, `/llms.txt` curated reading list |
| **Cheap reads** — agents pay fewer tokens to understand a page | `Accept: text/markdown` content negotiation and `/index.md` / `.md` URL suffixes — clean markdown instead of full HTML/JS |
| **Crawl efficiency** — agents (and search engines) skip unchanged pages | Storefront-generated `/sitemap.xml` with `<lastmod>` populated from each entity's `updatedAt` |
| **Permission clarity** — agents know what they may do with our content | `/robots.txt` carries Content Signals (`search=yes, ai-input=yes, ai-train=no`) plus explicit per-bot rules |
| **Auth discovery** — agents can authenticate without out-of-band setup | `/.well-known/oauth-authorization-server` (RFC 8414) maps to Maho's `/api/auth/*` |
| **Transaction** — agents can search, cart, and check out without scraping | `/.well-known/mcp/server-card.json` advertises the planned MCP tool inventory. The MCP server itself ships as a sibling Worker (in progress). |

## Content posture

We publish content signals that match a **public commerce storefront**:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

| Signal | Value | Why |
|---|---|---|
| `search` | `yes` | Search engines should index us — this is a commerce site, we want to be found |
| `ai-input` | `yes` | Agents may use our content at inference time (RAG, shopping agents, answer engines). This is how customers will increasingly buy. |
| `ai-train` | `no` | We don't want our product copy used to train models. Explicit `Disallow` for CCBot and meta-externalagent reinforces this. |

The `ai-input=yes` posture is intentional. The default Cloudflare managed `robots.txt` blocks every AI bot — that's the wrong choice for an open commerce store where agent-driven shopping is a growth channel. See [Cloudflare's agent-readiness blog post](https://blog.cloudflare.com/agent-readiness/) for the broader context.

## What ships today

All six storefronts (demo, demo2, demo3, cafe, staging, pickle) serve the full surface:

| Endpoint | Status | Source |
|---|---|---|
| [`/llms.txt`](/agents/endpoints#llms-txt) | ✅ live | `src/agents/llms-txt.ts` |
| [`/robots.txt`](/agents/endpoints#robots-txt) | ✅ live (storefront-owned) | `src/agents/robots-txt.ts` |
| [`/sitemap.xml`](/agents/endpoints#sitemap-xml) | ✅ live (storefront-owned, with `<lastmod>`) | `src/agents/sitemap.ts` |
| [Markdown content negotiation](/agents/endpoints#markdown-content-negotiation) | ✅ live | `src/agents/markdown.ts` |
| [`/.well-known/api-catalog`](/agents/endpoints#well-known-api-catalog) | ✅ live | `src/agents/api-catalog.ts` |
| [`/.well-known/oauth-authorization-server`](/agents/endpoints#well-known-oauth-authorization-server) | ✅ live | `src/agents/oauth-discovery.ts` |
| [`/.well-known/mcp/server-card.json`](/agents/mcp) | ✅ live (`status: "planned"`) | `src/agents/mcp-server-card.ts` |
| [`/mcp`](/agents/mcp) | 🚧 stub (503 + structured "coming soon") | `src/agents/mcp-server-card.ts` |
| MCP server itself (sibling Worker) | 🚧 in progress | — |

The Link header on every response advertises the catalog:

```
Link: </.well-known/api-catalog>; rel="api-catalog"
```

## Next pieces

The big remaining track is the **real MCP server** — a sibling Cloudflare Worker (`maho-storefront-mcp`) that handles the streaming JSON-RPC traffic separately from the HTML render path. Phase 1 (read tools), Phase 2 (cart writes), Phase 3 (checkout) — see [MCP server](/agents/mcp) for the planned tool inventory and the design doc at `proposals/agent-readiness-next.md` for the full architecture rationale.

Other items on the broader Cloudflare checklist that we've deliberately deferred:

- **Web Bot Auth (signed-request verification)** — useful behind rate limits; not yet a fit since storefront content is public. Re-evaluate if we adopt AI Crawl Control.
- **x402 / Universal Commerce Protocol / Agentic Commerce Protocol** — standards still moving. Revisit in 3-6 months.
- **Agent Skills Index** — designed for docs sites; not applicable here.

## Source layout

```
src/agents/
├── api-catalog.ts          # RFC 9727 linkset JSON
├── llms-txt.ts             # llmstxt.org reading-list generator
├── markdown.ts             # Accept: text/markdown middleware + renderers
├── mcp-server-card.ts      # MCP discovery card + stub /mcp body
├── oauth-discovery.ts      # RFC 8414 OAuth descriptor
├── robots-txt.ts           # Content Signals + AI-bot rules
└── sitemap.ts              # KV-driven sitemap with <lastmod>
```

All seven files together are under 500 LOC. Every endpoint is a single Hono route in `src/index.tsx` that dynamic-imports its generator on demand.

## Verifying the surface

Quick smoke test against any storefront:

```bash
ORIGIN=https://demo.mageaustralia.com.au

curl -sI "$ORIGIN/" | grep -i '^link:'
curl -s "$ORIGIN/.well-known/api-catalog" | jq .
curl -s "$ORIGIN/.well-known/oauth-authorization-server" | jq .
curl -s "$ORIGIN/.well-known/mcp/server-card.json" | jq .
curl -sI "$ORIGIN/mcp"           # → 503 (planned), with Retry-After
curl -s  "$ORIGIN/llms.txt"      | head -20
curl -s  "$ORIGIN/robots.txt"
curl -s  "$ORIGIN/sitemap.xml"   | head -20
curl -sH 'Accept: text/markdown' "$ORIGIN/" | head -20
curl -s  "$ORIGIN/index.md"      | head -20
```

External score check: [isitagentready.com](https://isitagentready.com) parses the above and reports a single agent-readiness grade.

## Further reading

- [Endpoints reference](/agents/endpoints) — every URL, payload shape, and cache policy
- [MCP server](/agents/mcp) — server card, planned tool inventory, deployment plan
- Design doc in the repo: `proposals/agent-readiness-next.md`
- Cloudflare's blog post that started this: [Agent Readiness — make your site usable by AI](https://blog.cloudflare.com/agent-readiness/)

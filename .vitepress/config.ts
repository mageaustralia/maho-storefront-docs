import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const extIndexPath = fileURLToPath(new URL('../data/extensions/_index.json', import.meta.url))
const extIndex: { slug: string; title: string; link: string }[] =
  existsSync(extIndexPath) ? JSON.parse(readFileSync(extIndexPath, 'utf8')) : []

export default withMermaid(
  defineConfig({
    srcExclude: ['plans/**', 'PAYMENT-METHODS.md', 'STACK.md', 'THEME.md'],
    title: 'Mage Australia',
    description: 'Mage Australia extension manuals and Maho Storefront developer docs',
    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ],
    themeConfig: {
      logo: '/logo.svg',
      nav: [
        { text: 'Extensions', link: '/extensions/' },
        {
          text: 'Storefront',
          items: [
            { text: 'Guide', link: '/getting-started/' },
            { text: 'Architecture', link: '/architecture/' },
            { text: 'Components', link: '/components/' },
            { text: 'API', link: '/api/' },
            { text: 'Embed Widget', link: '/embed/' },
            { text: 'Agents', link: '/agents/' },
          ],
        },
      ],
      sidebar: {
        '/extensions/': [
          { text: 'Extensions', link: '/extensions/' },
          { text: 'Manuals', collapsed: false, items: extIndex.map((e) => ({ text: e.title, link: e.link })) },
        ],
        '/': [
          {
            text: 'Getting Started',
            collapsed: false,
            items: [
              { text: 'Introduction', link: '/getting-started/' },
              { text: 'Installation', link: '/getting-started/installation' },
              { text: 'Project Structure', link: '/getting-started/project-structure' },
              { text: 'Deployment', link: '/getting-started/deployment' },
            ],
          },
          {
            text: 'Architecture',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/architecture/' },
              { text: 'Request Flow', link: '/architecture/request-flow' },
              { text: 'Caching', link: '/architecture/caching' },
              { text: 'Freshness', link: '/architecture/freshness' },
              { text: 'Multi-Store', link: '/architecture/multi-store' },
              { text: 'Plugins', link: '/architecture/plugins' },
              { text: 'Analytics', link: '/architecture/analytics' },
            ],
          },
          {
            text: 'Theming',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/theming/' },
              { text: 'theme.json Reference', link: '/theming/theme-json' },
              { text: 'Creating a Theme', link: '/theming/creating-a-theme' },
              { text: 'CSS Properties', link: '/theming/css-properties' },
              { text: 'DaisyUI Integration', link: '/theming/daisyui' },
            ],
          },
          {
            text: 'Components',
            collapsed: false,
            items: [
              { text: 'Variant System', link: '/components/' },
              { text: 'page.json Reference', link: '/components/page-config' },
              { text: 'Creating a Variant', link: '/components/creating-a-variant' },
              { text: 'Product Display', link: '/components/product-display' },
              { text: 'Category', link: '/components/category' },
              { text: 'Navigation', link: '/components/navigation' },
              { text: 'Homepage', link: '/components/homepage' },
              { text: 'Cart & Checkout', link: '/components/cart-checkout' },
              { text: 'CMS', link: '/components/cms' },
            ],
          },
          {
            text: 'Controllers',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/controllers/' },
              { text: 'Product', link: '/controllers/product' },
              { text: 'Category & Filters', link: '/controllers/category-filter' },
              { text: 'Cart', link: '/controllers/cart' },
              { text: 'Checkout', link: '/controllers/checkout' },
              { text: 'Auth', link: '/controllers/auth' },
              { text: 'Search', link: '/controllers/search' },
              { text: 'Reviews', link: '/controllers/review' },
              { text: 'Freshness', link: '/controllers/freshness' },
            ],
          },
          {
            text: 'API',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/api/' },
              { text: 'Routes', link: '/api/routes' },
              { text: 'Sync', link: '/api/sync' },
              { text: 'Cache Management', link: '/api/cache-management' },
              { text: 'API Client', link: '/api/api-client' },
              { text: 'Extending Resources', link: '/api/extending-resources' },
            ],
          },
          {
            text: 'Embed Widget',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/embed/' },
            ],
          },
          {
            text: 'Agent Readiness',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/agents/' },
              { text: 'Endpoints Reference', link: '/agents/endpoints' },
              { text: 'MCP Server', link: '/agents/mcp' },
            ],
          },
          {
            text: 'Admin Module',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/admin-module/' },
            ],
          },
          {
            text: 'Build System',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/build/' },
              { text: 'UnoCSS', link: '/build/unocss' },
              { text: 'JavaScript Bundling', link: '/build/esbuild' },
              { text: 'Maho CLI', link: '/build/maho-cli' },
            ],
          },
          {
            text: 'Reference',
            collapsed: true,
            items: [
              { text: 'TypeScript Types', link: '/reference/types' },
              { text: 'Configuration', link: '/reference/configuration' },
            ],
          },
        ],
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/mageaustralia/maho-storefront' },
      ],
      search: {
        provider: 'local',
      },
      outline: {
        level: [2, 3],
      },
      editLink: {
        pattern: 'https://github.com/mageaustralia/maho-storefront/edit/main/docs/:path',
        text: 'Edit this page on GitHub',
      },
    },
    mermaid: {},
  })
)

# MahoApiClient

The `MahoApiClient` class wraps all communication with the Maho backend REST API. It's used server-side in the Worker for data fetching, sync operations, and URL resolution.

**Source:** `src/api-client.ts` (~200 lines)

## Constructor

```typescript
const client = new MahoApiClient(baseUrl: string, storeCode?: string)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `baseUrl` | string | Maho backend URL (e.g., `https://your-maho-instance.com`) |
| `storeCode` | string? | Store code for multi-store API calls |

## Methods

### Store & Config

| Method | Return Type | Description |
|--------|-------------|-------------|
| `fetchStoreConfig()` | `StoreConfig` | Store name, currency, locale, URLs |
| `fetchCountries()` | `Country[]` | Countries with available regions |

### Catalog

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `fetchCategories()` | — | `Category[]` | All active categories (auto-paginated) |
| `fetchCategory(urlKey)` | `string` | `Category \| null` | Single category by URL key |
| `fetchCategoryById(id)` | `number` | `Category` | Single category by ID |
| `fetchCategoryProducts(categoryId, page, itemsPerPage)` | `number, number, number` | `{ products, totalItems }` | Products in a category (paginated) |
| `fetchProduct(urlKey)` | `string` | `Product \| null` | Single product by URL key |
| `fetchProductById(id)` | `number` | `Product` | Single product by ID |
| `fetchAllProducts(page, itemsPerPage)` | `number, number` | `{ products, totalItems }` | All products (paginated) |
| `fetchAllProductsFull(page, itemsPerPage)` | `number, number` | `{ products, totalItems }` | All products with full detail |
| `searchProducts(query, page, itemsPerPage)` | `string, number, number` | `{ products, totalItems }` | Search products |

### CMS & Blog

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `fetchCmsPage(identifier)` | `string` | `CmsPage \| null` | CMS page by identifier |
| `fetchAllCmsPages()` | — | `CmsPage[]` | All CMS pages |
| `fetchCmsBlock(identifier)` | `string` | `{ identifier, content } \| null` | CMS block by identifier |
| `fetchBlogPosts()` | — | `BlogPost[]` | All blog posts |
| `fetchBlogPost(identifier)` | `string` | `BlogPost \| null` | Single blog post |

### URL Resolution

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `resolveUrl(path)` | `string` | `{ type, id, identifier } \| null` | Resolve URL to entity type |

## Request Headers

All requests include:

```
Accept: application/ld+json
X-Worker-Auth: maho-storefront-sync-626538104ee3e0ef
X-Store-Code: {storeCode}  (if provided)
```

## Pagination

### Single Page

```typescript
const { products, totalItems } = await client.fetchCategoryProducts(42, 1, 24);
```

### Auto-Pagination

For sync operations, `fetchAllPages()` automatically fetches all pages:

```typescript
// Internal method used by fetchCategories(), etc.
private async fetchAllPages<T>(basePath: string, itemsPerPage = 100): Promise<T[]> {
  // Fetches page 1, checks totalPages, fetches remaining pages
  // Returns flat array of all items
}
```

## Error Handling

- HTTP errors return `null` for single-entity fetches (`fetchProduct`, `fetchCmsPage`)
- Collection fetches return empty arrays on error
- Network errors propagate as exceptions (caught by route handlers)

## Usage Example

```typescript
import { MahoApiClient } from './api-client';

const client = new MahoApiClient(env.MAHO_API_URL, storeCode);

// Fetch a product
const product = await client.fetchProduct('tori-tank');
if (!product) {
  return c.notFound();
}

// Fetch category products
const { products, totalItems } = await client.fetchCategoryProducts(42, 1, 24);
```

Source: `src/api-client.ts`

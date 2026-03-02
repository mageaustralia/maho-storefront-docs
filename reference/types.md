# TypeScript Types

Type definitions for all data models used throughout the storefront.

**Source:** `src/types.ts` (~310 lines)

## Product

```typescript
interface Product {
  id: number
  sku: string
  name: string
  type: 'simple' | 'configurable' | 'bundle' | 'grouped' | 'downloadable'
  urlKey: string

  // Pricing
  price: number
  specialPrice?: number
  finalPrice: number
  minimalPrice?: number
  tierPrices?: TierPrice[]

  // Images
  imageUrl: string
  smallImageUrl: string
  thumbnailUrl: string
  mediaGallery: MediaGalleryItem[]

  // Configurable options
  configurableOptions?: ConfigurableOption[]
  variants?: ProductVariant[]

  // Custom options, bundle, grouped
  customOptions?: CustomOption[]
  bundleOptions?: BundleOption[]
  groupedProducts?: GroupedProduct[]
  downloadableLinks?: DownloadableLink[]

  // Content
  description?: string
  shortDescription?: string

  // Reviews
  reviewCount: number
  averageRating: number

  // Relations
  relatedProducts?: Product[]
  crosssellProducts?: Product[]
  upsellProducts?: Product[]

  // SEO
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string

  // Stock
  isInStock: boolean
  stockQty?: number

  // Timestamps
  createdAt: string
  updatedAt: string
}
```

## ProductVariant

```typescript
interface ProductVariant {
  id: number
  sku: string
  price: number
  finalPrice: number
  stockQty: number
  attributes: Record<string, string>  // { color: "Red", size: "M" }
  imageUrl?: string
}
```

## ConfigurableOption

```typescript
interface ConfigurableOption {
  id: number
  code: string        // Attribute code (e.g., "color")
  label: string       // Display label (e.g., "Color")
  values: ConfigurableOptionValue[]
}

interface ConfigurableOptionValue {
  id: number
  label: string       // e.g., "Red"
  value: string
}
```

## Category

```typescript
interface Category {
  id: number
  parentId: number
  name: string
  urlKey: string
  urlPath: string
  image?: string
  level: number
  position: number
  isActive: boolean
  includeInMenu: boolean
  description?: string
  cmsBlock?: string
  productCount: number
  children: Category[]
  childrenIds: number[]
  path: string

  // Layout
  pageLayout?: string       // e.g. 'one_column', 'two_columns_left'. Null means unset (falls back to store default)

  // SEO
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
}
```

## StoreConfig

```typescript
interface StoreConfig {
  storeCode: string
  storeName: string
  baseCurrencyCode: string
  defaultDisplayCurrencyCode: string
  locale: string
  timezone: string
  weightUnit: string
  baseUrl: string
  baseMediaUrl: string
  allowedCountries: string[]
  isGuestCheckoutAllowed: boolean
  newsletterEnabled: boolean
  wishlistEnabled: boolean
  reviewsEnabled: boolean
  logoUrl?: string
  logoAlt?: string
  defaultTitle: string
  defaultDescription: string
  cmsHomePage?: string
}
```

## Cart

```typescript
interface Cart {
  id: number
  maskedId: string
  customerId?: number
  items: CartItem[]
  prices: {
    subtotal: number
    tax: number
    grandTotal: number
    discount?: number
  }
  couponCode?: string
}

interface CartItem {
  id: number
  sku: string
  name: string
  qty: number
  price: number
  rowTotal: number
  options: { label: string; value: string }[]
  imageUrl?: string
}
```

## CmsPage

```typescript
interface CmsPage {
  identifier: string
  title: string
  contentHeading?: string
  content: string        // HTML content
  imageUrl?: string
  metaKeywords?: string
  metaDescription?: string
  rootTemplate: string      // Page layout — 'one_column', 'two_columns_left', etc. Always present, defaults to 'one_column' when unset in DB
  status: number
  createdAt?: string
  updatedAt?: string
}
```

## BlogPost

```typescript
interface BlogPost {
  id: number
  title: string
  urlKey: string
  content: string
  excerpt?: string
  imageUrl?: string
  publishDate: string
  status: number
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
}
```

## Country

```typescript
interface Country {
  id: string
  name: string
  iso2Code: string
  iso3Code: string
  availableRegions?: Region[]
}

interface Region {
  id: number
  code: string
  name: string
}
```

## PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  items: T[]
  totalItems: number
  currentPage: number
  itemsPerPage: number
  totalPages: number
}
```

## Environment

```typescript
interface Env {
  CONTENT: KVNamespace       // Cloudflare KV binding
  MAHO_API_URL: string       // Backend URL
  SYNC_SECRET: string        // Shared secret for sync endpoint
  DEMO_STORES?: string       // JSON: hostname → store code mapping
}
```

Source: `src/types.ts`

# Extending API Resources

Every Maho API resource (Category, Product, StoreConfig, etc.) can be enriched by PHP module observers without touching core files. Resources expose an `extensions` map that observers can write to, and the storefront reads from.

## How It Works

Each API resource dispatches a `api_{resource}_dto_build` event after building its DTO. Observers receive the Maho model and the DTO, write to `$dto->extensions[...]`, and the data is serialized into the JSON response automatically.

```
Maho model loaded
       ↓
DTO built from model fields
       ↓
api_{resource}_dto_build event dispatched
       ↓
Observers write to $dto->extensions[...]
       ↓
JSON response: { ..., "extensions": { "yourKey": "value" } }
```

## Available Events

| Event | Resource | When fired |
|-------|----------|------------|
| `api_category_dto_build` | Category | Each category DTO built |
| `api_store_config_dto_build` | StoreConfig | Store config DTO built |
| `api_layered_filter_dto_build` | Layered filter | Each filter attribute DTO built |
| `api_product_dto_build` | Product | Each product DTO built |

## Writing an Observer

### 1. Register the event in `config.xml`

```xml
<global>
    <events>
        <api_category_dto_build>
            <observers>
                <mymodule_enrich_category>
                    <type>singleton</type>
                    <class>MyModule_Model_Observer</class>
                    <method>enrichCategory</method>
                </mymodule_enrich_category>
            </observers>
        </api_category_dto_build>
    </events>
</global>
```

### 2. Implement the observer method

```php
public function enrichCategory(Varien_Event_Observer $observer): void
{
    $category = $observer->getEvent()->getCategory();
    $dto      = $observer->getEvent()->getDto();

    if (!$category || !$dto || !property_exists($dto, 'extensions')) {
        return;
    }

    // Read a custom category attribute
    $value = $category->getData('my_custom_attribute');
    if ($value) {
        $dto->extensions['myCustomAttribute'] = (string) $value;
    }
}
```

::: tip Graceful degradation
Only write to `extensions` when the value is present. If the attribute doesn't exist or has no value, skip it — the storefront reads with optional chaining and falls back gracefully.
:::

## Real-World Example: Menu Titles

Categories in Maho have a standard `name` attribute (e.g. "Pickleball Paddles") and optionally a shorter `menu_title` attribute (e.g. "Paddles") for use in navigation. Rather than adding `menu_title` to the core `CategoryProvider`, the `FilterablePages` module enriches the DTO via observer:

**`Observer.php`:**
```php
public function enrichCategoryMenuTitle(Varien_Event_Observer $observer): void
{
    $category = $observer->getEvent()->getCategory();
    $dto      = $observer->getEvent()->getDto();

    if (!$category || !$dto || !property_exists($dto, 'extensions')) {
        return;
    }

    $menuTitle = $category->getData('menu_title');
    if ($menuTitle) {
        $dto->extensions['menuTitle'] = (string) $menuTitle;
    }
}
```

**`config.xml`:**
```xml
<api_category_dto_build>
    <observers>
        <filterablepages_enrich_category>
            <type>singleton</type>
            <class>MageAustralia_FilterablePages_Model_Observer</class>
            <method>enrichCategoryMenuTitle</method>
        </filterablepages_enrich_category>
    </observers>
</api_category_dto_build>
```

**API response:**
```json
{
  "id": 299,
  "name": "Pickleball Paddles",
  "extensions": {
    "menuTitle": "Paddles"
  }
}
```

**Storefront template:**
```tsx
{(cat.extensions?.menuTitle as string | undefined) || cat.name}
```

## Reading Extensions in the Storefront

Extensions land on the `extensions` property of the resource type. Always use optional chaining and provide a fallback:

```ts
// Category
const label = (cat.extensions?.menuTitle as string | undefined) || cat.name;

// StoreConfig
const mapsKey = config.extensions?.googleMapsApiKey as string | undefined;

// Product
const badge = product.extensions?.promoBadge as string | undefined;
```

The TypeScript types define `extensions` as `Record<string, unknown>` so you need to cast to the specific type you expect.

## StoreConfig Extensions

For store-level config (API keys, feature flags, module settings) use `api_store_config_dto_build` instead:

```php
public function injectConfig(Varien_Event_Observer $observer): void
{
    $dto = $observer->getEvent()->getDto();
    $dto->extensions['myFeature'] = [
        'enabled' => (bool) Mage::getStoreConfig('my/feature/enabled'),
        'apiKey'  => Mage::getStoreConfig('my/feature/api_key'),
    ];
}
```

The storefront plugin then reads this in its `when()` condition and component:

```ts
// Only load SDK when feature is enabled
when: (config) => !!config.extensions?.myFeature?.enabled,
```

See [Plugin System](/architecture/plugins) for the full storefront plugin integration pattern.

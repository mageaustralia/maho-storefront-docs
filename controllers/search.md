# Search Controller

The search controller manages the search bar, autocomplete suggestions, and search result display.

**Source:** `src/js/controllers/search-controller.js` (~150 lines)

## Targets

| Target | Element | Purpose |
|--------|---------|---------|
| `input` | Search input field | User query input |
| `results` | Results dropdown | Autocomplete suggestions |
| `overlay` | Overlay backdrop | Dims page behind search |

## Actions

| Action | Trigger | Behavior |
|--------|---------|----------|
| `query` | Input event (debounced) | Fetch search suggestions |
| `submit` | Form submit / Enter | Navigate to search results page |
| `close` | Click overlay / Escape | Close suggestions dropdown |
| `select` | Click suggestion | Navigate to product/category |

## Search Flow

1. User types in the search input (debounced at ~300ms)
2. Controller fetches suggestions from the Worker's search endpoint
3. Results display in a dropdown overlay with product images and prices
4. Clicking a result navigates directly to that product/category
5. Pressing Enter navigates to the full search results page

## Keyboard Navigation

- **Arrow Down/Up** — Navigate through suggestions
- **Enter** — Select highlighted suggestion or submit search
- **Escape** — Close suggestions dropdown

Source: `src/js/controllers/search-controller.js`

# B2B Suite

Four small, composable Maho modules that together deliver a wholesale /
trade-account experience: **gate access to prices and products**, **turn a
trade-application form into a pending customer account**, **manually approve
new signups**, and **build the trade-application form itself**.

Each module has one job. Nothing is a monolith; you install only what you
need. All four work on a stock Maho storefront out of the box, and expose
their state over the API so a headless storefront (like this one) can render
the same behaviours.

## The four modules

| Module | Package | What it does |
|---|---|---|
| **B2B Access** | `mageaustralia/maho-module-b2b-access` | Access + visibility gate. Require login to view the store, hide prices with a "Log in to see pricing" message, block purchasing, all scoped by customer group / category / store. |
| **Customer Approval** | `mageaustralia/maho-module-customer-approval` | New registrations land in `pending`. Admin approves / rejects from a grid; approval / rejection emails go out; pending customers cannot log in. |
| **Custom Forms** | `mageaustralia/maho-module-custom-forms` | Form builder with an anti-spam pipeline (honeypot, min-fill time, rate limit, optional captcha). Forms embed on any CMS page via a Maho block directive (see the embed section below). Also exposes a headless render + submit API. |
| **B2B Registration** | `mageaustralia/maho-module-b2b-registration` | Wires the three above together: a Custom Forms trade-application submission becomes a pending customer account (via Customer Approval), and on approve the customer is auto-assigned to a nominated B2B customer group. |

They compose like this:

```
             Custom Forms  ─────┐
                                │  (trade-application submission)
                                ▼
                      B2B Registration
                                │  (create customer + application record)
                                ▼
                      Customer Approval  ─────►  admin approves / rejects
                                │
                                ▼  (on approve: assign to B2B group)
                      B2B Access  ─────►  visibility + pricing rules per group
```

You can install any subset — B2B Access alone is useful ("log in to see
pricing" for a whole site), and Customer Approval + Custom Forms work
without a B2B group (they gate account creation for any signup path, not
just trade applications).

---

## B2B Access

**Path:** *System → Configuration → Customer → B2B Access*

The single most-requested B2B feature and the cleanest standalone win: guests
(or specified groups) see "Log in to see pricing" and cannot add to cart.

![B2B Access — General + Login Wall + Hide Prices + Activation Matrix](/screenshots/b2b/01-b2baccess-config-active.png)

### Config surface

| Group | Field | What it does |
|---|---|---|
| General | Enabled | Master switch. When off, the module is inert. |
| Login Wall | Require login to view store | Redirect guests away from every page (except the login/registration wall itself and any exempt CMS pages). |
| Login Wall | Redirect guests to | Which CMS page (or the default login page) unauthenticated visitors land on. |
| Login Wall | Notice shown to guests | The message that renders on the redirect target. |
| Hide Prices | Hide prices | Replace every price block with the message below. |
| Hide Prices | Hidden-price message | e.g. "Log in to see pricing". |
| Hide Prices | Block purchasing too | Belt-and-braces: also refuse `add to cart` server-side. Hiding the button alone is bypassable via a crafted URL. |
| Activation Matrix | Gate by customer group | The gate applies to specific groups (e.g. guests only). |
| Activation Matrix | Customer groups | Multiselect. `NOT LOGGED IN` = guests. |
| Activation Matrix | Gate by category | The gate applies to specific categories (subcategories inherit). |
| Activation Matrix | Category IDs | CSV of category IDs. |

The matrix is **OR-combined**: if a customer OR a product's category matches,
the gate fires. A product in *any* gated category is gated everywhere — this
is intentional but worth calling out to admins.

### Server-side enforcement

Everything the module does is observer-driven:

- `controller_action_predispatch` — login-wall redirect
- `core_block_abstract_to_html_after` — replace price blocks
- `catalog_product_type_prepare_full_options` — reject unauthorised add-to-cart
- `core_block_abstract_to_html_before` — drop the "Sort by price" toolbar option
- `core_layout_block_create_after` — drop the price filter from layered nav

Nothing is JS-side — a crafted URL cannot bypass it.

---

## Customer Approval

**Path:** *System → Configuration → Customer → Customer Approval* + admin grid
at *Customers → Customer Approvals*.

New signups land in `pending` state. They cannot log in until an admin
approves them.

![Customer Approval — General + Admin Notifications + Customer Emails](/screenshots/b2b/02-customerapproval-config.png)

### Config surface

| Field | Purpose |
|---|---|
| Enabled | Master switch. |
| New registrations require approval | When on, every new customer starts pending. Turn off if you only want the approval flow for B2B applications (in which case B2B Registration flags applications specifically). |
| Blocked-login message | Shown to a pending customer who tries to log in. |
| Notify these emails of pending accounts | CSV of email addresses that receive "you have a new application" notifications. |
| Email sender | Which store contact identity the mails come from. |
| Approved / rejected email templates | The system emails that fire on decision. Both have sensible defaults; override in *System → Transactional Emails* if you want branding. |

### Admin queue

![Customer Approvals grid — pending signups with Approve / Decline actions](/screenshots/b2b/14-admin-customer-approvals-queue.png)

Approve / Decline are single-click. Both fire the corresponding email
template. A rejected customer's record stays in place (soft state, not
deletion) so an admin can flip the decision later.

---

## Custom Forms

**Path:** *CMS → Custom Forms → Manage Forms* (+ *Submitted Data* grid).
**Config:** *System → Configuration → CMS → Custom Forms*.

A general-purpose form builder — trade applications, contact us, event RSVPs,
anything. The anti-spam pipeline is baked in so you don't have to bolt on
reCAPTCHA for a basic form.

![Custom Forms — anti-spam config](/screenshots/b2b/03-customforms-config.png)

### Config surface

| Field | Purpose |
|---|---|
| Enabled | Master switch. |
| Captcha | Optional Google reCAPTCHA. Off by default — most stores don't need it. |
| Honeypot | Hidden field bots fill in. Cheap; on by default. |
| Minimum fill time (seconds) | Reject submissions faster than this. Default 3s. |
| Rate limit per IP per hour | Default 20/hr. |
| Enable headless API | Exposes `POST /api/customforms/…` for headless storefronts. |

### Forms grid

![Custom Forms — Manage Forms grid](/screenshots/b2b/05-customforms-grid.png)

### Form editor

Each form is a code + title + a list of fields. Fields have a type
(text / email / tel / select / textarea …), an optional required flag, and
a mapping key that becomes the payload attribute name.

![Custom Forms — Trade Account Application](/screenshots/b2b/06-customforms-trade-application.png)

### Embedding on the frontend

Two lines of CMS content (v-pre so VitePress doesn't try to render the
Maho `{{ '{{' }} … {{ '}}' }}` directive as a Vue expression):

<div v-pre>

<div v-pre>

```html
{{block type="customforms/form" form_code="trade_application"}}
<div data-maho-form="trade_application"></div>
```

</div>

The block renders the server-side HTML; the `data-maho-form` marker is what
the headless storefront looks for to re-hydrate the same form client-side.

### Submission endpoint

`POST /customforms/form/submit` (server-rendered) or the JSON equivalent
(headless). Both run the shared helper pipeline: anti-spam checks →
validation → persist → `customforms_submission_saved` event → redirect back
to the form so success / error messages render inline (post-redirect-get).

The event dispatch is the extension point — B2B Registration listens for it
below.

---

## B2B Registration

**Path:** *System → Configuration → Customer → B2B Registration*.
**Admin queue:** *Customers → Trade Applications*.

The glue module. It listens for a Custom Forms submission on one of the
nominated form codes and converts it into a pending customer account under
Customer Approval — with the trade-application payload attached to the
customer record.

![B2B Registration — Trade-Account Flow config](/screenshots/b2b/04-b2bregistration-config.png)

### Config surface

| Field | Purpose |
|---|---|
| Enabled | Master switch. |
| Trade-application form codes | CSV. Only submissions matching these codes trigger the flow. Everything else stays a normal Custom Forms submission. |
| Email field key | Which form field carries the applicant's email address (used to create the customer). Default `email`. |
| B2B customer group (on approval) | The customer group approved trade accounts land in. Typically *Wholesale*. |
| Override map (JSON) | Optional per-field mapping if your form's field keys don't match Maho's customer attributes (e.g. `{"phone":"telephone"}`). |

### Admin queue

![Trade Applications grid — one pending application](/screenshots/b2b/13-admin-trade-applications-queue.png)

Approve / Decline here fires both the trade-application decision AND the
Customer Approval flip — the two are linked. On approve the customer moves
from `pending` to active AND their group flips from the default (usually
General) to the B2B group configured above.

---

## End-to-end walkthrough

The demo below runs against `maho.tenniswarehouse.com.au` with the four
modules enabled and a `trade_application` form embedded on a CMS page at
`/trade-application`.

### 1. Guest visits a product page

Hide Prices is on for the `NOT LOGGED IN` group, so guests see the login
prompt instead of a price. Add-to-cart is refused server-side too.

![Guest PDP — "Log in to see pricing" in place of price](/screenshots/b2b/11-frontend-guest-hidden-price.png)

### 2. Guest visits the trade-application page

The CMS page renders the form via the `customforms/form` block. Fields are
whatever you configured in the form editor.

![Frontend — Trade Application form](/screenshots/b2b/10-frontend-trade-application-form.png)

### 3. Guest submits the form

The Custom Forms anti-spam pipeline runs (honeypot + min-fill time + rate
limit), then B2B Registration's observer fires on the
`customforms_submission_saved` event and creates a pending customer.

![Frontend — post-submit success state](/screenshots/b2b/12-frontend-trade-application-submitted.png)

### 4. Admin sees a new application

The row appears in *Customers → Trade Applications* with the applicant's
email, application status, and Approve / Decline actions. Behind it in
*Customers → Customer Approvals* the same customer shows as pending.

![Admin — Trade Applications queue](/screenshots/b2b/13-admin-trade-applications-queue.png)

### 5. Admin clicks Approve

Two side-effects fire atomically:

- **Customer Approval** flips the customer's `is_approved` flag → login enabled.
- **B2B Registration** sets the customer's group to the configured B2B group.

![Admin — application row shows approved](/screenshots/b2b/15-admin-trade-applications-approved.png)

Approval + rejection emails from Customer Approval fire in the same
transaction.

### 6. Approved customer logs in

Because the customer is now in the B2B group, they escape the Hide Prices
matrix — the same product page now shows the real price and a working
add-to-cart button.

![Approved wholesale customer — real price visible](/screenshots/b2b/16-frontend-wholesale-customer-sees-price.png)

## Ordering of enabled flags

The modules cross-reference each other's `enabled` flag, so:

1. Enable **Custom Forms** first (nothing else works without it).
2. Enable **Customer Approval** — everything you approve now takes the
   pending → active path.
3. Enable **B2B Registration** — trade submissions become pending customers.
4. Enable **B2B Access** last — you don't want to gate the site before you've
   built the mechanism to admit people through the gate.

Turning any one off doesn't cascade — the others keep working, just without
that responsibility handled.

## Headless storefronts

**Status as of 2026-07:** the *modules work perfectly on a stock, server-rendered
Maho storefront*. The headless surface (this project) currently gets:

- **Custom Forms** — full parity. `GET /api/rest/v2/custom-forms/{code}` returns
  the schema, `POST /api/rest/v2/custom-form-submissions` runs the same anti-spam
  pipeline as the browser endpoint. The trade-application form on the storefront
  is fed by these routes.
- **Customer Approval** — the JWT token endpoint refuses to issue a token for a
  pending customer, so a headless login attempt gets the right error.
- **B2B Registration** — the observer fires the same way on either the browser
  submit path or the headless one, so a trade application from an embedded
  storefront form lands as a pending customer just like a stock Maho form
  submit does.
- **B2B Access** — **not yet integrated with the headless catalog API.** The
  gate is enforced correctly on stock Maho pages, but the API's product
  responses currently ship the price for every caller regardless of group.
  A headless storefront overlaying the catalog API will show the price to
  guests even when Hide Prices is on.

### What needs to happen for B2B Access to reach the headless storefront

The catalog API needs three additive changes (all in
`Mage/Catalog/Api/ProductProvider.php`) and the storefront needs to consume
them:

1. **Emit gate flags on the DTO** — add `requiresLogin`, `hidePrice`,
   `canCheckout` boolean fields, populated from B2B Access's activation matrix
   evaluated against the current caller's group.
2. **Omit `price` when `hidePrice` is true** — the API just doesn't ship the
   price field for gated products; the storefront treats `null` as "log in to
   see pricing". This keeps the response cacheable per-group.
3. **Reject cart mutations when `canCheckout` is false** — belt-and-braces on
   the write side, mirrors the observer that stops crafted-URL add-to-cart
   on the stock storefront.

Then the storefront:

- Renders `<PriceOrLoginPrompt>` in place of the price component when
  `product.hidePrice` is set.
- Suppresses "Add to Cart" when `product.canCheckout` is false.
- Redirects guests off gated categories client-side (server-side reject on the
  catalog collection endpoint is the enforcement).

That's the plan; not shipping in this docs cycle. Tracked as
[maho-module-b2b-access#TBD] once we file it.

## Next in the roadmap

The 4 modules above are the **foundation tier**. The next tier — one
`Company` hub that maps organisations onto customer groups + a
`per-company pricing` module that solves the "one customer group, N
different customers, N different price lists" problem — is planned in
`maho-b2b-suite/PLAN.md` in the modules repo. The design deliberately makes
Company a soft dependency: everything above keys on customer group today,
and gets richer (per-company scoping, sub-users, on-account payment) when
Company is present.

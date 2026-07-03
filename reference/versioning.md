# Versioning

The storefront uses **SemVer** (`vMAJOR.MINOR.PATCH`) and declares a **Maho
compatibility band** on every release. It is **not** tied 1:1 to Maho's version
— they ship on different cadences.

## Rules

| Change | Bump |
|---|---|
| Bug fix (no client-visible API change) | patch — `1.0.0 → 1.0.1` |
| New feature, additive component, non-breaking refactor | minor — `1.0.1 → 1.1.0` |
| Change that requires a Maho backend upgrade (new API resource, breaking route rename, DTO field removal that Maho now depends on) | major — `1.x → 2.0.0` **and** update `mahoCompat` |

## Maho compat band

`package.json` carries a `mahoCompat` field expressed as a SemVer range:

```json
{
  "name": "maho-storefront",
  "version": "1.0.0",
  "mahoCompat": ">=26.5.0 <27.0.0"
}
```

- Bump the lower bound whenever the storefront starts depending on a Maho
  feature that first shipped in a specific minor.
- Bump the upper bound on a Maho major cut (`<28.0.0` when Maho hits 27.0.0
  and you've tested against it).

## Release workflow

After a PR is merged into `main`:

1. On the local machine: `git checkout main && git pull --ff-only`.
2. Bump the version in `package.json` (patch / minor / major per the rule
   above). If it's a breaking change, also update `mahoCompat`.
3. Commit the version bump: `git commit -am "chore: release v1.0.1"`.
4. Tag: `git tag v1.0.1 && git push origin main --tags`.
5. Create a GitHub release from the tag with:
   - **Compatible with Maho**: `>=26.5.0 <27.0.0` (mirror the `mahoCompat`)
   - What's changed (bullet the merged PRs since the last tag)
6. Deploy: `./deploy.sh` (or the CI equivalent).

## When Maho ships a breaking change

Example: Maho 27.0 renames `/api/rest/v2/…` → `/api/v3/…`.

1. Update every client of the old route in `src/plugins/*/sync.ts`,
   `src/api-client.ts`, etc.
2. Bump `mahoCompat` to `>=27.0.0 <28.0.0`.
3. Bump the storefront to the next major: `2.0.0`.
4. In the release notes, explicitly call out the required Maho upgrade.

Stores on Maho 26.x should stay on the last `1.x` release of the storefront
until they upgrade — the two majors of the storefront can coexist in the wild
against the two majors of Maho.

## Pre-release / RC tags

For staging a breaking change before general availability:

```
v2.0.0-rc.1     # first release candidate
v2.0.0-rc.2     # follow-up
v2.0.0          # final
```

## Not tied to Maho's version number

Deliberately: Maho ships every few weeks; the storefront can ship several
patches per week. Aligning version numbers directly would produce awkward
tuples (`26.5.4-storefront.87`) and imply a compatibility guarantee we
don't actually make (a Maho 26.5.4 release does not automatically mean
storefront 26.5.4 exists or works).

The `mahoCompat` field is the actual contract.

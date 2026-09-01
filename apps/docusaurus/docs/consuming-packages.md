---
sidebar_position: 2
---

# Consuming `@fmmenchi/*` packages from an app

The packages are published to **GitHub Packages** (npm registry `npm.pkg.github.com`), private to
the `fmmenchi` account. Any app repo that wants them needs two things: the registry mapping and
an authenticated token.

## 1. Registry mapping

In the consuming repo's `.npmrc` (committed — it contains no secret):

```ini
@fmmenchi:registry=https://npm.pkg.github.com
```

## 2. Authentication

GitHub Packages requires auth even for reads. Create a classic PAT with the `read:packages`
scope and expose it as `NODE_AUTH_TOKEN` (never commit it). In the **user-level** `~/.npmrc`:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

In GitHub Actions of the consuming repo, the built-in `GITHUB_TOKEN` works if the package's repo
grants it access (Package settings → Manage Actions access), otherwise use the PAT as a secret.

## 3. Install

```bash
pnpm add @fmmenchi/ui
```

### Design system

`@fmmenchi/ui` ships **precompiled CSS** — you import a stylesheet, you do **not** need Tailwind.
It is authored with Tailwind + CSS Modules and compiled to scoped classes at publish; how and why
is in [styling](./styling.md). Import the component stylesheet plus the token variables:

```css
/* app.css */
@import '@fmmenchi/tokens/styles/vars.css'; /* the --fm-* token variables (plain CSS) */
@import '@fmmenchi/tokens/styles/presets/dark.css'; /* optional [data-theme='dark'] preset */
@import '@fmmenchi/ui/style.css'; /* precompiled component styles */
```

```tsx
import { UiProvider, Button } from '@fmmenchi/ui';

<UiProvider adapters={{ i18n: { locale: 'en' } }} theme="base">
  <Button variant="primary">Save</Button>
</UiProvider>;
```

Switch preset at runtime with `data-theme` on a root element (`<html data-theme="dark">`); the
token variables re-theme the components, no rebuild.

#### Overriding a component's styles

A plain rule of yours wins. Everything the design system ships lives inside `@layer fmmenchi`, and
an unlayered rule beats a layered one whatever its specificity (ADR-0011) — no `!important` and no
specificity war.

If your own CSS is layered too — several frameworks put their utilities in a layer — then it is
layer against layer, and there the winner is the one declared **last**, not the more specific one.
Say the order once, at the top of your stylesheet before any import, and yours wins whatever the
import order:

```css
@layer app, fmmenchi;
```

#### Using the tokens in your own styles

The token values are plain custom properties, so nothing is needed beyond the import above:

```css
.checkout-summary {
  background: var(--fm-color-card);
  border-radius: var(--fm-radius-lg);
}
```

They follow `data-theme` like the components do. A team that wants those roles as utilities in its
own build can consume `@fmmenchi/tokens/styles/tailwind.css` — it registers them as a Tailwind
theme, and it **replaces** Tailwind's own colour, breakpoint, radius, shadow and font scales rather
than adding to them, so take it only if that trade is one you want.

#### Importing only what you use

The package is tree-shakeable (`sideEffects` are CSS only), so the barrel import above already drops
unused components from your JS bundle. For **guaranteed** isolation — and to load only one
component's CSS — import the component subpath and its stylesheet:

```tsx
import { Button } from '@fmmenchi/ui/button';
```

```css
@import '@fmmenchi/tokens/styles/vars.css';
```

`@fmmenchi/ui/style.css` bundles every component's styles (simplest); `@fmmenchi/ui/<name>/style.css`
loads only that component's.

#### Shipping a brand theme

A theme is a complete assignment of every color role under a `[data-theme='<name>']` selector
(same shape as the built-in `dark` preset). Don't write it by hand — **generate it**, so the
scaffold always matches the tokens version you have installed, and validation is wired from day
one:

```bash
pnpm add -D @fmmenchi/nx-theme-generator
pnpm nx g @fmmenchi/nx-theme-generator:theme acme --project=web
```

This creates `apps/web/src/themes/acme.css` (every color role, starting from the light reference
values — edit the values, never remove a role) and adds a `validate-themes` target to the project:

```bash
pnpm nx run web:validate-themes
```

The executor validates each theme with the **installed** `@fmmenchi/tokens` contract —
completeness, parsable colors, sRGB gamut, and WCAG contrast on every pairing the design system
uses — reporting exact ratios on failure (e.g. `primary × primary-foreground: 3.9 < 4.5`): fix the
value, don't lower the bar. Import the CSS and apply with `<html data-theme="acme">`.

Under the hood it is the same validator the design system gates itself with, and the
target is how you reach it: **there is no importable validator today.** It lives in
`@fmmenchi/theme`, which is private and unpublished, and the Nx plugin bundles it — so
`validate-themes` carries the rules into your repo while `@fmmenchi/tokens` ships only
stylesheets. Point the target at your theme files and let CI run it:

```jsonc
// project.json
"validate-themes": {
  "executor": "@fmmenchi/nx-theme-generator:validate",
  "options": { "themes": ["src/themes/acme.css"] }
}
```

Versions follow each package's own changelog (`packages/<scope>/<name>/CHANGELOG.md` in this
repo) and the git tags `@fmmenchi/<name>@<version>`; releases also appear as GitHub Releases.

## Troubleshooting

- **401/403 on install** — missing/expired token, or the token lacks `read:packages`.
- **404 on install** — the package has never been published, or the `.npmrc` scope mapping is
  missing so npmjs.org is being queried instead.
- **Types not found** — the published tarball only ships `dist/`; make sure you import the
  package root (`@fmmenchi/ui`), not deep paths.

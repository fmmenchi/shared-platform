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
pnpm add @fmmenchi/core
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
token variables re-theme the components, no rebuild. If your app already uses Tailwind you may
instead consume the token `@theme` (`@fmmenchi/tokens/styles/tailwind.css`) in your own build —
but the components' styles always come from the precompiled CSS, never from your Tailwind scanning
the library.

#### Importing only what you use

The package is tree-shakeable (`sideEffects` are CSS only), so the barrel import above already drops
unused components from your JS bundle. For **guaranteed** isolation — and to load only one
component's CSS — import the component subpath and its stylesheet:

```tsx
import { Button } from '@fmmenchi/ui/button';
```

```css
@import '@fmmenchi/tokens/styles/vars.css';
@import '@fmmenchi/ui/button/style.css'; /* just the Button's styles */
```

`@fmmenchi/ui/style.css` bundles every component's styles (simplest); `@fmmenchi/ui/<name>/style.css`
loads only that component's.

Versions follow each package's own changelog (`packages/<scope>/<name>/CHANGELOG.md` in this
repo) and the git tags `@fmmenchi/<name>@<version>`; releases also appear as GitHub Releases.

## Troubleshooting

- **401/403 on install** — missing/expired token, or the token lacks `read:packages`.
- **404 on install** — the package has never been published, or the `.npmrc` scope mapping is
  missing so npmjs.org is being queried instead.
- **Types not found** — the published tarball only ships `dist/`; make sure you import the
  package root (`@fmmenchi/core`), not deep paths.

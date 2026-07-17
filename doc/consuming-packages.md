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

Versions follow each package's own changelog (`packages/<scope>/<name>/CHANGELOG.md` in this
repo) and the git tags `@fmmenchi/<name>@<version>`; releases also appear as GitHub Releases.

## Troubleshooting

- **401/403 on install** — missing/expired token, or the token lacks `read:packages`.
- **404 on install** — the package has never been published, or the `.npmrc` scope mapping is
  missing so npmjs.org is being queried instead.
- **Types not found** — the published tarball only ships `dist/`; make sure you import the
  package root (`@fmmenchi/core`), not deep paths.

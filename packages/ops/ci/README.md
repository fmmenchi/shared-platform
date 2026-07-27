# @fmmenchi/ci

Release helper scripts for the CI job of an Nx release monorepo. Small, tested, importable — the
CI-only shell wiring stays in `.github/workflows/ci.yml`.

## What it does

`nx release` already versions only the projects with releasing conventional commits — a docs- or
config-only push releases nothing, and a change that legitimately affects everything (nx.json, the
lockfile) releases everything. No affected pre-filter is needed; nx does the right thing on its own.
These scripts wrap the two bits nx doesn't give you:

- **`release.js`** — runs `nx release`, then diffs the git tags before/after and writes the
  newly-cut **package** tags to `NEW_TAGS_FILE`, for the downstream SBOM + announce steps. Toolkit
  tags (e.g. `gh-actions/v*`) are logged but kept out (see `isPackageTag`).
- **`move-major-alias.js`** — moves a moving-major tag alias (`ALIAS_PREFIX`, default `gh-actions/v`)
  to the latest exact `<prefix>X.Y.Z`. nx doesn't maintain such aliases; consumers pin them.

## API (tested)

`isPackageTag` / `newTags` (tag classification + diff) and `majorAlias` (semver-ordered alias target)
are the pure, unit-tested pieces behind the scripts.

Notifications are **not** here: the release job dogfoods the
[`@fmmenchi/nx-notify`](../../plugins/notify) plugin.

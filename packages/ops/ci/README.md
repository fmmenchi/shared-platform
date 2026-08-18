# @fmmenchi/ci

Release helper scripts for the CI job of an Nx release monorepo. Small, tested, importable — the
CI-only shell wiring stays in `.github/workflows/ci.yml`.

- **Scope / type:** `ops` / `util`
- **Workspace:** part of [shared-platform](../../../README.md).
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).
- **Documentation:** [docs/](./docs/index.md) — guides, the script and API reference, the concepts.

## What it does

`nx release` already versions only the projects with releasing conventional commits — a docs- or
config-only push releases nothing, and a change that legitimately affects everything (nx.json, the
lockfile) releases everything. No affected pre-filter is needed; nx does the right thing on its own.
These scripts wrap the two bits nx doesn't give you:

- **`release.js`** — releases via nx's programmatic API (`release()` from `nx/release`) and writes a
  **record of what it did** to `RELEASE_RESULT_FILE`: `{ dryRun, releases: [{ project, version, tag }] }`,
  asked of nx rather than inferred from a git-tag diff, with every tag verified against the tags git
  really has. It also projects the package tags to `NEW_TAGS_FILE` for the SBOM + announce steps that
  still read them (toolkit tags like `gh-actions/v*` stay out — see `isPackageTag`). The record names
  nothing message-shaped: releasing and announcing are separate operations.
  (There used to be a second script here, `move-major-alias.js`, which force-pushed a moving major tag
  after each release. It is gone: tags are never moved now — see the toolkit's Versioning section.)

## API (tested)

`isPackageTag`, `toReleaseRecords` and `publishableProjects` are the pure, unit-tested pieces behind
the script.

Message _building_ is **not** here: `fmmenchi-notify` is only the CI door to
[`@fmmenchi/notify`](../../shared/notify), which stays the single implementation.

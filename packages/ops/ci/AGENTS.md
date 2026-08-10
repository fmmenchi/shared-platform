# AGENTS.md — @fmmenchi/ci

Release helper scripts for the CI job of an `nx release` monorepo. Part of `shared-platform`;
workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `ops`, type `util`. Human
documentation lives in [docs/](./docs/index.md) — keep it current with these rules, never duplicate
them into it.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ci
pnpm nx build @fmmenchi/ci
pnpm nx test @fmmenchi/ci      # the pure half — tags, alias
```

## Rules

- **Never add an affected pre-filter.** `nx release` versions from conventional commits PER PROJECT:
  a docs- or config-only push releases nothing, a change to `nx.json` or the lockfile releases
  everything, and both are correct. A pre-filter is a second opinion about the same question, and
  the only thing it can contribute is a disagreement.
- **A package tag is not a toolkit tag.** `isPackageTag` is explicit and tested because everything
  downstream parses `{project}@{version}`: handed `gh-actions/v0.0.2` it derives a project that does
  not exist and fails on a package nobody released. It replaced a `*@*` glob that was right by
  accident and untestable by construction — do not put the glob back.
- **The logic stays separate from the side effects.** `isPackageTag`, `newTags` and `majorAlias`
  take arrays and return values; every `git` call and file write lives in the two scripts. That
  split is the whole reason there are tests, and the interesting failures are all in the pure half —
  a lexical sort putting `v0.9.0` above `v0.10.0`, a glob matching a toolkit tag — none of which
  needs a repository to reproduce. A new behaviour goes in a pure function first.
- **`majorAlias` orders by SEMVER, never lexically.** This is the bug the function exists to prevent.
- **Notifications are NOT here.** The release job dogfoods `@fmmenchi/nx-notify`, so the Slack
  surface has one implementation. A second one here would be two things to keep in step for one
  message.
- **The release job is `skipped`, not `failed`, when the gate is red** — that is a property of the
  workflow, not of this package, and it is the first thing to check when "the release stopped
  working". No tags, no releases, no publish, and no error anywhere.
- **A local tag is not the remote tag.** `git fetch` does not update a tag that already exists
  locally, so a stale local alias looks exactly like a broken script. Diagnose with
  `git ls-remote --tags origin` before reading any code here.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

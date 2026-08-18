# AGENTS.md — @fmmenchi/ci

Release helper scripts for the CI job of an `nx release` monorepo. Part of `shared-platform`;
workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `ops`, type `util`. Human
documentation lives in [docs/](./docs/index.md) — keep it current with these rules, never duplicate
them into it.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ci
pnpm nx build @fmmenchi/ci
pnpm nx test @fmmenchi/ci      # the pure half — tags, release records
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
- **The logic stays separate from the side effects.** `isPackageTag`, `formatTag`,
  `toReleaseRecords` and `publishableProjects`
  take values and return values; every `git` call and file write lives in the two scripts. That
  split is the whole reason there are tests, and the interesting failures are all in the pure half —
  a lexical sort putting `v0.9.0` above `v0.10.0`, a glob matching a toolkit tag — none of which
  needs a repository to reproduce. A new behaviour goes in a pure function first.
- **Ask nx, then check nx.** The release facts come from `release()` (`nx/release`) — project,
  version, and each group's own tag pattern — never from a git-tag diff. But the tag is FORMED by
  code that mirrors logic living inside nx (`sanitizeProjectNameForGitTag` + interpolation), so it is
  verified against the tags git really has before anything downstream sees it, and
  `assertReleaseGroups` fails loudly if nx's shape moved. nx renamed `releaseTagPattern` →
  `releaseTag.pattern` once and carries a `TODO(v24)` for the next move: a silent default there would
  fabricate a package-shaped tag and announce a release nobody cut.
- **Never decide a git flag for the consumer.** `releaseVersion`/`releaseChangelog` refuse to run
  beside a top-level `release.git` unless `gitCommit`, `gitTag` and `stageChanges` are passed — that
  is how nx tells the subcommand API from the `nx release` CLI — so they MUST be passed, and
  `gitFlagsFor()` reads them out of the consumer's `nx.json`. Hardcoding them shipped a real defect:
  `gitCommit: true` (right for this workspace) overrode `release.git.commit: false` in a consumer that
  deliberately keeps its versions in tags only, killing their rehearsal with "No changed files to
  commit" and, on a real run, pushing bump commits to their trunk. A published release script may
  decide the ORDER of the steps; it may not decide whether somebody else's trunk receives commits.
  The defaults copy nx's own derivation from `release.js` (`shouldCommit`/`shouldStage`/`shouldTag`),
  and the version step NEVER commits or tags however the config reads: one commit and one tag per
  release, at the end, exactly as the combined command does it.
- **Why not just call `release()`, then.** It returns `{ workspaceVersion, projectsVersionData,
releaseGraph }` and nothing else — no `gitTag`, no rendered notes. Those come only from
  `releaseChangelog`, and they are what the record carries, which is why the SBOM never parses a tag
  and the announcement never asks GitHub for a changelog it already has. Reading them afterwards does
  not work either: with `automaticFromRef` the notes are computed from the last tag, and `release()`
  has just created that tag at HEAD — the answer would be empty.
- **The manifest on disk is what gets published — keep it true.** `pnpm publish` (not nx) is what
  replaces a `workspace:*` dependency, and it reads the dependency's version from its
  `package.json` ON DISK. So the release must stage and commit the bumps (`stageChanges: true`
  here, `git.commit: true` in nx.json): with them uncommitted the repo's manifests sat at `0.0.1`,
  and four `@fmmenchi/ci` releases shipped depending on `@fmmenchi/notify@0.0.1` — a version that
  was never published, so the package could not be installed at all without a consumer-side
  override. Anything that ASKS NX for a version is safe; anything that READS THE DISK is only as
  true as the last commit.
- **A rehearsal must not produce a consumable.** `RELEASE_DRY_RUN=true` stamps the record and leaves
  `NEW_TAGS_FILE` empty. nx computes real versions under `dryRun`, so writing them would hand the
  announce step tags that do not exist.
- **Publish LAST, and by us.** `release()` is called with `skipPublish: true` and the record is
  written before `releasePublish()` runs. nx exits the process from inside on a registry failure, so
  publishing within it destroyed the account of a release that had already tagged and pushed. Now a
  failed publish leaves tags, Releases and a record — and the announce job can be re-run alone.
  Keep that order: anything that writes the record must come before anything that can exit.
- **The notification LOGIC is not here — the entrypoint is.** `fmmenchi-notify` reads events,
  delivers them and counts what arrived; every message is built and sent by `@fmmenchi/notify`, which
  stays the single implementation. This package owns the two CI doors (`fmmenchi-release`,
  `fmmenchi-notify`) and nothing about how a message looks.
- **The release job is `skipped`, not `failed`, when the gate is red** — that is a property of the
  workflow, not of this package, and it is the first thing to check when "the release stopped
  working". No tags, no releases, no publish, and no error anywhere.
- **No tag is ever moved.** The script that force-pushed a moving major alias is gone: GitHub
  refuses that push from Actions (the `GITHUB_TOKEN` cannot hold the `workflows` permission), and a
  movable tag is how `tj-actions/changed-files` was compromised in 2025. Consumers pin exact tags.
- **A local tag is not the remote tag.** `git fetch` does not update a tag that already exists
  locally, so a stale local one looks exactly like a broken script. Diagnose with
  `git ls-remote --tags origin` before reading any code here.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

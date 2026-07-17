# Commits, branching & release — agent rules

## General

- **Always wait for the PR checks (CI) to be green before merging — no exceptions.** Never merge
  with pending or failing checks, even when the merge itself was requested: wait for green first,
  and if CI fails, report and stop.

## Conventional Commits are mandatory

`nx release` derives each package's version, git tag, GitHub Release and `CHANGELOG.md` from the
commit messages landed on `main` (configured in `nx.json` → `release`). Use the right type:

- `feat:` → minor · `fix:` → patch · `feat!:` or a `BREAKING CHANGE:` footer → major
- `build:`, `ci:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`, `perf:` → no release

The format is **validated by commitlint** (`@commitlint/config-conventional`) via a husky
`commit-msg` hook — a non-conforming message is rejected. Keep the subject lowercase. Hooks are
skipped in CI via `HUSKY=0`.

Humans write commits with **`git cz`** (commitizen, `cz-conventional-changelog` adapter via
`.czrc`); agents write the conventional message directly — the `commit-msg` hook is the shared
safety net either way.

## Branching — trunk-based

- `main` is the only long-lived branch. Work on a short-lived feature branch, open a PR to
  `main`, merge, delete the branch. Do not create a `develop` branch.
- **Consolidate commits before merging.** A branch's history must be reworked into a few
  sensible, self-contained conventional commits (one per logical concern) before it lands on
  `main` — no "wip"/fixup trails. Rebuild the history (`git reset --soft` + regrouped commits,
  or interactive rebase) and force-push the branch, then merge preserving those commits
  (rebase merge, not squash — squashing would collapse distinct `feat:`/`fix:` entries that
  `nx release` needs).
- **Branch names are semantic:** `<type>/<kebab-description>` using the Conventional-Commit
  types, **ending with the issue number when the work has one** (e.g. `feat/prompt-registry-42`,
  `fix/api-client-timeout`) — enforced by the husky `pre-push` hook (`main` is exempt). Skipped
  in CI via `HUSKY=0`.
- **Never merge a PR autonomously — merge only on the user's explicit command.** Opening a PR
  and waiting for green CI is fine; running `gh pr merge` is not. A green PR → report it and stop.

## Release model — independent per package

- `projectsRelationship: "independent"`: each package versions and releases on its own cadence.
  A commit bumps only the packages whose files it touches.
- Tags follow `{projectName}@{version}` (e.g. `@fmmenchi/core@1.2.0`).
- Changelogs are **per project** (`packages/<scope>/<name>/CHANGELOG.md`) and each release
  creates a GitHub Release.
- `preVersionCommand` builds all packages before versioning.

## Publishing — GitHub Packages

- Registry: `https://npm.pkg.github.com`, mapped for the `@fmmenchi` scope in the root `.npmrc`.
  The scope **must** stay `@fmmenchi` (GitHub Packages requires scope = repo owner).
- Each package carries `publishConfig`, `repository` (with `directory`) and `files: ["dist"]`.
  No `private: true` — a package with it cannot be published.
- Publishing needs a token with `write:packages` (env `NODE_AUTH_TOKEN`, or the workflow
  `GITHUB_TOKEN` in Actions).

## Commands

```bash
pnpm nx release --dry-run            # always allowed — preview version/changelog/publish
pnpm nx release --first-release      # first ever release (no tags to diff against yet)
pnpm nx release                      # version + changelog + tag + push + publish
```

**Never run a non-dry-run `nx release`, publish, or merge a PR autonomously — only on the user's
explicit command.** Reporting a green dry-run and stopping is the correct behavior.

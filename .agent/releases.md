# Commits, branching & release — agent rules

## General

- **Always wait for green PR CI before any merge — no exceptions.** CI pending/failing → report
  and stop, even if the merge was requested.

## Conventional Commits — mandatory (they drive `nx release`)

- `feat:` → minor · `fix:` → patch · `feat!:`/`BREAKING CHANGE:` → major ·
  `build: ci: chore: refactor: docs: test: style: perf:` → no release.
- Enforced by commitlint via husky `commit-msg`; subject lowercase. Hooks skipped in CI
  (`HUSKY=0`).
- Humans commit with `git cz`; agents write the conventional message directly.

## Branching — trunk-based

- `main` is the only long-lived branch: short-lived branch → PR → merge → delete. No `develop`.
- Branch names: `<type>/<kebab-description>[-<issue-number>]` — enforced by the husky `pre-push`
  hook (`main` exempt).
- **Consolidate before merging:** rework the branch into a few self-contained conventional
  commits (`git reset --soft` + regrouped commits, or interactive rebase; force-push), then
  **rebase-merge — never squash** (`nx release` reads the individual commits).
- **Never merge a PR autonomously** — only on the user's explicit command.

## Release model — independent per package

- `projectsRelationship: "independent"`; tags `{projectName}@{version}`; per-project
  `CHANGELOG.md` + GitHub Release; `preVersionCommand` builds all.

## Publishing — GitHub Packages

- Registry `https://npm.pkg.github.com`; scope stays `@fmmenchi` (owner-bound); root `.npmrc`
  maps it.
- Publishable package: `publishConfig`, `repository` with `directory`, `files: ["dist"]`, no
  `private`.
- Publish auth: token with `write:packages` (`NODE_AUTH_TOKEN`, or Actions `GITHUB_TOKEN`).

## Commands

```bash
pnpm nx release --dry-run            # always allowed
pnpm nx release --first-release      # first ever release
pnpm nx release                      # only on the user's explicit command
```

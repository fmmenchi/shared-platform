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
  commits (`git reset --soft` + regrouped commits, or interactive rebase; force-push).
- **Merge with a merge commit — never fast-forward, never rebase-merge, never squash**
  (`gh pr merge --merge`; `nx release` reads the individual commits).
- **Never merge a PR autonomously** — only on the user's explicit command.

## Release model — independent per package, automated in CI

- `projectsRelationship: "independent"`; tags `{projectName}@{version}`; per-project
  `CHANGELOG.md` + GitHub Release; `preVersionCommand` builds all.
- **Automated:** every green push to `main` runs the `release` job in `.github/workflows/ci.yml`
  (serialized by a `concurrency` group). Auth is the built-in `GITHUB_TOKEN`
  (`contents:write` + `packages:write`) — no PAT.
- **Scoped to changed projects.** The job computes the projects whose OWN files changed since their
  last tag (`git log <tag>..HEAD -- <root>`) and runs `nx release --projects=<those>`. This is a
  workaround for [nx #34542](https://github.com/nrwl/nx/issues/34542): independent +
  conventionalCommits attributes root-file changes (`pnpm-lock.yaml`, workflows) to ALL projects and
  would bump every one. nx still bumps dependents of the changed set (`updateDependents`).
- `git.commit: false` (tags + push only, no release commit) so the release does not re-trigger CI;
  the current version is resolved from the tag, `fallbackCurrentVersionResolver: disk` otherwise.
- **Slack, inline.** A GitHub Release created with `GITHUB_TOKEN` does NOT trigger `on: release`
  workflows, so the release job announces each newly cut tag itself (one Slack message per package,
  from the release body, via `@fmmenchi/notify`). Secrets `SLACK_BOT_TOKEN`/`SLACK_CHANNEL_ID`
  absent → skips green. `notify-release.yml` is a `workflow_dispatch` manual test only.

## Publishing — GitHub Packages

- Registry `https://npm.pkg.github.com`; scope stays `@fmmenchi` (owner-bound); root `.npmrc`
  maps it.
- Publishable package: `publishConfig`, `repository` with `directory`, `files: ["dist"]`, no
  `private`.
- Publish auth: token with `write:packages` (`NODE_AUTH_TOKEN`, or Actions `GITHUB_TOKEN`).

## Commands

```bash
pnpm nx release --dry-run            # always allowed (preview)
pnpm nx release --first-release      # first ever release (no {projectName}@{version} tag yet)
pnpm nx release                      # a maintainer's local release; CI does this automatically on
                                     # every push to main, so rarely needed by hand
```

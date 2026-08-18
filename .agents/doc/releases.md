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
- **`nx release` scopes itself — no affected pre-filter.** The job runs plain `nx release` (via
  `packages/ops/ci` `release.js`), which versions **only the projects with releasing conventional
  commits** since their last tag: a docs- or workflow-only push releases nothing (verified — those
  files aren't project inputs), while a change that legitimately affects everything (`nx.json`, the
  lockfile) releases everything. An earlier `affected-releasable` pre-filter (guarding a since-fixed
  nx cascade) was **removed** — it was redundant and could have suppressed legitimate releases.
  `release.js` only adds what nx doesn't: a record of what the release did, which feeds the SBOM/announce
  steps the newly-cut package tags.
- **`git.commit: true` — the version bumps are committed back to `main`**, with `[skip ci]` in the
  message so the release does not re-trigger CI. nx pushes commit and tags in a single
  `git push --follow-tags --atomic`: a rejected push (a merge landed mid-run) leaves NOTHING behind,
  and the next release recomputes the same versions from the tags.

  It was `false` for a long time, and that was a silent defect rather than a preference. nx writes
  each new version into its `package.json` during the run; with nothing committed, every manifest in
  the repo stayed at `0.0.1` forever and the truth lived only in the tags. Everything that ASKS NX
  was fine. Everything that READS THE DISK was wrong — and `pnpm publish` is what substitutes a
  `workspace:*` dependency, off the disk. Four consecutive `@fmmenchi/ci` releases therefore shipped
  declaring `"@fmmenchi/notify": "0.0.1"`, a version that has never been published; a consumer could
  only install them with a `pnpm-workspace.yaml` override. Only `ci@0.0.13` was correct, because it
  happened to be released in the same run as notify — which is the whole diagnosis in one data point.

  The alternative (keep the manifests frozen and set `preserveLocalDependencyProtocols: false`) was
  measured and works, but it makes `pnpm` resolve the dependency from the REGISTRY at version time —
  a version that has not been published yet in the same run. Committing the bumps removes the class
  instead of routing around it.

- The current version is resolved from the tag (`conventionalCommits`), `fallbackCurrentVersionResolver: disk`
  otherwise — so a manifest and its tag can disagree without breaking a release. `CHANGELOG.md` files
  are written per project and committed with the bumps.
- **`versionActionsOptions.skipLockFileUpdate: true`**, and measured before switching it off: nx's
  lockfile step re-runs `pnpm install --lockfile-only`, which for a workspace version bump changes
  NOTHING semantic (local deps are `link:` entries) and rewrites all ~14k lines out of Prettier
  shape. Committed, that lockfile would turn the next push's `format:check --all` red — a red gate
  on a file no human touched. Skipped, `format:check` is green with nx's own writes in the tree,
  which was verified rather than assumed.
- **The git flags come from `nx.json`, not from `@fmmenchi/ci`.** The subcommand APIs refuse to run
  beside a top-level `release.git` unless `gitCommit`/`gitTag`/`stageChanges` are passed explicitly,
  so `gitFlagsFor()` reads this workspace's config and passes it through. It used to hardcode them,
  which silently overrode a consumer that keeps `commit: false` — a published script may choose the
  order of the steps, never whether another repo's trunk receives commits.
- **Slack, from its own job.** A GitHub Release created with `GITHUB_TOKEN` does NOT trigger
  `on: release` workflows, so the pipeline announces the releases itself — in an `announce` job that
  `needs: release` and reads the release record from an artifact. One message per released project,
  and the job is RED when a message it was asked to send did not arrive. Secrets
  `SLACK_BOT_TOKEN`/`SLACK_CHANNEL_ID` absent → skips green, with a `::notice::` saying how many were
  not sent. Announcing is a separate job precisely so it can be re-run without re-releasing.

## Publishing — GitHub Packages

- Registry `https://npm.pkg.github.com`; scope stays `@fmmenchi` (owner-bound); root `.npmrc`
  maps it.
- Publishable package: `publishConfig`, `repository` with `directory`, `files: ["dist"]`, no
  `private`.
- Publish auth: token with `write:packages` (`NODE_AUTH_TOKEN`, or Actions `GITHUB_TOKEN`).

## Commands

```bash
RELEASE_DRY_RUN=true node node_modules/@fmmenchi/ci/dist/release.js
                                     # rehearse what CI actually runs: it writes the record,
                                     # leaves the consumable tag list empty, and cuts nothing
pnpm nx release --first-release      # first ever release (no {projectName}@{version} tag yet)
pnpm nx release                      # a maintainer's local release; CI does this automatically on
                                     # every push to main, so rarely needed by hand
```

There is no `release-preview` job on pull requests any more. It ran `nx release --dry-run`, which
exercises a path CI does not use — the release job goes through `@fmmenchi/ci`'s own entrypoint — so
a green preview said nothing about the release that would follow. Rehearse the entrypoint instead,
with the command above.

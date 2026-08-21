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
- **The logic stays separate from the side effects.** `isPackageTag`, `tagsByProject`,
  `remoteReleaseProviderOf`, `toReleaseRecords` and `publishableProjects` take values and return
  values; every `git` call and file write lives in the two scripts. That split is the whole reason
  there are tests, and the interesting failures are all in the pure half — a glob matching a toolkit
  tag, a fixed group whose one tag names no project — none of which needs a repository to reproduce.
  A new behaviour goes in a pure function first.
- **READ nx's resolved config; never re-derive it.** This is the rule the whole release script was
  rewritten around, because it was broken twice in a row. `createNxReleaseConfig()` hands back the
  fully-defaulted config — `nxReleaseConfig.changelog.git` is, value for value, the git behaviour of
  the top-level `nx release` (nx's `changelogGitDefaults` are `commit: true`, `tag: true`, `push` on
  when a changelog asks for a hosted release, with the consumer's own `release.git` merged over).
  There used to be a `gitFlagsFor()` here that recomputed exactly those defaults with its own
  `?? true` chains: a mirror of a private implementation, kept honest only by a human rereading nx's
  source at every bump. It is gone, along with the `changelog-config.ts` that overrode a consumer's
  changelog config just to read a tag out of the result. Both were the same mistake — deriving what
  could be asked for.
- **Never decide a git flag for the consumer.** Hardcoding them shipped a real defect: `gitCommit:
true` (right for this workspace) overrode `release.git.commit: false` in a consumer that
  deliberately keeps its versions in tags only, killing their rehearsal with "No changed files to
  commit" and, on a real run, pushing bump commits to their trunk. A published release script may
  decide the ORDER of the steps; it may not decide whether somebody else's trunk receives commits.
  Reading the resolved config also hands the VALIDATION back to nx: a consumer who mixes
  `release.git` with a granular `release.version.git`, or disables the push while asking for a
  GitHub Release, is now rejected by nx with nx's own message instead of being quietly accommodated.
- **The git operations happen HERE, not in the subcommands.** `gitCommit`/`gitTag` are `false` for
  both `releaseVersion` and `releaseChangelog` (which is also what tells nx the top-level command is
  driving, so the flags are unconditional and can no longer be got wrong); they only STAGE, and this
  script then makes one commit, one set of tags and one push. That is exactly nx's own `release()`,
  and for its reason: nx's changelog step commits `tree.listChanges()` through `commitChanges`, which
  THROWS on an empty list — so on nx's DEFAULT changelog config (no changelog files) the version
  bumps would never be committed at all. A plain `gitCommit` of what is staged has no such hole.
- **Why not just call `release()`, then.** It returns `{ workspaceVersion, projectsVersionData,
releaseGraph }` and nothing else: it computes the tags and the rendered notes internally and throws
  them away. It also `process.exit(1)`s when a publish fails — taking the record with it — prompts
  interactively without `yes`, and publishes unconditionally, which blows up on a workspace whose
  released projects are all `private`. The composition here exists to keep the record and the
  ordering; it is not a preference.
- **The tag is formed by nx's own `ReleaseVersion`, from the pattern in the resolved config.** Ask
  the release graph WHICH group a project is in (`getReleaseGroupNameForProject`), ask the config
  WHAT PATTERN that group resolved (`groups[name].releaseTag.pattern`) — deliberately not
  `releaseGraph.getReleaseGroupForProject(...).releaseTag`, which nx reads at runtime but does not
  declare on `ReleaseGroupWithName`, and which therefore costs a cast. Both halves of the split stay
  type-checked. The result is cross-checked against `createGitTagValues()`, nx's own list of the tags
  it is about to cut, and a disagreement stops the release.
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
- **Publish LAST, and by us.** The combined `release()` is never called; the record is written
  before `releasePublish()` runs. nx exits the process from inside on a registry failure, so
  publishing within it destroyed the account of a release that had already tagged and pushed. Now a
  failed publish leaves tags, Releases and a record — and the announce job can be re-run alone.
  Keep that order: anything that writes the record must come before anything that can exit.
- **The version step must be told `gitPush: false`.** Not passing it is not the same as saying no:
  nx falls back to the resolved `release.version.git`, which INHERITS the consumer's top-level
  `push` — so on `git.push: true` that step pushes right after staging the bumps, before anything
  is committed or tagged. Caught in a rehearsal twice, the second time on the day it was dropped
  while moving the git operations into this script. Rehearse with `RELEASE_VERBOSE=true` and read
  the `git` commands: that is the only way this one is visible.
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

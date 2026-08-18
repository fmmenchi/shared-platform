---
title: Scripts and API
sidebar_label: Scripts and API
sidebar_position: 1
---

# Scripts and API

One script to run from a workflow, and the pure functions behind it.

---

## Scripts

### `release.js`

Releases through nx's **programmatic API** (`release()` from `nx/release` — the same function the
`nx release` CLI calls), then writes a record of what it did.

The record is the point. nx decides which projects release, at which version and under which tag
pattern; the script asks it, instead of photographing the git tags before and after and inferring the
answer. Each tag is **formed** from that project's own release-group pattern — so a group shaped
`gh-actions/v{version}` comes out right without anyone encoding `{project}@{version}` in a regex —
and then **verified against the tags git really has** before anything downstream sees it.

| Environment variable  | Default               | What it is                                                             |
| --------------------- | --------------------- | ---------------------------------------------------------------------- |
| `RELEASE_RESULT_FILE` | `release-result.json` | The record: `{ dryRun, releases: [{ project, version, tag }] }`        |
| `NEW_TAGS_FILE`       | `new_tags.txt`        | Transitional: the same records projected to package tags, one per line |
| `RELEASE_DRY_RUN`     | unset                 | `true` rehearses the whole script without releasing (see below)        |
| `GITHUB_TOKEN`        | —                     | Passed through for tags and GitHub Releases                            |
| `NODE_AUTH_TOKEN`     | —                     | Passed through for publishing                                          |

**The record is neutral.** It names no message, channel or artifact: releasing and announcing are
separate operations, so nothing message-shaped may live in the step that cannot be undone.

**A rehearsal writes no consumable output.** With `RELEASE_DRY_RUN=true` the record is stamped
`"dryRun": true` and `NEW_TAGS_FILE` is left **empty** — those tags do not exist yet, and a
downstream step handed one would announce a release nobody cut.

**Publishing happens last, and here rather than inside `release()`** (which is called with
`skipPublish`). nx exits the process from within on a registry failure, so publishing inside it
destroyed the record of a release that had already tagged and pushed. Now a failed publish leaves the
tags, the Releases **and** the record — so the announce job can be re-run on its own.

Toolkit tags are logged and excluded from `NEW_TAGS_FILE` — see [`isPackageTag`](#ispackagetag).

---

## API

The pure, unit-tested pieces. They take arrays and return values; every git side effect lives in the
scripts, which is what makes these testable at all.

### `isPackageTag`

```ts
isPackageTag(tag: string): boolean
```

Whether a tag is a published-package release — `@scope/name@x.y.z`. Toolkit tags such as
`gh-actions/v0.0.2` do **not** match: they are versioned and tagged but are not npm packages, so the
SBOM and announce steps, which parse `{project}@{version}`, would derive a project name that does not
exist.

It replaced a `*@*` glob with an explicit rule for exactly that reason: the glob was right by
accident and untestable by construction.

### `toReleaseRecords` / `publishableProjects`

```ts
toReleaseRecords(projectsVersionData, projectChangelogs): ReleaseRecord[]
publishableProjects(records, projectGraphNodes): ReleaseRecord[]
```

What nx returned, turned into `{ project, version, tag, notes }` — only for projects that actually got
a new version. Nothing is formed or parsed: the tag is `ReleaseVersion.gitTag` and the notes are the
rendered `contents`, both handed over by `releaseChangelog`. A released project with no tag throws
rather than being given an invented one.

`publishableProjects` answers "is there anything to publish?" — `nx-release-publish` is not created
for a `private` package, and `releasePublish` throws when nothing it matched has that target.

### `newTags`

```ts
newTags(before: readonly string[], after: readonly string[]): string[]
```

The tags present in `after` and not in `before`, sorted. Empty is a normal answer. No longer used by
`release.js` (which asks nx instead of diffing tags), kept for consumers that still diff.

---

## What is deliberately not here

**Message building.** `fmmenchi-notify` is the CI door; `@fmmenchi/notify` is the implementation,
so the Slack surface has one owner rather than two.

**An affected pre-filter.** See [Concepts](../concepts/index.md).

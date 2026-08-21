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
| `RELEASE_VERBOSE`     | unset                 | `true` makes nx print the `git` commands it is about to run            |
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
toReleaseRecords(projectsVersionData, tagByProject, projectChangelogs?): ReleaseRecord[]
publishableProjects(records, projectGraphNodes): ReleaseRecord[]
```

What nx returned, turned into `{ project, version, tag, notes }` — only for projects that actually got
a new version. Nothing is formed or parsed here: the version comes from `releaseVersion`, the tag from
`tagsByProject` below, the notes from `releaseChangelog` when the consumer configured changelogs at
all. A released project with no tag throws rather than being given an invented one.

The notes are optional and the tag is not, and that asymmetry is the point. Both used to come out of
`projectChangelogs`, which nx populates **only** for a consumer who configured project changelogs — so
on nx's default config the record could not be built at all, after the release had already been cut.

`publishableProjects` answers "is there anything to publish?" — `nx-release-publish` is not created
for a `private` package, and `releasePublish` throws when nothing it matched has that target.

### `tagsByProject` / `remoteReleaseProviderOf`

```ts
tagsByProject(projectsVersionData, graph, ReleaseVersion, expectedTags): Map<string, string>
remoteReleaseProviderOf(changelogConfig): unknown
```

`tagsByProject` is the only mapping that is per project. nx's own `createGitTagValues` returns a flat
list — one tag for a whole **fixed** group — so it can say which tags exist but not who owns each one.
The tag is formed here by nx's own `ReleaseVersion` (injected, so this stays testable) from the tag
pattern nx resolved onto the project's release group, then **cross-checked** against that flat list:
two answers out of the same source, and a disagreement stops the release rather than recording a tag
nobody will cut.

`remoteReleaseProviderOf` returns the hosted-release provider a resolved changelog config asks for, or
`undefined` for none — the one piece of nx's top-level `release()` that cannot be imported.

:::note[Why the tags are not read back out of git]

Because a tag cannot say which project it belongs to. This very workspace cuts two shapes from two
release groups — `@fmmenchi/ci@0.1.0` and `gh-actions/v0.4.0` — and the second contains no project
name to cut back out. Reading git also has nothing to read during a rehearsal, and re-derives, badly,
what `projectsVersionData` already states. `newTags(before, after)`, which diffed a photograph of the
tags taken before the release against one taken after, was this package's first answer to that
question; it was removed, unused, when the record replaced it.

:::

---

## What is deliberately not here

**Message building.** `fmmenchi-notify` is the CI door; `@fmmenchi/notify` is the implementation,
so the Slack surface has one owner rather than two.

**An affected pre-filter.** See [Concepts](../concepts/index.md).

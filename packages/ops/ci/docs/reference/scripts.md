---
title: Scripts and API
sidebar_label: Scripts and API
sidebar_position: 1
---

# Scripts and API

Two scripts to run from a workflow, and the pure functions behind them.

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

**One hole to know about**: `release()` calls `process.exit(1)` from inside nx on a publish failure,
so a run that tagged and published and then died writes **no** record at all. Never read a missing
record as "nothing was released".

Toolkit tags are logged and excluded from `NEW_TAGS_FILE` — see [`isPackageTag`](#ispackagetag).

### `move-major-alias.js`

Moves a moving-major tag alias to the latest exact `<prefix>X.Y.Z`.

| Environment variable | Default        | What it is                         |
| -------------------- | -------------- | ---------------------------------- |
| `ALIAS_PREFIX`       | `gh-actions/v` | The prefix the alias is built from |

Does nothing when no matching exact tag exists yet.

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

### `toReleaseRecords` / `formatTag` / `assertReleaseGroups`

```ts
toReleaseRecords(projectsVersionData, releaseGroups): ReleaseRecord[]
formatTag(pattern, project, version, releaseGroupName?): string
assertReleaseGroups(value: unknown): ReleaseGroupSummary[]
```

What nx returned, turned into `{ project, version, tag }` — only for projects that actually got a new
version. `formatTag` mirrors nx's own tag interpolation, sanitising the project name the way nx does
and filling every `{projectName}` / `{version}` / `{releaseGroupName}` occurrence.

Both refuse to guess: a group with no tag pattern, or a release graph that is not the shape these
functions read, throws. nx moved that property once already — a silent default would fabricate a
package-shaped tag, and the announce step would post about a release nobody cut.

### `newTags`

```ts
newTags(before: readonly string[], after: readonly string[]): string[]
```

The tags present in `after` and not in `before`, sorted. Empty is a normal answer. No longer used by
`release.js` (which asks nx instead of diffing tags), kept for consumers that still diff.

### `majorAlias`

```ts
majorAlias(
  tags: readonly string[],
  prefix: string,
): { alias: string; target: string } | null
```

The alias to move and the exact tag it should point at, or `null` when there is no `<prefix>X.Y.Z`
yet. Ordered by **semver**, not lexically — `v0.10.0` is above `v0.9.0`, which a string sort gets
backwards.

---

## What is deliberately not here

**Message building.** `fmmenchi-notify` is the CI door; `@fmmenchi/notify` is the implementation,
so the Slack surface has one owner rather than two.

**An affected pre-filter.** See [Concepts](../concepts/index.md).

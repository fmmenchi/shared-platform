---
title: Scripts and API
sidebar_label: Scripts and API
sidebar_position: 1
---

# Scripts and API

Two scripts to run from a workflow, and three pure functions behind them.

---

## Scripts

### `release.js`

Runs `nx release`, then diffs the git tags before and after and writes the newly cut **package** tags
to a file.

| Environment variable | Default        | What it is                                           |
| -------------------- | -------------- | ---------------------------------------------------- |
| `NEW_TAGS_FILE`      | `new_tags.txt` | Where the new package tags are written, one per line |
| `GITHUB_TOKEN`       | —              | Passed through to `nx release` for tags and releases |
| `NODE_AUTH_TOKEN`    | —              | Passed through for publishing                        |

Toolkit tags are logged and excluded — see [`isPackageTag`](#ispackagetag).

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

### `newTags`

```ts
newTags(before: readonly string[], after: readonly string[]): string[]
```

The tags present in `after` and not in `before`, sorted. Empty is a normal answer.

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

**Notifications.** The release job dogfoods the `@fmmenchi/nx-notify` plugin instead, so the Slack
surface has one implementation rather than two.

**An affected pre-filter.** See [Concepts](../concepts/index.md).

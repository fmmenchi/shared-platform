---
title: Keep a moving major alias
sidebar_label: Keep a major alias
sidebar_position: 2
---

# Keep a moving major alias

Move the `v0` a consumer pins to the latest exact tag, after every release.

## Intent

A reusable GitHub workflow or action is pinned by tag:

```yaml
uses: fmmenchi/shared-platform/.github/workflows/ci.reusable.yml@gh-actions/v0
```

That `v0` has to keep pointing at the newest `gh-actions/v0.Y.Z`, or every consumer is frozen at
whatever it meant the day they wrote it. `nx release` cuts exact tags and does not maintain aliases —
nothing does, unless you do.

## Wire it

```yaml
- name: Move the major alias
  run: node packages/ops/ci/dist/move-major-alias.js
  env:
    ALIAS_PREFIX: gh-actions/v
```

`ALIAS_PREFIX` defaults to `gh-actions/v`. The script finds every `<prefix>X.Y.Z`, picks the highest
by semver, and force-moves `<prefix>X` to it. With no such tag yet, it does nothing.

## The trap worth knowing

**`git fetch` does not update a local tag that already exists.** So a local `gh-actions/v0` can point
somewhere stale for weeks while the remote alias is perfectly correct — and it looks exactly like a
broken release script. This cost a real investigation once; the fix is
`git fetch --tags --force`, and the diagnosis is always to check the remote before the script:

```bash
git ls-remote --tags origin 'gh-actions/v*'
```

## Verify

After a release, the alias and the newest exact tag point at the same commit:

```bash
git rev-parse gh-actions/v0 gh-actions/v0.1.4
```

## Next steps

- [Scripts and API](../reference/scripts.md) — `majorAlias`, which is the pure half of this.

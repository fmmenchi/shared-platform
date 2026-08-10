---
title: Release from CI
sidebar_label: Release from CI
sidebar_position: 1
---

# Release from CI

Run `nx release` on a green push and hand the newly cut tags to whatever comes after it.

## Intent

Your release job needs to know **which packages it just released** — to attach an SBOM, to announce
them, to do anything per-package. `nx release` does not report that; it cuts tags. This script runs
the release and writes the difference.

## Wire it

```yaml
- run: pnpm nx build @fmmenchi/ci

- name: Configure git author
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

- name: Release
  run: node packages/ops/ci/dist/release.js
  env:
    NEW_TAGS_FILE: ${{ runner.temp }}/new_tags.txt
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The script reads the git tags, runs `nx release`, reads them again, and writes the **package** tags
that appeared to `NEW_TAGS_FILE` (default `new_tags.txt`), one per line.

## Then read them

Every step after it takes the file as its work-list:

```yaml
- name: Attach SBOMs
  run: |
    while read -r tag; do
      pkg="${tag%@*}"
      pnpm nx run "$pkg:sbom" --configuration=docker --output="$out"
    done < "${{ runner.temp }}/new_tags.txt"
```

An empty file means nothing was released, which is a normal outcome and not a failure: a
docs-only push cuts no tags.

## What is not in the file

**Toolkit tags.** A project can be versioned and tagged without being an npm package — this
workspace's `gh-actions` toolkit is tagged `gh-actions/v{version}`. Those are logged and kept out,
because the steps downstream parse `{project}@{version}` and would produce a project name that does
not exist. See [`isPackageTag`](../reference/scripts.md#ispackagetag).

## Gate it on a green build

The release job should `need` the job that runs the gate. When that gate fails the release job is
**skipped, not failed** — which looks like nothing happening rather than something breaking, so a
red gate means no tags, no releases and no publish, quietly. Worth knowing before you go looking for
a broken release script.

## Next steps

- [Keep a moving major alias](./keep-a-major-alias.md).
- [Scripts and API](../reference/scripts.md).

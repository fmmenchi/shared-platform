---
title: Compose the building blocks
sidebar_label: Compose the building blocks
sidebar_position: 2
---

# Compose the building blocks

Weave the composite actions (bricks) into your own job when a turnkey workflow isn't the right shape.

## Intent

You need finer control than a whole reusable workflow gives — a custom job order, extra steps
between the bricks, or only one brick. Use the composite actions directly at the **step** level.

## Step 1: Run `setup` first

Every brick that shells out to nx needs the workspace installed. Run `setup` after `checkout`:

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0
```

`setup` is pnpm + Node + a frozen install; pass `registry-url` on a job that publishes.

## Step 2: Add the bricks you need

```yaml
# vuln + secret scan with a per-day-cached DB
- uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/trivy-scan@gh-actions/v0

# after a release: attach an SBOM to each new tag, then announce them
- uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/attach-sbom@gh-actions/v0
  with:
    tags-file: ${{ runner.temp }}/new_tags.txt
    github-token: ${{ secrets.GITHUB_TOKEN }}
- uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/announce-releases@gh-actions/v0
  with:
    tags-file: ${{ runner.temp }}/new_tags.txt
    bot-token: ${{ secrets.SLACK_BOT_TOKEN }}
    channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

No brick names a project. Each one asks the graph which project owns the target it needs — inferred
(`<root>:scan-docker`, `<project>:announce-release`) or generated (`<project>:sbom`, opted in with
`nx g @fmmenchi/nx-trivy:sbom`) — so it works in any nx workspace, provided the plugins are
registered in your `nx.json` `plugins`. When nothing owns the target, the brick fails with a message
naming the command that fixes it, rather than passing quietly.

## The release job

Releasing has **no** turnkey workflow, deliberately: it must run after your own checks, and a called
workflow cannot require that of its caller. Here is the whole job — this is `shared-platform`'s own,
the one that actually cuts every `@fmmenchi/*` release, with the two lines that carry the decision
marked:

```yaml
jobs:
  gate: { … your typecheck / build / lint / test … }

  release:
    needs: gate # ← nothing else can enforce this for you
    if: github.ref == 'refs/heads/main' # ← releases come from the trunk only
    runs-on: ubuntu-latest
    # Two quick merges must not run `nx release` concurrently and race on the tag push.
    concurrency: { group: release, cancel-in-progress: false }
    permissions: { contents: write, packages: write }
    env: { HUSKY: 0 } # a CI install must not run git hooks
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 } # nx release reads the tag history

      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0
        with: { registry-url: 'https://npm.pkg.github.com' }

      - name: Configure git author
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      # Runs `nx release` and writes the newly cut {project}@{version} tags to NEW_TAGS_FILE,
      # which the next two bricks read. The tag diff lives in @fmmenchi/ci, unit-tested.
      - name: Release
        run: node node_modules/@fmmenchi/ci/dist/release.js
        env:
          NEW_TAGS_FILE: ${{ runner.temp }}/new_tags.txt
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/attach-sbom@gh-actions/v0
        with:
          tags-file: ${{ runner.temp }}/new_tags.txt
          github-token: ${{ secrets.GITHUB_TOKEN }}

      # A Release created with GITHUB_TOKEN does not trigger other workflows, so a
      # `release: published` listener would never fire — announce inline instead.
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/announce-releases@gh-actions/v0
        with:
          tags-file: ${{ runner.temp }}/new_tags.txt
          bot-token: ${{ secrets.SLACK_BOT_TOKEN }}
          channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Prerequisites: `@fmmenchi/ci` installed, and an `nx release` config with the
`{projectName}@{version}` tag pattern (`@fmmenchi/ci` classifies new tags by it).

:::tip[Other ways to sequence it]

`needs:` is the idiomatic one, but not the only one. A separate workflow on
`workflow_run` (gated by `github.event.workflow_run.conclusion == 'success'`) keeps checks and
release in different files, and an approval `environment:` on the release job adds a human in front
of it. All three are the caller's to choose — which is the reason this is a job you own and not a
workflow you call.

:::

## Related

- [Reuse a whole workflow](./reuse-a-workflow.md) — the turnkey path, for `security` and `docs`.
- [Composite actions reference](../reference/actions.md) — every input.

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

## Related

- [Reuse a whole workflow](./reuse-a-workflow.md) — the turnkey path.
- [Composite actions reference](../reference/actions.md) — every input.

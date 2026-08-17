---
title: Reuse a whole workflow
sidebar_label: Reuse a whole workflow
sidebar_position: 1
---

# Reuse a whole workflow

Call a turnkey reusable workflow (`security`, `docs`) as a **job** — you own the triggers, it does
the work.

There is no release equivalent, and that is a decision rather than a gap: a release must run **after**
your own checks, and a called workflow cannot require that of its caller. It is
[bricks in a job you own](./compose-bricks.md#the-release-job) instead.

## Intent

You want a complete pipeline (vuln + secret scan, or a docs deploy)
without assembling the steps yourself. A reusable workflow gives you that in one `uses:` line.

## Step 1: Create a caller workflow

A reusable workflow has no triggers of its own, so you write a normal workflow with the triggers, and
call the reusable at the **job** level:

```yaml
# .github/workflows/security.yml in your repo
name: Security
on: # ← the triggers are yours
  pull_request:
    paths: ['pnpm-lock.yaml', '**/package.json']
  push:
    branches: [main]
    paths: ['pnpm-lock.yaml', '**/package.json']
  schedule:
    - cron: '0 6 * * 1' # weekly audit

jobs:
  security:
    uses: fmmenchi/shared-platform/.github/workflows/security.reusable.yml@gh-actions/v0
    with:
      alert-on-failure: ${{ github.event_name == 'schedule' }} # alert only on the weekly run
    secrets: inherit # pass SLACK_BOT_TOKEN / SLACK_CHANNEL_ID
```

## The four parts

| Part                                   | What it does                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `on:`                                  | **Your** triggers — the reusable only has `workflow_call`.                      |
| `uses: …/x.reusable.yml@gh-actions/v0` | At the **job** level; the whole job becomes the reusable. Pin the moving major. |
| `with:`                                | The reusable's inputs (see [reference](../reference/workflows.md)).             |
| `secrets: inherit`                     | Pass all your secrets in one line — or map them explicitly.                     |

## Docs — same mechanic

```yaml
# .github/workflows/docs.yml
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  docs:
    uses: fmmenchi/shared-platform/.github/workflows/docs.reusable.yml@gh-actions/v0
    with:
      docs-project: '@myorg/docs'
      docs-output: apps/docs/build
```

## Related

- [Compose the building blocks](./compose-bricks.md) — when the turnkey workflow isn't enough.
- [Reusable workflows reference](../reference/workflows.md) — every input.

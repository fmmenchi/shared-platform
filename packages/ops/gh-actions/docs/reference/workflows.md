---
title: Reusable workflows
sidebar_label: Reusable workflows
sidebar_position: 1
---

# Reusable workflows

**This toolkit has none.** All three it once shipped were removed, each after a specific failure, and
the reasons are kept here because "why is there no turnkey workflow?" is the first thing a consumer
asks.

What it ships instead: [composite actions](./actions.md), wired into
[a job you own](../guides/compose-bricks.md).

---

## The structural reason, found last

GitHub discovers a reusable workflow **only** under `.github/workflows/`. A file there belongs to no
nx project — so `nx release` never sees it change. Measured: a commit touching only
`security.reusable.yml`, typed `fix(gh-actions)`, leaves nx reporting _"No changes were detected"_.
Nothing released it and no target checked it.

The consequences were not hypothetical. Its internal `uses:` pins sat at `@gh-actions/v0.1.2` while
the toolkit shipped `v0.3.1` — two minors of drift, invisible. It declared `contents: read` and not
`packages: read`, so a consumer whose lockfile holds `@fmmenchi/*` got a 401 from the install. And
those pins **cannot** be made relative: `./` inside a called workflow resolves against the
_caller's_ checkout, not ours.

A composite action has none of these problems: it lives in the project, so changing it releases the
toolkit and every gate runs over it.

## `security` — removed

It was four steps: checkout, `setup`, `trivy-scan`, and a Slack alert on failure. The first consumer
to read it declined it and wired the bricks by hand, which is the clearest verdict a turnkey
convenience can get. It is now [a guide](../guides/run-a-security-scan.md) with the job to copy.

## `docs` — removed

It **carried nothing of ours**: `checkout`, `setup`, an `nx run`, a `cp`, and three
`actions/*-pages` steps — GitHub's own boilerplate with a build in the middle. A reusable workflow is
worth a pin when it holds logic you should not reimplement; that one held a Node version, a registry
and two target names, all of which are yours. Now [a guide](../guides/deploy-a-docs-site.md), which
also carries the part that was actually worth sharing: **Pages allows exactly one deployment per
repository**, so a docs site and a Storybook cannot be two workflows.

## `release` — never possible

Two reasons, and the second settles it.

A release must run **after** your checks, and a called workflow cannot require that of its caller.
GitHub can express the ordering — `needs:`, `workflow_run`, an approval `environment` — but only the
caller can write it. A turnkey release would hide the one decision that is genuinely yours and
enforce none of it.

And it could never be dogfooded. It has to run the release script from **somewhere**, and where that
is depends on how the repo is built: `node_modules/@fmmenchi/ci/…` in a consumer, but a source
project in `shared-platform`, which has no `node_modules/@fmmenchi` at all. A brick we cannot run
here is a brick we cannot promise you. It is [bricks in a job you own](../guides/compose-bricks.md#the-release-job).

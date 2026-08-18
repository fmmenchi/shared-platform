---
title: Reusable workflows
sidebar_label: Reusable workflows
sidebar_position: 1
---

# Reusable workflows

Call any of these as a **job** (`uses: fmmenchi/shared-platform/.github/workflows/<name>@gh-actions/v0.1.2`),
with `secrets: inherit`. All expect an nx workspace with the plugins registered in `nx.json`.

---

## `security.reusable.yml`

Vulnerability + secret scan (via `@fmmenchi/nx-trivy`, docker runner, per-day-cached DB), with an
optional Slack alert.

### Inputs

| Input              | Type    | Default       | Description                                                                       |
| :----------------- | :------ | :------------ | :-------------------------------------------------------------------------------- |
| `secret-scan`      | boolean | `true`        | Also run the secret scan after the vulnerability scan.                            |
| `alert-on-failure` | boolean | `false`       | Post a Slack alert if the scan fails. Gate it yourself (e.g. only on `schedule`). |
| `app-name`         | string  | the repo name | Name used in the Slack alert.                                                     |

### Secrets

`SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` (both optional — absent → the alert skips green).

---

## Release — there isn't one, on purpose

Releasing is **bricks only**: see [compose the bricks](../guides/compose-bricks.md#the-release-job).
Two reasons, and the second is the one that settles it.

A release must run **after** your checks, and a called workflow cannot require that of its caller —
GitHub can express the ordering (`needs:` in your job graph, `workflow_run`, an approval
`environment`), but only the caller can express it. A turnkey release would therefore hide the one
decision that is genuinely yours, and enforce none of it.

And it could never be dogfooded. Such a workflow has to run the release script from **somewhere**,
and where that is depends on how the repo is built: in a consumer it is
`node_modules/@fmmenchi/ci/dist/release.js`, while in shared-platform `@fmmenchi/ci` is a source
project with no `node_modules/@fmmenchi` at all. A brick we cannot run here is a brick we cannot
promise you — which is exactly what the old `release.reusable.yml` was, until it was removed.

---

## Docs — there isn't one either

Deploying a docs site to Pages is [a job you own](../guides/deploy-a-docs-site.md).

The release workflow above was removed because it could not be dogfooded. This one was removed for a
simpler reason: **it carried nothing of ours**. Its steps were `checkout`, `setup`, `nx run`, `cp`,
and three `actions/*-pages` steps — GitHub's own boilerplate with a build in the middle. A reusable
workflow is worth a pin when it holds logic you should not reimplement; that one held a Node version,
a registry and two target names, all of which are yours.

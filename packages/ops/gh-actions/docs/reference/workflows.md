---
title: Reusable workflows
sidebar_label: Reusable workflows
sidebar_position: 1
---

# Reusable workflows

Call any of these as a **job** (`uses: fmmenchi/shared-platform/.github/workflows/<name>@gh-actions/v0`),
with `secrets: inherit`. All expect an nx workspace with the plugins registered in `nx.json`.

---

## `security.reusable.yml`

Vulnerability + secret scan (via `@fmmenchi/nx-trivy`, docker runner, per-day-cached DB), with an
optional Slack alert.

### Inputs

| Input              | Type    | Default       | Description                                                                                             |
| :----------------- | :------ | :------------ | :------------------------------------------------------------------------------------------------------ |
| `secret-scan`      | boolean | `true`        | Also run the secret scan after the vulnerability scan.                                                  |
| `alert-on-failure` | boolean | `false`       | Post a Slack alert if the scan fails. Gate it yourself (e.g. only on `schedule`).                       |
| `app-name`         | string  | the repo name | Name used in the Slack alert.                                                                           |
| `announce-project` | string  | –             | A publishable project whose inferred `announce-error` runs the alert. Required when `alert-on-failure`. |

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

## `docs.reusable.yml`

Build an nx docs site (Docusaurus via `@fmmenchi/nx-docusaurus`) and deploy it to GitHub Pages,
optionally with a Storybook under `/storybook/`.

### Inputs

| Input               | Type   | Default | Description                                                                      |
| :------------------ | :----- | :------ | :------------------------------------------------------------------------------- |
| `docs-project`      | string | –       | **Required.** The nx project that builds the site (its `build` target).          |
| `docs-output`       | string | –       | **Required.** The built site directory to deploy (e.g. `apps/docs/build`).       |
| `storybook-project` | string | `''`    | Optional nx project with a `build-storybook` target → rides under `/storybook/`. |
| `storybook-static`  | string | `''`    | The storybook static output dir (required when `storybook-project` is set).      |

The caller needs `permissions: { contents: read, pages: write, id-token: write }`.

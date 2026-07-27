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

## `release.reusable.yml`

Version + tag the affected projects (`nx release`), attach a CycloneDX SBOM to each release, and
announce each to Slack. Needs `@fmmenchi/ci` installed and the same nx release setup.

### Inputs

| Input          | Type   | Default                      | Description                 |
| :------------- | :----- | :--------------------------- | :-------------------------- |
| `registry-url` | string | `https://npm.pkg.github.com` | npm registry to publish to. |

### Secrets

`SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` (optional). `GITHUB_TOKEN` is used automatically
(`contents: write`, `packages: write`).

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

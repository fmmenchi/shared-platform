---
title: Announce a Release
sidebar_label: Announce a release
sidebar_position: 1
---

# Announce a Release

Send a Slack message with a changelog when a package is released, using the `announce-release`
executor.

## Intent

A release is only useful when people know it happened. This guide adds an `announce-release` target
to a project and drives it from a CI release job so every cut tag posts to Slack — the version, a
link, and the commits it spans — without a token ever landing in the project graph.

## Step 1: Add the target

Declare the executor on the consuming project. `appName` defaults to the project the target runs on,
so no options are required:

```jsonc
// project.json
"targets": {
  "announce-release": {
    "executor": "@fmmenchi/nx-notify:announce-release"
  }
}
```

## Step 2: Provide the Slack secrets

The executor reads `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` from the environment — never as options.
Export them from your CI secrets store; if either is missing the run skips green rather than failing.

## Step 3: Pass the release facts

Give the executor a version and (optionally) a link and a changelog range. Each option falls back to
a `RELEASE_*` env var, which is what CI usually sets:

```bash
SLACK_BOT_TOKEN=… SLACK_CHANNEL_ID=… \
RELEASE_VERSION=1.2.0 RELEASE_URL=https://github.com/org/repo/releases/tag/v1.2.0 \
RELEASE_FROM=<sha-or-tag> RELEASE_TO=<sha-or-tag> \
  pnpm nx run myproject:announce-release
```

The executor runs `git log <from>..<to>`, builds a Wishew-style changelog and announces it. An empty
`version` means there is nothing to announce, and the run skips green.

:::tip[Use release notes verbatim]

If you already have rendered notes — a GitHub Release body, say — pass them as `body` (or
`RELEASE_BODY`). They are used as the changelog verbatim and the git range is ignored, so no `git`
access is needed:

```bash
RELEASE_VERSION=1.2.0 RELEASE_BODY="$(gh release view v1.2.0 --json body --jq .body)" \
  pnpm nx run myproject:announce-release --appName=myproject
```

:::

## Step 4: Wire it into CI

In a release job, loop over the tags you just cut and announce each one. This is exactly how
`shared-platform` dogfoods the plugin — a GitHub Release created with the built-in token does not
trigger `on: release` workflows, so it announces inline instead:

```bash
while IFS= read -r tag; do
  pkg=${tag%@*}          # {projectName}@{version} → strip the trailing @version
  version=${tag##*@}
  body=$(gh release view "$tag" --json body --jq .body)
  url=$(gh release view "$tag" --json url --jq .url)
  RELEASE_VERSION="$version" RELEASE_URL="$url" RELEASE_BODY="$body" \
    pnpm nx run @fmmenchi/nx-notify:announce-release --appName="$pkg"
done < new_tags.txt
```

The `announce-release` target `dependsOn` `build`, so Nx builds the plugin on demand — no separate
build step is required.

## Related

- [Announce an error](./announce-an-error) — the alert counterpart.
- [Executors reference](../reference/executors) — every option and its env fallback.
- [Concepts](../concepts) — why secrets stay out of options and why a missing config skips green.

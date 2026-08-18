---
title: Deploy a docs site
sidebar_label: Deploy a docs site
sidebar_position: 3
---

# Deploy a docs site (and a Storybook beside it)

Build an nx docs project and publish it to GitHub Pages, optionally with a Storybook under
`/storybook/`.

## Intent

You want the site your repo already builds to end up on Pages on every push to your trunk. There is
**no reusable workflow** for this, deliberately — see [why](#why-this-is-a-job-you-own) — so here is
the whole job, ready to copy.

## The one thing that is easy to get wrong

**Pages allows exactly one deployment per repository.** A docs site and a Storybook therefore cannot
be two workflows: the second deploy silently replaces the first, and the only symptom is that one of
your two sites keeps disappearing. Build both in one job and put the second under a subpath.

## The job

```yaml
name: Docs
on:
  push: { branches: [main] }
  workflow_dispatch:

permissions:
  contents: read
  pages: write # publishing to Pages
  id-token: write # deploy-pages authenticates with OIDC
  packages: read # only if your install pulls @fmmenchi/* from GitHub Packages

concurrency: { group: pages, cancel-in-progress: false }

jobs:
  build:
    runs-on: ubuntu-latest
    env: { HUSKY: 0 } # a CI install must not run git hooks
    steps:
      - uses: actions/checkout@v7

      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0.2.0
        with:
          node-version: '24' # your .nvmrc, if you pin one
          registry-url: https://npm.pkg.github.com # only for GitHub Packages installs

      - run: pnpm nx run <your-docs-project>:build

      # Optional: a Storybook under /storybook/. Its static build uses relative asset
      # paths, so any subpath works.
      - run: |
          pnpm nx run <your-ui-project>:build-storybook
          cp -r <storybook-static-dir> <docs-output-dir>/storybook

      - uses: actions/configure-pages@v6
        with: { enablement: true }

      - uses: actions/upload-pages-artifact@v5
        with: { path: <docs-output-dir> }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

`NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` at job or workflow level is what makes the
`registry-url` above work — GitHub Packages wants a token even for public packages, and pnpm reports
its 403 as `ERR_PNPM_TARBALL_URL_MISMATCH`, which names nothing.

## Why this is a job you own

Read the steps: `checkout`, `setup`, an `nx run`, a `cp`, and three `actions/*-pages` steps. **None of
it is @fmmenchi logic.** It is GitHub's own Pages boilerplate with a build in the middle.

A reusable workflow earns its place when it carries logic a consumer should not reimplement — the way
[`security.reusable.yml`](../reference/workflows.md) carries the scan-host lookup, the loud failure
when nothing owns the target, the per-day DB cache and a counted Slack alert. There used to be a
`docs.reusable.yml` here too; it carried none of that, and everything it hid was either standard or
your own (your Node version, your registry, your target names). Pinning it bought you a two-release
lag and an inability to insert a step, in exchange for thirty lines you can read.

The knowledge worth sharing was never the YAML. It is the sentence at the top of this page.

## Related

- [Compose the building blocks](./compose-bricks.md) — the same reasoning, applied to the release job.
- [Run a security scan](./run-a-security-scan.md) — what a reusable workflow is still right for.

---
title: Generate an SBOM
sidebar_label: Generate an SBOM
sidebar_position: 3
---

# Generate an SBOM

Produce a CycloneDX SBOM (software bill of materials) for a single package — the artifact to attach
to that package's published release.

## Intent

A published `@fmmenchi/*` package is consumed by deployable projects that need to know its full
dependency closure for supply-chain audits. The `sbom` target describes **one project's production
dependencies** — not the whole workspace, the way `scan` does — so each release ships its own bill
of materials.

## Why it can't just scan the package folder

A pnpm monorepo has **no per-package lockfile** — there's one lock at the root for the whole
workspace. Point Trivy at a package directory and it finds nothing to resolve, so the SBOM comes back
empty. The `sbom` executor reconstructs the missing lock: nx's `createPackageJson` prunes the project
to its real dependency closure and `createLockFile` emits the matching pnpm lock, which Trivy then
reads. The result is exactly what a consumer installs.

## Step 1: Run it

```bash
pnpm nx run @fmmenchi/nx-trivy:sbom --projectName=@fmmenchi/ui
```

`--projectName` is required to describe a package other than the plugin itself. (`project` is
reserved by nx — it redirects the target — so the option is `projectName`.) The SBOM lands at
`<projectRoot>/sbom.cdx.json` unless you pass `--output`.

With the local runner the `trivy` CLI must be on PATH (`brew install trivy`). No local install? Use
the Docker runner — it needs only Docker:

```bash
pnpm nx run @fmmenchi/nx-trivy:sbom --projectName=@fmmenchi/ui --runner=docker
```

## Step 2: Choose the output and format

```bash
# a specific path — RELATIVE to the workspace root (it is joined with the root)
pnpm nx run @fmmenchi/nx-trivy:sbom --projectName=@fmmenchi/ui --output=dist/ui.cdx.json

# SPDX instead of CycloneDX
pnpm nx run @fmmenchi/nx-trivy:sbom --projectName=@fmmenchi/ui --format=spdx-json
```

:::warning[`output` is relative]

`output` is joined with the workspace root, so pass a **relative** path. An absolute path gets
mangled by the join.

:::

## In CI

The `release` job in `.github/workflows/ci.yml` attaches an SBOM to every newly published GitHub
Release: for each new `{project}@{version}` tag it runs the `sbom` target with `--runner=docker`
(the runner has Docker but no `trivy`) and uploads the file with `gh release upload`. The step is
**non-fatal** — the release is already out, so a failed SBOM never fails the job.

## Related

- [Executors reference](../reference/executors.md#sbom) — the full option list.
- [Run a scan](./run-a-scan.md) — vulnerability and secret scanning.

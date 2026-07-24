# AGENTS.md — @fmmenchi/nx-trivy

Nx plugin: run [Trivy](https://trivy.dev) security scans as an Nx target. Part of `shared-platform`;
workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `plugins`, type `plugin`.
Long-form docs — [concepts](./docs/concepts/index.md), [guides](./docs/index.md),
[reference](./docs/reference/executors.md) — live in [`docs/`](./docs/index.md); point there for
rationale rather than duplicating it here.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-trivy
pnpm nx build @fmmenchi/nx-trivy
pnpm nx lint @fmmenchi/nx-trivy
pnpm nx test @fmmenchi/nx-trivy          # node vitest (arg builders)
pnpm nx run @fmmenchi/nx-trivy:scan            # vuln scan (local trivy CLI)
pnpm nx run @fmmenchi/nx-trivy:scan-docker     # vuln scan via the aquasec/trivy image (no local CLI)
pnpm nx run @fmmenchi/nx-trivy:scan-secrets        # secret scan (local)
pnpm nx run @fmmenchi/nx-trivy:scan-secrets-docker # secret scan via the image
pnpm nx run @fmmenchi/ui:sbom                  # CycloneDX SBOM (target inferred on every publishable package)
```

## Shape

- **Two executors (`scan`, `sbom`), no generators.** `scan` runs `trivy <scanType> …` from the
  **workspace root** (`context.root`), so it is a workspace-wide scan regardless of the host project.
  Default vector: `trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .`.
  Options mirror Trivy's own flags (`runner`, `dockerImage`, `cacheDir`, `scanType`, `path`,
  `scanners`, `severity`, `failOnFindings`, `format`, `ignorefile`, `extraArgs`) — full table in
  [reference/executors.md](./docs/reference/executors.md).
- **`sbom`** emits a per-project **CycloneDX SBOM**. A pnpm monorepo has no per-package lockfile, so
  it reconstructs one — nx's `createPackageJson` + `createLockFile` prune the project to its real
  dependency closure and Trivy reads that pruned lock. Unlike `scan`, the SBOM **is** a per-package
  artifact, so the plugin's `createNodesV2` **infers a `sbom` target onto every publishable package**
  (`packages/<scope>/<name>` with a `name`, not `private`) — run it as `nx run <pkg>:sbom`, no
  `--projectName` needed. CI attaches one to each published GitHub Release (docker runner). See
  [reference/executors.md](./docs/reference/executors.md).
- **Two runners** (`runner`): `local` (the `trivy` CLI, default) or `docker` (the `aquasec/trivy`
  image — mounts the workspace at `/workspace`, needs only Docker). The vuln DB caches in a named
  volume by default; pass `cacheDir` to bind-mount a host dir instead so CI can persist it via
  `actions/cache`.
- **Targets** on the plugin's own project — `scan`/`scan-docker` (vuln) and
  `scan-secrets`/`scan-secrets-docker` (the same executor with `scanners: secret`, skipping
  `node_modules`/`dist`/`build`/`.nx`/`.git` via `extraArgs` to avoid noise) — all `dependsOn: build`.
  The CI `security` job runs both the vuln and secret docker targets.
- **`buildTrivyArgs` / `buildDockerArgs`** — the pure arg-vector builders (unit-tested); the
  shell-out itself needs no test.

## Rules

- **Workspace-level by design** ([ADR-0007](../../../apps/docusaurus/docs/adr/0007-security-scanning-workspace-level.md),
  [concepts](./docs/concepts/index.md)): one scan of `.` is correct, not per-project. Per-app
  image/Dockerfile scanning is a future executor for consumer repos that ship deployable apps.
- **Trivy is an external CLI.** A missing binary (`trivy`, or `docker` for the docker runner) fails
  loudly with an install hint — never a silent pass; a non-zero exit (findings at/above `severity`
  when `failOnFindings` is on) fails the target.
- **Standard names.** Options are Trivy's own flag vocabulary — no bespoke aliases.
- **Inference tracks the artifact's level.** `scan` is **workspace-level** — inferring it onto every
  project would mean N redundant identical root scans, so it is not inferred (consumers define their
  own `scan`/`scan-docker` target to invoke it by name). `sbom` is **project-level** — every
  publishable package wants exactly one — so `createNodesV2` **does** infer a `sbom` target onto each.
  The plugin is registered in the root `nx.json` `plugins` for that inference to run.

## Use from a consumer

```jsonc
// a target on any project — it scans the workspace root either way
"scan": { "executor": "@fmmenchi/nx-trivy:scan" }
```

A `.trivyignore.yaml` at the scan root is picked up automatically. shared-platform's own CI dogfoods
this (`.github/workflows/security.yml`): `nx run @fmmenchi/nx-trivy:scan-docker` on **dep changes
and a weekly schedule**; the weekly run's findings alert Slack via `@fmmenchi/nx-notify`. See
[scan in CI](./docs/guides/scan-in-ci.md) for DB caching and cadence. Local CLI: `brew install trivy`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

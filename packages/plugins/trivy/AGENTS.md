# AGENTS.md — @fmmenchi/nx-trivy

Nx plugin: run [Trivy](https://trivy.dev) security scans as an Nx target. Part of `shared-platform`;
workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `plugins`, type `plugin`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-trivy
pnpm nx build @fmmenchi/nx-trivy
pnpm nx lint @fmmenchi/nx-trivy
pnpm nx test @fmmenchi/nx-trivy          # node vitest (arg builders)
pnpm nx run @fmmenchi/nx-trivy:scan        # dogfood: scan THIS workspace (local trivy CLI)
pnpm nx run @fmmenchi/nx-trivy:scan-docker # same, via the aquasec/trivy Docker image (no local CLI)
```

## Shape

- **executor `scan`** — runs `trivy <scanType> …` from the **workspace root** (`context.root`), so it
  is a workspace-wide scan regardless of the host project. Default: `trivy fs --scanners vuln
--severity CRITICAL,HIGH --exit-code 1 .` — dependency vulnerabilities across the single pnpm
  lockfile, failing on CRITICAL/HIGH. Options mirror Trivy's own flags (`scanType`, `path`,
  `scanners`, `severity`, `failOnFindings`, `format`, `ignorefile`, `extraArgs`).
- **Two runners** (`runner`): `local` (the `trivy` CLI, default) or `docker` (the `aquasec/trivy`
  image — mounts the workspace at `/workspace`, needs only Docker). The `scan-docker` target is the
  docker runner pre-set. The vuln DB caches in a named volume by default; pass `cacheDir` to
  bind-mount a host dir instead so **CI can persist it via `actions/cache`**.
- **`buildTrivyArgs` / `buildDockerArgs`** — the pure arg-vector builders (unit-tested); the
  shell-out itself needs no test.

## Rules

- **Workspace-level by design** ([ADR-0007](../../../apps/docusaurus/docs/adr/0007-security-scanning-workspace-level.md)):
  dependency vulnerabilities live in the single root `pnpm-lock.yaml` and secrets can be anywhere, so
  one scan of `.` is correct — not per-project. Per-app image/Dockerfile scanning (`nx affected`
  friendly) is a future executor for consumer repos that ship deployable apps.
- **Trivy is an external CLI.** A missing binary fails loudly with an install hint (never a silent
  pass); a non-zero exit — findings at/above `severity` when `failOnFindings` is on — fails the
  target.
- **Standard names.** Options are Trivy's own flag vocabulary — no bespoke aliases.

## Use from a consumer

```jsonc
// a target on any project — it scans the workspace root either way
"scan": { "executor": "@fmmenchi/nx-trivy:scan" }
```

A `.trivyignore.yaml` at the scan root is picked up automatically. shared-platform's own CI dogfoods
this (`.github/workflows/security.yml`): `nx run @fmmenchi/nx-trivy:scan-docker --cacheDir=<dir>`
with `<dir>` persisted by `actions/cache` — on push/PR **and a weekly schedule** (a fresh DB catches
newly-disclosed CVEs). On findings it alerts Slack via `@fmmenchi/nx-notify`. For a local CLI:
`brew install trivy`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

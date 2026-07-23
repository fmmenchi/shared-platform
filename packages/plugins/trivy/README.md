# @fmmenchi/nx-trivy

Nx executor that runs [Trivy](https://trivy.dev) security scans as an Nx target. Defaults to a
**workspace-wide dependency-vulnerability scan** that fails on CRITICAL/HIGH.

```jsonc
// a target on any project — it scans the workspace root either way
"scan": { "executor": "@fmmenchi/nx-trivy:scan" }
```

```bash
pnpm nx run <project>:scan                  # trivy fs --scanners vuln --severity CRITICAL,HIGH --exit-code 1 .
pnpm nx run <project>:scan --runner=docker  # via the aquasec/trivy image — no local trivy needed
```

## Runners

- **`local`** (default) — needs the `trivy` CLI on PATH (`brew install trivy`).
- **`docker`** — runs the `aquasec/trivy` image (mounts the workspace, caches the vuln DB in a named
  volume). Only Docker required — ideal for CI.

## Options

Trivy's own flags: `scanners` (`vuln`), `severity` (`CRITICAL,HIGH`), `failOnFindings` (`true`),
`format`, `ignorefile`, `scanType`, `path`, `extraArgs`; plus `runner`, `dockerImage`.

Why workspace-level (not per-project/per-app): [ADR-0007](../../../apps/docusaurus/docs/adr/0007-security-scanning-workspace-level.md).

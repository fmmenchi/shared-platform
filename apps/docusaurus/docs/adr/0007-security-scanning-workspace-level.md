# ADR 0007 — Security scanning is workspace-level

- **Status:** accepted (2026-07-22)
- **Date:** 2026-07-22
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Adding Trivy security scanning to the platform (the `@fmmenchi/nx-trivy` plugin). The design
question: should a scan run **workspace-level** (once, over the whole repo) or **per-project /
per-app**?

## Decision

**Workspace-level, as the default and primary gate.** The right level follows from what Trivy
scans:

- **Dependency vulnerabilities** — a pnpm monorepo resolves through a **single root
  `pnpm-lock.yaml`** (deps hoisted/shared). The vulnerability surface _is_ the workspace; scanning
  per-project would be redundant (same resolution) or wrong (miss the shared lock).
- **Secrets** — can live anywhere in the tree → scan the whole thing once.
- **Container images / Dockerfile misconfig** — these _are_ per-app (each deployable app builds its
  own image). But **shared-platform ships no deployable apps** (libraries only; the docs site in
  `apps/` isn't containerized), so this dimension does not apply here.

The `@fmmenchi/nx-trivy` `scan` executor therefore runs from the **workspace root**
(`context.root`) over `.`, mounted on any host project. Default:
`trivy fs --scanners vuln --severity CRITICAL,HIGH --exit-code 1 .`. It runs via the local `trivy`
CLI or the `aquasec/trivy` Docker image (`runner: docker`).

Per-app image/Dockerfile scanning is **deferred** to a future, `nx affected`-friendly executor for
**consumer repos** that build deployable images — not shared-platform's concern.

## Consequences

- One scan target, workspace-wide, is the security gate; no per-project fan-out.
- Extensible without redesign: enabling secret/misconfig scanners is an option flip (`scanners`),
  and per-app image scanning is an additive executor later.
- Consumers with deployable apps will pair this workspace scan with a per-app image scan when that
  executor lands.

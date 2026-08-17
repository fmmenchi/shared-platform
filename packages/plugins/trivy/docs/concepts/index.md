---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Why `@fmmenchi/nx-trivy` scans the way it does, and how the executor works inside.

---

## 💡 The Philosophy

### 1. Workspace-level, not per-project

The scan always runs from the **workspace root** (`context.root`), regardless of which project
hosts the target. In this monorepo dependencies resolve through a **single root `pnpm-lock.yaml`**,
and secrets can live anywhere in the tree — so one scan of `.` is the correct unit, not one scan
per project. Adding the target to a second project would re-scan the same root, not a narrower
slice. (Per-app image/Dockerfile scanning, which is `nx affected`-friendly, is a separate concern
left to consumer repos that ship deployable apps.)

### 2. External binary, fail loud

Trivy itself is an external CLI — the executor is a thin, deterministic wrapper around it. Two
outcomes must never be confused with success:

- A **missing binary** (`trivy`, or `docker` for the docker runner) fails loudly with an install
  hint — never a silent pass.
- A **non-zero exit** — findings at or above the `severity` threshold when `failOnFindings` is on —
  fails the target.

### 3. Infer a fact, generate a policy

The plugin puts targets on your projects two different ways, and which one it uses is not a style
choice:

- The **scan targets are inferred**, onto the workspace root project (created if your workspace has
  none). That is a fact about the workspace: you registered a scanner in `nx.json`, and per §1 the
  scan is workspace-wide whatever hosts it — so the host is ceremony, and **one** host is the right
  number. Inferring onto every project would run the identical root scan N times.
- The **`sbom` target is inferred onto every project with a package.json**. Having a dependency
  closure is a fact, so the verb is always there — on an app too, which is never "publishable" and is
  exactly what a bill of materials is for. Which **releases** carry one is the policy, and it lives in
  the release record CI reads: whatever nx released gets one.

Two earlier designs put that policy in the target's existence — first a `name && !private` heuristic,
then a per-project generator — and both excluded the case that motivated them, the app that actually
ships. See [ADR-0029](../../../adr/0029-infer-facts-generate-policy.md) for the rule and
[ADR-0031](../../../adr/0031-being-describable-is-a-fact.md) for what it took to apply it correctly.

### 4. Trivy's own vocabulary

Options mirror Trivy's own flags (`scanType`, `scanners`, `severity`, `format`, `ignorefile`, …)
rather than inventing bespoke aliases. If you know Trivy, you know the options; the executor just
assembles them into an argument vector.

---

## 🏗 How It Works Inside

### The argument vector

The pure function `buildTrivyArgs` turns the options into the `trivy` argument vector. With
defaults it produces:

```bash
trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .
```

`--exit-code 1` is appended only when `failOnFindings` is `true`; `--ignorefile` only when
`ignorefile` is set; `extraArgs` are appended verbatim before the path. This builder is the
unit-tested core — the shell-out around it needs no test of its own.

### The two runners

The `runner` option selects how that argument vector is executed:

- **`local`** — spawns `trivy` directly, with the workspace root as the working directory.
- **`docker`** — wraps the same args in a `docker run --rm` of the `dockerImage` (default
  `aquasec/trivy:0.72.0`). `buildDockerArgs` bind-mounts the workspace root at `/workspace`
  (working directory `/workspace`) and mounts a cache for the vulnerability DB so it is not
  re-downloaded every run. With `cacheDir` set, that cache is a **host bind-mount**
  (`<cacheDir>:/root/.cache/trivy`) that CI can persist via `actions/cache`; without it, a
  **named volume** (`trivy-cache`) is the zero-config local default.

### Auto-detected ignore file

A `.trivyignore.yaml` at the scan root is picked up by Trivy automatically — no option needed. Use
the `ignorefile` option only to point at a file elsewhere.

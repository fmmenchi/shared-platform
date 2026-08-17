---
title: Executors
sidebar_label: Executors
sidebar_position: 1
---

# Executors

Every executor and pre-configured target in `@fmmenchi/nx-trivy`. The plugin ships **two executors**
(`scan`, `sbom`) and one generator ([`init`](./generators.md)).

---

## `scan`

Runs a Trivy security scan from the workspace root. Defaults to a workspace-wide
dependency-vulnerability scan that fails on CRITICAL/HIGH findings.

**Usage**

```bash
pnpm nx run <root-project>:scan [options]
```

With defaults this executes:

```bash
trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .
```

### Options

| Option           | Type       | Default                | Description                                                                                                                      |
| :--------------- | :--------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `runner`         | `string`   | `local`                | How to run Trivy: `local` (the `trivy` CLI) or `docker` (the `aquasec/trivy` image).                                             |
| `dockerImage`    | `string`   | `aquasec/trivy:0.72.0` | Docker image used when `runner` is `docker`.                                                                                     |
| `cacheDir`       | `string`   | –                      | Host dir to bind-mount as the Trivy DB cache (`runner: docker`) so CI can persist it. Without it, a named volume caches locally. |
| `scanType`       | `string`   | `fs`                   | Trivy scan target subcommand: `fs`, `repo`, or `config`. `fs` scans a filesystem path.                                           |
| `path`           | `string`   | `.`                    | Path to scan, relative to the workspace root.                                                                                    |
| `scanners`       | `string`   | `vuln`                 | Trivy `--scanners` (comma-separated), e.g. `vuln,secret,misconfig`.                                                              |
| `severity`       | `string`   | `CRITICAL,HIGH`        | Trivy `--severity` — the levels that count.                                                                                      |
| `failOnFindings` | `boolean`  | `true`                 | Fail the target when findings at/above `severity` exist (adds Trivy `--exit-code 1`).                                            |
| `format`         | `string`   | `table`                | Trivy `--format` (`table`, `json`, `sarif`, …).                                                                                  |
| `ignorefile`     | `string`   | –                      | Trivy `--ignorefile`. A `.trivyignore` / `.trivyignore.yaml` at the scan root is picked up automatically.                        |
| `extraArgs`      | `string[]` | –                      | Extra raw arguments appended to the `trivy` invocation.                                                                          |

### Behaviour

- Runs from the **workspace root** (`context.root`) regardless of the host project.
- A **missing binary** (`trivy`, or `docker` for the docker runner) fails loudly with an install
  hint — never a silent pass.
- A **non-zero exit** — findings at/above `severity` when `failOnFindings` is on — fails the target.

---

## `sbom`

Generates a **CycloneDX SBOM** (software bill of materials) for one project's production dependency
closure — the artifact to attach to that package's published release.

**Usage**

The `sbom` target is inferred onto every project with a package.json (see [Targets](#sbom-1)), so you
run it on the project itself — no `--projectName`:

```bash
pnpm nx run @fmmenchi/ui:sbom [options]
```

### Options

| Option        | Type     | Default                       | Description                                                                                                                                                                                     |
| :------------ | :------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectName` | `string` | the host project              | Override which project to describe. Rarely needed — the target already runs on its own project. (`project` is reserved by nx — it redirects the target — so this option is `projectName`.)      |
| `format`      | `string` | `cyclonedx`                   | SBOM format: `cyclonedx`, `spdx-json`, `spdx`, or `github`.                                                                                                                                     |
| `output`      | `string` | `<projectRoot>/sbom.cdx.json` | Output file, **relative to the workspace root** (it is joined with `context.root` — do not pass an absolute path).                                                                              |
| `runner`      | `string` | `local`                       | `local` (the `trivy` CLI) or `docker` (the `aquasec/trivy` image). Select docker via the target's **`docker` configuration** (`--configuration=docker`) — nx reserves `--runner` as a CLI flag. |
| `dockerImage` | `string` | `aquasec/trivy:0.72.0`        | Docker image used when `runner` is `docker`.                                                                                                                                                    |

### Behaviour

- A workspace has **no per-package lockfile**, so Trivy can't read a package's deps by scanning its
  directory. The executor reconstructs them: nx's `createPackageJson` prunes the project's
  `package.json` to its real dependency closure and `createLockFile` emits the matching lock, in the
  format of the workspace's own package manager (`detectPackageManager`); Trivy reads **that pruned
  lock** — exactly what a consumer installs.
- For `cyclonedx`, the SBOM's root component is renamed to the package name and version (Trivy would
  otherwise root it at the scan path). Under the **docker** runner that file is written by root, so
  the rename unlinks before rewriting — overwriting in place fails with `EACCES` on a Linux CI runner,
  and every SBOM published from CI used to keep `/scan` as its root component because of it. If the
  rename cannot happen, the executor now says so instead of leaving Trivy's raw output silently.
- Same failure contract as `scan`: a missing `trivy`/`docker` binary fails loudly.

---

## Targets

The four scan targets below are **inferred onto the workspace root project** as soon as the plugin is
registered in `nx.json` — nothing to hand-write. They are all **uncached**: a scan goes red because
the world changed (a CVE was published against a dependency nobody touched), so a cache hit keyed on
unchanged files would be a green that means nothing.

The root project's name comes from your root `package.json`, so don't hardcode it — ask the graph:

```bash
pnpm nx show projects --with-target scan-docker
```

### `scan`

The `scan` executor with defaults — the local runner.

```bash
pnpm nx run <root-project>:scan
```

### `scan-docker`

The `scan` executor with `runner: docker` pre-set — runs inside the `aquasec/trivy` image, so no
local `trivy` CLI is required.

```bash
pnpm nx run <root-project>:scan-docker
```

This is the `scan` executor with `runner: docker` in its **options**. nx reserves the `--runner`
CLI flag for tasks-runner selection, so the docker runner is picked via a target (like this one) or
a configuration — not `--runner=docker` on the command line.

### `scan-secrets` / `scan-secrets-docker`

The `scan` executor with `scanners: secret` — scans the tree for committed secrets (tokens, keys)
rather than dependency vulnerabilities. It skips `node_modules`, `dist`, `build`, `.nx` and `.git`
(via `extraArgs`) to avoid noise. `-docker` uses the image.

```bash
pnpm nx run <root-project>:scan-secrets         # local
pnpm nx run <root-project>:scan-secrets-docker  # via the aquasec/trivy image
```

### `sbom`

**Inferred onto every project with a package.json.** Having a dependency closure is a fact, so the
verb is always there — including on an app, which is never "publishable" and is exactly the thing a
bill of materials is for. WHICH releases carry one is a policy, and it lives where it already was: the
release record CI reads, which lists what nx actually released
([ADR-0031](../../../adr/0031-being-describable-is-a-fact.md)).

The target is **uncached** (the SBOM tracks the whole dependency closure, which a project's own file
inputs don't capture — a cache hit could serve a stale bill of materials) and ships a `docker`
configuration.

```bash
pnpm nx run @fmmenchi/ui:sbom                        # a project that opted in
pnpm nx run-many -t sbom                              # every project that opted in
pnpm nx run @fmmenchi/ui:sbom --configuration=docker  # aquasec/trivy image (as CI does)
```

---

## Related

- [Run a scan](../guides/run-a-scan.md)
- [Scan in CI](../guides/scan-in-ci.md)
- [Concepts](../concepts/index.md)

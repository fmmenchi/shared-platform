---
title: Executors
sidebar_label: Executors
sidebar_position: 1
---

# Executors

Every executor and pre-configured target in `@fmmenchi/nx-trivy`. The plugin ships **two executors**
(`scan`, `sbom`) and **no generators**.

---

## `scan`

Runs a Trivy security scan from the workspace root. Defaults to a workspace-wide
dependency-vulnerability scan that fails on CRITICAL/HIGH findings.

**Usage**

```bash
pnpm nx run <project>:scan [options]
```

With defaults this executes:

```bash
trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .
```

### Options

| Option           | Type       | Default                | Description                                                                                                                      |
| :--------------- | :--------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `runner`         | `string`   | `local`                | How to run Trivy: `local` (the `trivy` CLI) or `docker` (the `aquasec/trivy` image).                                             |
| `dockerImage`    | `string`   | `aquasec/trivy:latest` | Docker image used when `runner` is `docker`.                                                                                     |
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

```bash
pnpm nx run <project>:sbom --projectName=@fmmenchi/ui [options]
```

### Options

| Option        | Type     | Default                       | Description                                                                                                        |
| :------------ | :------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `projectName` | `string` | the host project              | Project to describe. (`project` is reserved by nx — it redirects the target — so this option is `projectName`.)    |
| `format`      | `string` | `cyclonedx`                   | SBOM format: `cyclonedx`, `spdx-json`, `spdx`, or `github`.                                                        |
| `output`      | `string` | `<projectRoot>/sbom.cdx.json` | Output file, **relative to the workspace root** (it is joined with `context.root` — do not pass an absolute path). |
| `runner`      | `string` | `local`                       | `local` (the `trivy` CLI) or `docker` (the `aquasec/trivy` image).                                                 |
| `dockerImage` | `string` | `aquasec/trivy:latest`        | Docker image used when `runner` is `docker`.                                                                       |

### Behaviour

- A pnpm monorepo has **no per-package lockfile**, so Trivy can't read a package's deps by scanning
  its directory. The executor reconstructs them: nx's `createPackageJson` prunes the project's
  `package.json` to its real dependency closure and `createLockFile` emits the matching pnpm lock;
  Trivy reads **that pruned lock** — exactly what a consumer installs.
- For `cyclonedx`, the SBOM's root component is renamed to the package name and version (Trivy would
  otherwise root it at the scan path).
- Same failure contract as `scan`: a missing `trivy`/`docker` binary fails loudly.

---

## Targets

The plugin's own `nx` config defines the ready-made targets below. All depend on `build`.

### `scan`

The `scan` executor with defaults — the local runner.

```bash
pnpm nx run <project>:scan
```

### `scan-docker`

The `scan` executor with `runner: docker` pre-set — runs inside the `aquasec/trivy` image, so no
local `trivy` CLI is required.

```bash
pnpm nx run <project>:scan-docker
```

Equivalent to `pnpm nx run <project>:scan --runner=docker`.

### `scan-secrets` / `scan-secrets-docker`

The `scan` executor with `scanners: secret` — scans the tree for committed secrets (tokens, keys)
rather than dependency vulnerabilities. It skips `node_modules`, `dist`, `build`, `.nx` and `.git`
(via `extraArgs`) to avoid noise. `-docker` uses the image.

```bash
pnpm nx run <project>:scan-secrets         # local
pnpm nx run <project>:scan-secrets-docker  # via the aquasec/trivy image
```

### `sbom`

The `sbom` executor with defaults. Pass `--projectName` to describe a package other than the host,
and `--runner=docker` where no local `trivy` is available (as CI does when attaching SBOMs to
releases).

```bash
pnpm nx run @fmmenchi/nx-trivy:sbom --projectName=@fmmenchi/ui
```

---

## Related

- [Run a scan](../guides/run-a-scan.md)
- [Scan in CI](../guides/scan-in-ci.md)
- [Concepts](../concepts/index.md)

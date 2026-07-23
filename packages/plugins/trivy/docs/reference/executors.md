---
title: Executors
sidebar_label: Executors
sidebar_position: 1
---

# Executors

Every executor and pre-configured target in `@fmmenchi/nx-trivy`. The plugin ships **one executor**
(`scan`) and **no generators**.

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

## Targets

The plugin's own `nx` config defines two ready-made targets. Both depend on `build`.

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

---

## Related

- [Run a scan](../guides/run-a-scan.md)
- [Scan in CI](../guides/scan-in-ci.md)
- [Concepts](../concepts/index.md)

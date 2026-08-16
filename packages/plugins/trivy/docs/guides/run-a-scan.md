---
title: Run a scan
sidebar_label: Run a scan
sidebar_position: 1
---

# Run a scan

Run a Trivy security scan over the workspace.

## Intent

You want to check the workspace's dependencies for known vulnerabilities and fail the build when
CRITICAL or HIGH findings appear.

## Step 1: Install the plugin

```bash
pnpm nx add @fmmenchi/nx-trivy
```

There is no target to write. `nx add` runs the [`init` generator](../reference/generators.md), which
registers the plugin in `nx.json` — and registration is what makes the plugin **infer** its four scan
targets onto the **workspace root project**:

| Target                | What it runs                                   |
| --------------------- | ---------------------------------------------- |
| `scan`                | vulnerabilities, local `trivy` CLI             |
| `scan-docker`         | vulnerabilities, via the `aquasec/trivy` image |
| `scan-secrets`        | secrets, local CLI                             |
| `scan-secrets-docker` | secrets, via the image                         |

They land on the root project because the scan runs from the workspace root whatever project hosts
it, so one host is the right number — see [Concepts](../concepts/index.md). Ask the graph for its
name (it comes from your root `package.json`):

```bash
pnpm nx show projects --with-target scan-docker
```

## Step 2: Run it

```bash
# trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .
pnpm nx run <root-project>:scan
```

With the local runner, the `trivy` CLI must be on PATH:

```bash
brew install trivy
```

:::tip[No local install?]

Use `scan-docker` — it runs the `aquasec/trivy` image and needs only Docker. It is a separate target
rather than a `--runner=docker` flag because nx reserves `--runner` for tasks-runner selection, so
that flag never reaches the executor.

```bash
pnpm nx run <root-project>:scan-docker
```

:::

## Step 3: Tune the scan

Every option maps to a Trivy flag. A few common adjustments:

```bash
# add secret + misconfig scanners on top of vuln
pnpm nx run <root-project>:scan --scanners=vuln,secret,misconfig

# widen the severities that count
pnpm nx run <root-project>:scan --severity=CRITICAL,HIGH,MEDIUM

# report only, never fail the target (drops --exit-code 1)
pnpm nx run <root-project>:scan --failOnFindings=false

# emit SARIF instead of a table
pnpm nx run <root-project>:scan --format=sarif
```

To make a change permanent, override the inferred target in the root project's own config — an
explicit target always wins over an inferred one.

See the [Executors reference](../reference/executors.md#scan) for the full option list and defaults.

## Step 4: Silence expected findings

`init` seeds a `.trivyignore.yaml` at the scan root (the workspace root) — Trivy picks it up
automatically, no option required. To point at an ignore file elsewhere, pass `--ignorefile=<path>`.

## Related

- [Scan in CI](./scan-in-ci.md) — run the scan on a schedule and cache the vuln DB.
- [Generators](../reference/generators.md) — what `init` writes.
- [Concepts](../concepts/index.md) — why the scan is workspace-level, and why it is inferred.

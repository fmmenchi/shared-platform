# @fmmenchi/nx-trivy

Nx executor that runs [Trivy](https://trivy.dev) security scans as an Nx target. Defaults to a
**workspace-wide dependency-vulnerability scan** that fails on CRITICAL/HIGH.

```bash
pnpm nx add @fmmenchi/nx-trivy   # installs + runs `init`: registers the plugin in nx.json, seeds .trivyignore.yaml
```

That is the whole setup — no target to write. Registration makes the plugin infer `scan`,
`scan-docker`, `scan-secrets` and `scan-secrets-docker` onto the **workspace root project** (the scan
runs from the root whatever hosts it, so one host is the right number):

```bash
pnpm nx show projects --with-target scan-docker   # its name comes from your root package.json
pnpm nx run <root-project>:scan         # trivy fs --scanners vuln --severity CRITICAL,HIGH --exit-code 1 .
pnpm nx run <root-project>:scan-docker  # via the aquasec/trivy image — no local trivy needed
```

Every project with a `package.json` also infers an **`sbom`** target — having a dependency closure is
a fact, so the verb is always there. Which releases carry a bill of materials is decided by CI, from
the release record:

```bash
pnpm nx run <project>:sbom
```

## Runners

- **`local`** (default) — needs the `trivy` CLI on PATH (`brew install trivy`).
- **`docker`** — runs the `aquasec/trivy` image (mounts the workspace, caches the vuln DB in a named
  volume). Only Docker required — ideal for CI.

## Options

Trivy's own flags: `scanners` (`vuln`), `severity` (`CRITICAL,HIGH`), `failOnFindings` (`true`),
`format`, `ignorefile`, `scanType`, `path`, `extraArgs`; plus `runner`, `dockerImage`.

Why workspace-level (not per-project/per-app): [ADR-0007](../../../apps/docusaurus/docs/adr/0007-security-scanning-workspace-level.md).
Why the scan is inferred and the SBOM generated: [ADR-0029](../../../apps/docusaurus/docs/adr/0029-infer-facts-generate-policy.md).

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
pnpm nx run @fmmenchi/source:scan            # vuln scan (local trivy CLI) — targets inferred on the ROOT project
pnpm nx run @fmmenchi/source:scan-docker     # vuln scan via the aquasec/trivy image (no local CLI)
pnpm nx run @fmmenchi/source:scan-secrets        # secret scan (local)
pnpm nx run @fmmenchi/source:scan-secrets-docker # secret scan via the image
pnpm nx run @fmmenchi/ui:sbom                # CycloneDX SBOM (inferred on every package.json project)
pnpm nx g @fmmenchi/nx-trivy:init            # register the plugin in nx.json + seed .trivyignore.yaml
```

## Shape

- **Two executors (`scan`, `sbom`) and one generator (`init`).** `scan` runs `trivy <scanType> …` from the
  **workspace root** (`context.root`), so it is a workspace-wide scan regardless of the host project.
  Default vector: `trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .`.
  Options mirror Trivy's own flags (`runner`, `dockerImage`, `cacheDir`, `scanType`, `path`,
  `scanners`, `severity`, `failOnFindings`, `format`, `ignorefile`, `extraArgs`) — full table in
  [reference/executors.md](./docs/reference/executors.md).
- **`sbom`** emits a per-project **CycloneDX SBOM**. A workspace has no per-package lockfile, so it
  reconstructs one — nx's `createPackageJson` + `createLockFile` prune the project to its real
  dependency closure and Trivy reads that pruned lock. The lockfile format follows
  `detectPackageManager(context.root)`: hardcoding pnpm made this die with a bare `ENOENT:
pnpm-lock.yaml` in an npm consumer (measured against a scratch npm workspace). The target is added
  **inferred onto every project with a package.json** — see Rules. CI attaches one to each released
  project, reading the release record. See [reference/executors.md](./docs/reference/executors.md).
- **Two runners** (`runner`): `local` (the `trivy` CLI, default) or `docker` (the `aquasec/trivy`
  image — mounts the workspace at `/workspace`, needs only Docker). The vuln DB caches in a named
  volume by default; pass `cacheDir` to bind-mount a host dir instead so CI can persist it via
  `actions/cache`.
- **Four scan targets inferred onto the ROOT project** by `createNodesV2` —
  `scan`/`scan-docker` (vuln) and `scan-secrets`/`scan-secrets-docker` (the same executor with
  `scanners: secret`, skipping `node_modules`/`dist`/`build`/`.nx`/`.git` via `extraArgs` to avoid
  noise). All uncached: a scan goes red because the world changed, not because a file did. The root
  project is created if the workspace has none; its name comes from the root `package.json`
  (`@fmmenchi/source` here). The CI `security` job runs the two docker ones.
- **`init` generator** — registers the plugin in `nx.json` (inference runs only for registered
  plugins, so without it the install is inert) and seeds a `.trivyignore.yaml` at the scan root.
  Idempotent in both halves.
  See [reference/generators.md](./docs/reference/generators.md).
- **`buildTrivyArgs` / `buildDockerArgs`** — the pure arg-vector builders (unit-tested); the
  shell-out itself needs no test.

## Rules

- **Workspace-level by design** ([ADR-0007](../../../apps/docusaurus/docs/adr/0007-security-scanning-workspace-level.md),
  [concepts](./docs/concepts/index.md)): one scan of `.` is correct, not per-project. Per-app
  image/Dockerfile scanning is a future executor for consumer repos that ship deployable apps.
- **Trivy is an external CLI.** A missing binary (`trivy`, or `docker` for the docker runner) fails
  loudly with an install hint — never a silent pass; a non-zero exit (findings at/above `severity`
  when `failOnFindings` is on) fails the target.
- **Standard names.** Options are Trivy's own flag vocabulary — no bespoke aliases. The generator is
  named **`init`** for the same reason, and cannot be renamed: `nx add <plugin>` invokes
  `<plugin>:init` by name and **silently no-ops** when it is missing (Nx catches the lookup and moves
  on), so a `trivy-init` would make `nx add` install the package and do nothing, with no error.
- **Infer what is a fact, generate what is a policy** ([ADR-0029](../../../apps/docusaurus/docs/adr/0029-infer-facts-generate-policy.md)),
  with the sharper form from [ADR-0031](../../../apps/docusaurus/docs/adr/0031-being-describable-is-a-fact.md):
  infer when the target's presence carries no information and the facts arrive at runtime.
  `scan` is inferred onto exactly one host (the root project) because the scan is workspace-wide
  whatever holds it, and one host keeps `run-many` from repeating it N times. `sbom` is inferred onto
  **every** project with a package.json, because HAVING a dependency closure is a fact — while WHICH
  releases carry a bill of materials is a policy that already lives in the release record the CI
  reads. Two earlier attempts got this wrong: `name && !private` (this repo's release policy in an
  inference costume, which excluded the app that actually ships) and then a per-project generator
  (which excluded it again, one command later).
- **This repo is a consumer.** Nothing here hand-writes a target the plugin can provide: every scan
  and sbom target comes from the same inference a consumer gets. If it only works here, it does not
  work.

## Use from a consumer

```bash
pnpm nx add @fmmenchi/nx-trivy   # installs + runs `init` (nx.json registration, .trivyignore.yaml)
```

That is the whole setup: no target to write anywhere. `init` seeds the `.trivyignore.yaml` Trivy
auto-detects at the scan root, registration puts the scan targets on the root project, and every
project with a package.json gets `sbom`.

Never name a project in CI — the root project is named after the consumer's own root `package.json`.
Ask the graph (`nx show projects --with-target scan-docker --json`) and fail on empty; the
`trivy-scan` action in `@fmmenchi/gh-actions` does exactly that. shared-platform's own CI dogfoods it
(`.github/workflows/security.yml`) on **dep changes and a weekly schedule**; the weekly run's findings
alert Slack via the `notify` brick. See [scan in CI](./docs/guides/scan-in-ci.md) for DB caching
and cadence. Local CLI: `brew install trivy`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

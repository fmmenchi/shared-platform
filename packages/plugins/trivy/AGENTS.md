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
pnpm nx run @fmmenchi/ui:sbom                # CycloneDX SBOM (target added per project by the generator)
pnpm nx g @fmmenchi/nx-trivy:init            # register the plugin in nx.json + seed .trivyignore.yaml
pnpm nx g @fmmenchi/nx-trivy:sbom <project>  # opt a project into publishing a bill of materials
```

## Shape

- **Two executors (`scan`, `sbom`) and two generators (`init`, `sbom`).** `scan` runs `trivy <scanType> …` from the
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
  **per project by the `sbom` generator**, never inferred — see Rules. CI attaches one to each
  published GitHub Release (docker runner). See [reference/executors.md](./docs/reference/executors.md).
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
- **`sbom` generator** — adds the `sbom` target to one project, with a `docker` configuration.
  Both in [reference/generators.md](./docs/reference/generators.md).
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
- **Infer what is a fact, generate what is a policy** ([ADR-0029](../../../apps/docusaurus/docs/adr/0029-infer-facts-generate-policy.md)).
  `scan` is a fact: you registered a scanner, and the scan is workspace-wide whatever hosts it — so
  it is **inferred**, onto exactly one host (the root project), which is also what keeps a
  `run-many` from running the same root scan N times. `sbom` is a policy: whether a package ships a
  bill of materials depends on what you distribute and who audits it, not on anything on disk — so
  it is **generated**, per project, and lives on the project like any other opt-in target. The old
  `name && !private` heuristic was this repo's release policy wearing an inference costume, and it
  got the interesting case backwards: a private app that ships to production is exactly what an SBOM
  is for, and it was the one project excluded.
- **This repo is a consumer.** Nothing here hand-writes a target the plugin can provide: our scan
  targets come from the same inference a consumer gets, our `sbom` targets from the same generator.
  If it only works here, it does not work.

## Use from a consumer

```bash
pnpm nx add @fmmenchi/nx-trivy   # installs + runs `init` (nx.json registration, .trivyignore.yaml)
```

That is the whole setup: no target to write, and `init` seeds the `.trivyignore.yaml` Trivy
auto-detects at the scan root. Per-project SBOMs are opted in one at a time
(`nx g @fmmenchi/nx-trivy:sbom <project>`).

Never name a project in CI — the root project is named after the consumer's own root `package.json`.
Ask the graph (`nx show projects --with-target scan-docker --json`) and fail on empty; the
`trivy-scan` action in `@fmmenchi/gh-actions` does exactly that. shared-platform's own CI dogfoods it
(`.github/workflows/security.yml`) on **dep changes and a weekly schedule**; the weekly run's findings
alert Slack via `@fmmenchi/nx-notify`. See [scan in CI](./docs/guides/scan-in-ci.md) for DB caching
and cadence. Local CLI: `brew install trivy`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

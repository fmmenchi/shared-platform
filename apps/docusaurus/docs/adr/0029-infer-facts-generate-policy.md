# ADR 0029 — A plugin infers facts and generates policy

- **Status:** accepted (2026-08-16)
- **Date:** 2026-08-16
- **Deciders:** Fabio Menchicchi

## Context and problem statement

`@fmmenchi/nx-trivy` is the first plugin here meant to be **installed by somebody else**. Preparing
it for that exposed a question every plugin in this workspace will face: when a plugin puts a target
on a project, should it **infer** it (`createNodesV2`, automatic, invisible) or **generate** it (an
explicit target, committed in the project's own config)?

The plugin had answered it once, by accident, and got both halves wrong:

- **`sbom` was inferred** onto every package matching `name && private !== true`. Installed in a
  scratch npm workspace, that heuristic gave an SBOM to `@acme/sdk`, a library nobody audits, and
  gave **nothing** to `@acme/web`, the app that actually ships to production — the one thing a
  bill of materials exists for under EO 14028 / the EU CRA. The heuristic was not a fact about the
  files; it was _shared-platform's own release policy_ ("everything we publish carries an SBOM"),
  which every consumer silently adopted by installing the package.
- **`scan` was not inferred at all.** Every consumer had to hand-write a target whose entire content
  is the name of an executor, and our CI had to name a project (`@fmmenchi/nx-trivy:scan-docker`)
  that exists in no other repo.

## Decision

**Infer what is a fact about the workspace. Generate what is a policy of the workspace.**

- **`scan` is inferred**, onto the **workspace root project** (created if the workspace has none).
  It is a fact: you registered a scanner in `nx.json`, and per [ADR-0007](./0007-security-scanning-workspace-level.md)
  the scan runs from `context.root` whatever project hosts it — so the host is ceremony, and one
  host is the correct number. Inferring onto every project would run the identical root scan N
  times; inferring onto none makes every consumer write boilerplate.
- **`sbom` is generated**, per project, by `nx g @fmmenchi/nx-trivy:sbom <project>`. It is a policy:
  what you distribute, and to whom you answer for it, is not derivable from a `package.json`.
  Idiomatically in Nx a project-level concern lives **on the project** — so the target is written
  into the project's own config, where it is visible and greppable.
- **Registration is the intent.** Adding the plugin to `nx.json` is what turns inference on, so
  `nx add @fmmenchi/nx-trivy` (which runs the `init` generator) is the whole adoption story.

A corollary, and the test that keeps this honest: **this repo is a consumer.** shared-platform
hand-writes none of these targets — its scan targets come from the same inference any consumer gets,
its 13 `sbom` targets from the same generator. A plugin that only works in the repo that authored it
is not a shared layer ([ADR-0008](./0008-cross-app-framework-agnostic-layers.md)).

## Consequences

- Adoption is one command (`nx add`), and a consumer's CI needs no project name: the reusable action
  asks the graph which project owns `scan-docker` and **fails loudly** when nothing does — a scan
  that silently does not happen is the worst outcome for a security gate.
- Opting a project into an SBOM is a deliberate, reviewable commit rather than a side effect of
  being publishable. Forgetting it fails the release job loudly; it cannot pass quietly.
- New publishable packages here need one extra command (`nx g @fmmenchi/nx-trivy:sbom <name>`). That
  is the price of the policy being explicit, and it is the same command a consumer runs.
- The rule generalises: `@fmmenchi/nx-notify`'s `announce-*` targets should be re-read against it —
  announcing a release is arguably policy too. Not decided here.

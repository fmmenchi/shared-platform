# ADR 0031 — Being describable is a fact; which release carries an SBOM is the record's business

- **Status:** accepted (2026-08-17)
- **Date:** 2026-08-17
- **Deciders:** Fabio Menchicchi

## Context and problem statement

[ADR-0029](./0029-infer-facts-generate-policy.md) set a rule this workspace keeps — **infer what is
a fact, generate what is a policy** — and then applied it to the SBOM by making the `sbom` target
opt-in, written onto each project by a generator.

The rule was right. The application was wrong, because the fact was misidentified.

Two different questions had been collapsed into one:

- **which projects _can_ be described** — any project with a `package.json` has a dependency
  closure, so this is a fact about files;
- **which releases _carry_ a bill of materials** — that is the policy.

Putting the policy in the target's existence had three costs, and the first one is the same defect
ADR-0029 was written to fix. It **excluded the case that motivated it**: an app is never
"publishable", so a consumer had to run a generator before their deployable project could be
described at all. It left `@fmmenchi/nx-ui` released without an SBOM because nobody had run that
generator — a silent gap the release job could only report as a warning, run after run. And it put
thirteen identical target blocks in thirteen `package.json` files, where their presence carried no
information any reader could act on.

## Decision

**`sbom` is inferred onto every project with a `package.json`** (the workspace root excluded — its
manifest describes the workspace, not a package). The `sbom` generator is deleted.

The policy did not need a home invented for it: **it already lives in the release record.** The CI
attaches a bill of materials to every project nx actually released, and nothing else decides. So the
target becomes what it always should have been — a verb that exists — and whoever wants to run it
locally on any project may.

This is the same move already made for notifications ([ADR-0030](./0030-an-announcement-is-an-event.md)):
when a target would be identical on every project, its existence is not a decision, and the decision
belongs in the data that flows at runtime.

## Consequences

- Sixteen projects infer the target instead of thirteen carrying it explicitly. The three new ones —
  `nx-ui`, `ui-ports-validation`, `docs` — are exactly the ones the old heuristic could not classify:
  they can be described, they are never released, so they never appear in a record and never get an
  SBOM attached. Nothing to decide, nothing to warn about.
- `attach-sbom` stops asking the graph whether a project has the target, and the warning that
  followed that question is gone. The loop over the record is the whole policy.
- A consumer's private app gets `nx run <app>:sbom` from the plugin alone — which is what ADR-0029
  wanted for apps and did not deliver.
- ADR-0029's rule stands unchanged. What this supersedes is its **example**: the SBOM is not the
  policy case it was presented as. The rule's sharper form, from the notification work: infer when
  the target's presence carries no information and the facts arrive at runtime; generate when what
  you are writing down is a decision that cannot be derived.

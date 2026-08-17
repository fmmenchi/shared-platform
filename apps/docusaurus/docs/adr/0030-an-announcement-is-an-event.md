# ADR 0030 — An announcement is an event, and announcing is not releasing

- **Status:** accepted (2026-08-17)
- **Date:** 2026-08-17
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Releases stopped being announced, and nothing went red. The step passed `--version=1.8.2` on the
command line, nx reserves `--version`, so the value never reached the executor, which printed
_"No release version — no new tag to announce"_ and **exited 0**. The failure was found the way such
failures always are: somebody noticed a message that never arrived.

Pulling that thread found the same shape three more times in the same pipeline — a scan target list
that exits 0 when it matches nothing, an SBOM rename swallowed by an empty `catch`, an app excluded
from SBOMs by a heuristic nobody could see. None of them would have been caught by more unit tests:
**every one happened in the joints between pieces, above the code that has tests.**

The common defect is not a bug, it is a shape: **each layer treated "I do not have what I need" as
"there is nothing to do"**.

## Decision

### 1. An announcement is an **event** — one input, validated, or nothing

A `NotifyEvent` (`release` | `error`) carries what happened, **and its own identity** (`app`). It is
the whole input. There is no second channel and no fallback chain: `parseEvents` validates a batch
and **throws** on anything incomplete, because a missing field is a broken caller, not an empty
mailbox.

The only green skip is missing Slack secrets — a fork must not go red over a notification it was
never configured to send — and it announces itself with a `::notice::` saying how many events were
**not** sent.

Delivery returns `{ total, delivered, failures }`, never a boolean. The caller turns
`delivered !== total` into a red build, which is the only way "it never even started" is visible from
outside a process that cannot see its own absence.

### 2. Releasing and announcing are **separate operations**, and the record is the seam

A release is irreversible; an announcement is retryable. Fusing them lets a message-shaped bug break
or half-finish something that cannot be undone, and makes the retryable half impossible to retry.

So the release operation writes a **neutral record** of what it did — `{ project, version, tag }` per
release, asked of nx's own programmatic API rather than reconstructed from a git-tag diff — and every
downstream operation reads it. Neutral is load-bearing: no message, channel or artifact vocabulary
appears in the step that cannot be undone. The SBOM step reads the same record, which is the evidence
that this is the right seam and not a notification-shaped hack.

**Separate operations means separate jobs.** As steps of one job they could only be retried by
re-running the release itself. The record therefore crosses the job boundary twice: `released` as a
job output (small, drives the `if:`) and the record itself as an **artifact** — which is what makes
"Re-run failed jobs" re-announce without re-releasing. Keeping changelog bodies _out_ of the record
is what keeps it small enough for that.

### 3. A task on the workspace is a **plugin**; an event passing through is a **bin**

`@fmmenchi/nx-trivy` stays an nx plugin: scanning is a target with options, configurations, and
inference that makes `nx add` the whole setup. `@fmmenchi/nx-notify` was **deleted**, because once
the event carried its own identity there was nothing left for a per-project target to hold — no
options, no configuration, no cache, and no "which project does this run on?", a question that only
ever existed because `appName` came from `context.projectName`.

What the plugin was really buying was resolution in both shapes — source here, `node_modules` in a
consumer — and a `bin` buys that for less: `pnpm exec fmmenchi-notify` is one command everywhere,
provided the repo links its own workspace packages at the root.

## Consequences

- Adoption loses two inputs that were pure ceremony: the `project` a notify brick needed, and
  `announce-project` on the security workflow. An alert names itself.
- One published package fewer to version, and one implementation of the Slack surface:
  `@fmmenchi/notify` builds and sends, `@fmmenchi/ci` owns the CI doors (`fmmenchi-release`,
  `fmmenchi-notify`), and neither knows what the other decides.
- Publishing moved out of `release()` and after the record is on disk — nx exits the process from
  inside on a registry failure, which used to destroy the account of a release that had already
  happened.
- The rule generalises past notifications: **a step must not be able to succeed silently.** Validate
  at the boundary, skip green in exactly one declared case, and count what arrived instead of
  assuming it. [ADR-0029](./0029-infer-facts-generate-policy.md) decided what a plugin may infer;
  this one decides what a pipeline may assume — which is nothing.

# ADR 0010 — Use everything Widely; Newly only as graceful progressive enhancement

- **Status:** accepted (2026-07-29) — extends [ADR-0003](./0003-browser-support-baseline.md)
- **Date:** 2026-07-29
- **Deciders:** Fabio Menchicchi

## Context and problem statement

ADR-0003 pins support to **Baseline Widely available**, lint-enforced. Two pressures on it:

1. Widely is a **moving line** — features cross it every month (mid-2026 alone: `linear()`
   easing, `:has()`, native CSS nesting, `animation-composition`, `subgrid`). A platform that
   doesn't track the line leaves free capabilities on the table.
2. Some **Newly available** features are both transformative and _perfectly degradable_:
   `@starting-style` + `transition-behavior: allow-discrete` animate a `<dialog>`'s entry/exit in
   pure CSS, and a browser without them simply shows the dialog instantly — fully functional. A
   blanket "widely or nothing" forbids value that costs nothing.

## Decision

1. **Widely is the default, and we actively USE it.** The lint gate stays. When a feature crosses
   the line, adopting it is encouraged, not exceptional — periodically re-check what has crossed.
2. **Newly available is allowed ONLY as graceful progressive enhancement**, judged per feature:
   - the experience **without** the feature must be fully functional (no broken layout, no lost
     capability — losing only polish, e.g. an entry animation);
   - the usage is **marked and auditable**: a lint-disable comment with the justification and the
     expected Widely date —
     `/* eslint-disable-next-line css/use-baseline -- progressive: degrades to instant open; widely ~2027-02 */`
     — plus an `@supports` guard whenever the declaration would otherwise be invalid;
   - when the feature goes Widely, the comment is removed (the exception expires by design).
3. **Not degradable ⇒ not yet.** A Newly feature whose absence breaks function (e.g. Popover API
   without a JS fallback) waits for Widely, as before.

### First applications

- `linear()` easing (Widely ~2026-06): **spring personalities as tokens** — `--fm-ease-spring`
  (subtle overshoot, the workhorse) and `--fm-ease-bounce` (playful) from real damped-spring
  physics sampled into stops. The "behaviors" idea JS motion libraries sell, with zero runtime.
- `@starting-style` + `allow-discrete` (Widely ~2027-02): approved as the progressive entry/exit
  path for the upcoming Dialog — instant open/close where unsupported; `animateExit` remains the
  guaranteed-everywhere exit until then.

## Consequences

- The DS gains capabilities at the platform's pace instead of 30 months behind it.
- Every exception is grep-able (`use-baseline --`), justified, dated, and self-expiring.
- Watchlist stays honest: View Transitions (degradable — candidate when the design calls for it),
  Popover API (not degradable — waits for Widely, ~2026-10).

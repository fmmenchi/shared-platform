# Known issues

The known-issues ledger — upstream incompatibilities and their workarounds — has a **single
source**: [`apps/docusaurus/docs/known-issues.md`](../../apps/docusaurus/docs/known-issues.md). Read
it before upgrading a dependency or diagnosing an odd build/CI failure, and **add new entries there**
(not here), so the human doc and this note never drift.

**At a glance** (see the ledger for the root cause + what unblocks each): standalone **major** bumps of

- **`typescript`** — Nx 23 needs the programmatic compiler API that TS 7 dropped;
- **`@babel/*`** — `@nx/js` hard-pins `@babel/core@7`, so Babel-8 presets break the Storybook build;
- **`eslint`** — `eslint-plugin-react`/`jsx-a11y`/`import` peer-cap at eslint 9;

are blocked and **ignored in Dependabot** (`.github/dependabot.yml`). The ledger also tracks the
**Baseline exceptions in flight** (ADR-0010 — currently `@starting-style` approved for the Dialog,
and the Popover API under a maintainer waiver): check it before using a Newly-available feature.
Related: [[releases]].

## `@babel/core` is pinned to 7 — the React Compiler is a Babel 7 plugin

`babel-plugin-react-compiler@1.0.0` depends on `@babel/types@^7.26.0` and declares no peer range.
Run under **Babel 8** it cannot lower an object destructuring that carries a default —
`const { placement = 'bottom' } = props` — and reports
`(BuildHIR::lowerAssignment) Expected object property value to be an LVal, got: AssignmentPattern`.
The function is then SKIPPED, silently: the component ships unmemoized and the build stays green.

Measured on `@fmmenchi/ui`: with `@babel/core@8.0.1`, nine functions across `button`, `dialog`,
`popover`, `tooltip`, `fieldset`, `form-error-summary`, `use-anchored` and `use-controlled` were
never compiled — the doctrine's claim that "the published output ships already memoized" was false
for all of them. With `7.29.7` every one compiles, the whole workspace builds, lints and typechecks,
and the UI suite is green.

So the root `devDependency` is held at `7.29.7`, not floated to `^8`. `@rolldown/plugin-babel`
accepts either (`^7.29.0 || ^8.0.0-rc.1`), so nothing else asks for 8. Lift the pin when the
compiler plugin declares Babel 8 support — the build will say whether it worked, because it now
fails on any bailout (`panicThreshold: 'all_errors'`, see the ui package's build spoke).

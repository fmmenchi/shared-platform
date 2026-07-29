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
**Baseline exceptions in flight** (ADR-0010 progressive enhancements — currently `@starting-style`
approved for the Dialog): check it before using a Newly-available feature. Related: [[releases]].

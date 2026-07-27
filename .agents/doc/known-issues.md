# Known issues

Living log of known limitations and upstream incompatibilities, so you don't rediscover them mid-task.
Add an entry whenever a change is blocked by something a future agent would otherwise hit blind
(a failing upgrade, a tool incompatibility, a config that can't change yet). Keep each entry:
**what breaks · why · what we do now · what unblocks it**. The human-facing copy is
`apps/docusaurus/docs/known-issues.md` — keep the two in sync.

## TypeScript 7 — not adoptable (Nx incompatibility)

- **What breaks.** Bumping `typescript` 6.x → 7.x fails Nx plugin loading:
  `tsModule.readConfigFile is not a function` for the local `createNodesV2` plugins
  (`@fmmenchi/nx-trivy`, `@fmmenchi/nx-notify`) and `@nx/storybook/plugin`. Typecheck/build never run.
- **Why.** TS 7.0 (native Go compiler) dropped the in-process programmatic API; `ts.readConfigFile`
  & friends are gone. Nx and our plugins use them for graph inference. A new API is expected in TS 7.1.
- **What we do now.** `typescript` pinned to 6.x; Dependabot ignores its **major** bumps
  (`.github/dependabot.yml`); we're on the latest stable Nx (23.1.0), which does not fix it.
- **What unblocks it.** TS 7.1 + Nx support. Adopt via `nx migrate` using Nx's side-by-side TS7 setup
  (`typescript@6` for tooling, `typescript@7` for typecheck) — never a standalone bump.
- **Ref.** [nrwl/nx#36306](https://github.com/nrwl/nx/issues/36306). Related: [[releases]] (Dependabot,
  `nx release`).

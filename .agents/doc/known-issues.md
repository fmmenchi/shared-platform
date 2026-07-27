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

## Babel 8 presets — not adoptable (Nx pins `@babel/core@7`)

- **What breaks.** Bumping `@babel/preset-react` (or a peer Babel preset/plugin) to 8.x fails the
  Storybook build: `[BABEL] @babel/preset-react: Since v8 … requires @babel/core@^8` (found 7.x).
- **Why.** `@nx/js@23.1.0` hard-depends on `@babel/core@^7.23.2`; the whole `@nx/*` toolchain pulls
  that nested copy. Babel 8 presets peer-require `@babel/core@^8`, so they clash inside Nx's builds.
- **⚠️ CI-only failure.** Passes the local gate (pnpm resolves core 8 locally) but fails a clean CI
  install (uses the core 7 nested under `@nx/js`). **For Babel-preset bumps, trust CI, not the local
  gate.** Root `@babel/core` is on 8 and harmless; it's the presets that need 8 everywhere.
- **What we do now.** Babel presets/plugins stay on 7.x; Dependabot ignores `@babel/*` **major** bumps
  (`.github/dependabot.yml`). Don't force core 8 into `@nx/js` via `pnpm.overrides` (untested, risky).
- **What unblocks it.** Nx moving its Babel toolchain to 8, via `nx migrate`.

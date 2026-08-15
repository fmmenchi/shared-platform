# Build & packaging (agent)

- **The compiler is GUARDED.** `panicThreshold: 'all_errors'` turns a bailout into a build failure,
  because the failure is otherwise SILENT: the compiler skips a function it cannot handle and says
  nothing, so a component stops being memoized and nobody can tell. Measured after that had happened
  twice — a `case` whose value was a conditional expression cost `MenuContent` its compilation, and
  a Babel version mismatch cost eight more functions theirs. A function that genuinely cannot be
  compiled declares `'use no memo'` where it is written, with a reason; today that is the two hooks
  calling an INJECTED hook from the form port, which the compiler cannot name and rightly refuses to
  reason about. The plugin is a **Babel 7** plugin and the root pins `@babel/core` accordingly —
  [known-issues](../../../../.agents/doc/known-issues.md).
- **React Compiler** is on — memoizes at the lib build, so the published output ships already
  memoized (every consumer benefits). Rolldown-vite gotcha: wire it via `react()` +
  `babel({ presets: [reactCompilerPreset()] })` (`@rolldown/plugin-babel`), NOT `react({ babel })`.
  Rules of React are enforced by `eslint-plugin-react-hooks` v7 `recommended-latest` — no ref
  read/write during render; keep code compiler-compatible (no manual memo needed).
- **Tree-shaking**: the package is `sideEffects: ["**/*.css"]` — unused JS exports drop, CSS stays.
- **Per-component subpaths** — each component is its own build entry + export so a consumer imports
  only what it uses. **Adding a component:**
  1. `src/components/<name>/index.ts` (barrel re-exporting the component).
  2. add `<name>: 'src/components/<name>/index.ts'` to `build.lib.entry` in `vite.config.mts`.
  3. add `"./<name>"` to `exports` in `package.json` — JS only.
- **CSS**: ONE entry point, `@fmmenchi/ui/style.css` (concatenated by the `fm-combined-css`
  plugin from the per-component `dist/<name>.css` the build still emits). There is no
  `@fmmenchi/ui/<name>/style.css` and there must not be: 16 of 32 entries render other
  components, so a per-component stylesheet cannot carry what its component needs, and the
  consumer has no way to know what is missing (ADR-0023). The whole stylesheet is **12.1 kB gzip**
  (102 kB raw), and every consumer pays all of it however little they import — for a single `Button`
  that is 3.0 kB of JS against 12.1 kB of CSS.
- **The size numbers live in `docs/bundle-size.md`**, measured per entry and against ten other React
  libraries. Nothing in the build fails when they drift: this line said 4.5 kB from when the library
  had 32 entries until it was re-measured at 101 and found to be 12.1 kB — 2.7× off, invisible
  because the sheet grows a hundred bytes per component. Re-measure with the commands on that page
  rather than quoting either figure from memory.

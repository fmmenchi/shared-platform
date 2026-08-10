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
- **`'use client'` is written by the BUILD, on every emitted entry** (`tools/rsc/use-client.mjs`,
  shared with both `*-ports` packages). React Server Components read the directive per MODULE, and a
  consumer imports an entry — so without it every component here is a server module to their
  bundler, and the first hook inside becomes a build error in THEIR repository, naming a file they
  cannot fix. Output and not source: it has to be the first statement of the chunk, and sixty-odd
  barrels would each have to remember it. **Entries only** — a shared chunk reached from a client
  entry is already in the client graph, and marking more than the boundary says less about where it
  is. The plugin READS THE FILE BACK and fails the build if the directive is not the first line: a
  bundler that started hoisting imports above the banner would otherwise ship a package whose
  directive is inert, with nothing to say so until a consumer's build broke. The cost is stated
  rather than hidden — the whole package is client, including the few components that use no hook;
  deciding per component would mean judging every transitive import server-safe, with nothing to
  check it and a first hook to invalidate it.
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
  consumer has no way to know what is missing (ADR-0023). The whole stylesheet is 4.5 kB gzip.

# Build & packaging (agent)

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
  3. add `"./<name>"` (+ `"./<name>/style.css"`) to `exports` in `package.json`.
- **CSS**: per-component `dist/<name>.css` **plus** a concatenated `dist/style.css` (via the
  `fm-combined-css` plugin). Consumers pick `@fmmenchi/ui/style.css` (all) or
  `@fmmenchi/ui/<name>/style.css` (granular).

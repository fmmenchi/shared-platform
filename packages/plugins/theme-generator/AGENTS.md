# AGENTS.md — @fmmenchi/nx-theme-generator

Nx plugin: brand-theme scaffolding + CI validation for the design system. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope
`plugins`, type `plugin`.

Long-form docs (concepts, guides, CLI reference) live in [`docs/`](./docs/index.md) — point there
for rationale; keep this file a terse, accurate rule-list.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-theme-generator
pnpm nx build @fmmenchi/nx-theme-generator
pnpm nx lint @fmmenchi/nx-theme-generator
pnpm nx test @fmmenchi/nx-theme-generator   # node vitest (Tree-based generator + executor specs)
```

## Shape (composition)

Three pieces sharing one target name, `validate-themes`. Full arguments/options/defaults in
[docs/reference/cli.md](./docs/reference/cli.md).

- **generator `theme`** — writes `<projectRoot>/<directory>/<name>.css` (`--directory` default
  `src/themes`): a COMPLETE `[data-theme='<name>']` assignment. **Two ways to get the values, one
  way to write them.** Without `--from` it scaffolds from the **installed** `@fmmenchi/tokens`
  `vars.css` (resolved at run time via `createRequire` from the consumer workspace root;
  `--tokensPath` escape hatch), and the file header records the tokens version. With
  `--from=<file.json>` it installs a theme a builder exported, reading **only its `declarations`
  object** and VALIDATING before it writes anything. Then, unless `--skipValidation`, CALLS the `validation`
  generator.
  - **`--from` reads DECLARATIONS, not colours** — a flat map of `--fm-*` property to value, at
    whatever layer. That is what keeps a consumer's theme the same KIND of thing as the reference
    one: three layers (a base, a ramp derived from it, a role pointing at a rung), so a base change
    recomputes what is under it. A handoff of the eighty-four finished colours would be a photograph
    of that — same pixels, nothing left to recompute from. It also lets a builder ship a theme with
    a rung nudged by hand or a role re-pointed, since those are declarations too and nothing here
    has to recognise them. The generator does not know what a base, a ramp or a role IS: to it they
    are lines.
  - **And it reads that key and nothing else.** Whatever a builder keeps in order to reopen its own
    form travels in the same file under keys this generator never looks at. Two contracts in one
    document: `declarations` is small, stable, and this package's; the rest is the builder's and may
    change shape without a version negotiation across two packages. Unknown keys are not an error,
    and that is the point.
  - **It validates BEFORE writing**, with the installed `validateTheme()` — the same function
    `validate-themes` runs in CI, so a builder cannot promise a theme the pipeline would refuse.
    Failing here costs one command; failing in CI costs a round trip. It also catches the mistake an
    exporter is most likely to make: a reference pointing at nothing. Roles are RESOLVED against the
    file's own declarations first — `var(--fm-palette-…)` is CORRECT here when the file also carries
    that rung — so what the check catches is the dangling one, which would otherwise install a role
    falling back to its `@property` initial-value: opaque black, in both themes, with nothing falsy
    for any later check to notice.
  - **`--skipValidation` means "do not gate this theme"** — it skips both the target wiring and the
    pre-write check. One flag, one meaning.
- **generator `validation`** — adds/updates the `validate-themes` target on the `--project` (points
  it at the `validate` executor; idempotent — merges, dedupes, sorts the theme list).
- **executor `validate`** — parses each theme's declarations with `parseCssVars` and runs
  `validateTheme()`, both **imported** from `@fmmenchi/theme`. Checks completeness, parsable colors,
  sRGB gamut, WCAG pairs; reports the exact ratio per violation. Any violation fails the target.

## Rules

- **CODE COMES FROM `@fmmenchi/theme`, VALUES FROM THE CONSUMER.** The contract, the rules and the
  colour maths are a static import of `@fmmenchi/theme` (`scope:shared`, which a plugin may depend
  on) — so they travel with this plugin and are typechecked. The STYLESHEET is still resolved at run
  time via `createRequire` from the consumer's workspace root (`--tokensPath` escape hatch), because
  that is a file and theirs is the one their app paints with.
  - **Still no static import of `@fmmenchi/tokens`**: `scope:plugins` may not depend on
    `scope:client`. That boundary is why `@fmmenchi/theme` exists.
  - **`@fmmenchi/theme` is private, so this plugin BUNDLES it** — `vite.config.mts`, one named entry
    per path in `generators.json`/`executors.json`, because Nx loads a generator by path. A `tsc`
    build would emit `require('@fmmenchi/theme')`, which resolves in this workspace and resolves to
    nothing in a consumer's install: green here, broken there, and no test in the repo can see it.
    Inlining its code also inherits its runtime dependencies — `culori` and `apca-w3` are declared
    here and kept external.
  - **What this trades away, stated:** the rules are now the ones this plugin shipped with, not the
    ones the consumer installed. Before, resolving `@fmmenchi/tokens/validate` at run time tracked
    their version — and cost an escape-hatch option, a failure mode where the target refused to run,
    and a comment-stripping regex inlined by hand in TWO files, each apologising for the other. If a
    consumer's contract gains a role their plugin has never heard of, bump the plugin.
- The generator writes into an EXISTING project (`--project`); it never creates one.
- **Tests face the REAL validator now.** The executor's spec used to stub it through
  `--tokensPath`, so a one-role stylesheet passed as an allowed theme; its passing fixture is now
  the reference theme itself, read from `@fmmenchi/tokens`' `vars.css` and resolved — which also
  means that suite fails if the shipped theme ever stops being allowed. The generator's spec still
  points `--tokensPath` at the real `vars.css` and asserts generated role set ≡ contract role set.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

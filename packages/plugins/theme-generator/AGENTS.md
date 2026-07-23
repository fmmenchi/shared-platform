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

- **generator `theme`** — scaffolds `<projectRoot>/<directory>/<name>.css` (`--directory` default
  `src/themes`): a COMPLETE `[data-theme='<name>']` assignment instantiated from the **installed**
  `@fmmenchi/tokens` `vars.css` (resolved at run time via `createRequire` from the consumer
  workspace root; `--tokensPath` escape hatch). File header records the tokens version. Then, unless
  `--skipValidation`, CALLS the `validation` generator.
- **generator `validation`** — adds/updates the `validate-themes` target on the `--project` (points
  it at the `validate` executor; idempotent — merges, dedupes, sorts the theme list).
- **executor `validate`** — parses each theme's `--fm-color-*` declarations and runs the installed
  `@fmmenchi/tokens` `validateTheme()` (dynamic `import()` of the `@fmmenchi/tokens/validate`
  subpath; tokens is ESM). Checks completeness, parsable colors, sRGB gamut, WCAG pairs; reports the
  exact ratio per violation. Any violation fails the target.

## Rules

- **No static import of `@fmmenchi/tokens`** (scope boundary: plugins → plugins/shared only).
  Everything resolves at RUN TIME from the consumer workspace — that is also what keeps generated
  themes and validation in sync with the installed contract.
- The generator writes into an EXISTING project (`--project`); it never creates one.
- Tests stub the validate module (executor) and point `--tokensPath` at this workspace's real
  `vars.css` (generator) — the spec asserts generated role set ≡ contract role set.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

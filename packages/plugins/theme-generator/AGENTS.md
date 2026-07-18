# AGENTS.md — @fmmenchi/theme-generator

Nx plugin: brand-theme scaffolding + CI validation for the design system. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope
`plugins`, type `plugin`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/theme-generator
pnpm nx build @fmmenchi/theme-generator
pnpm nx lint @fmmenchi/theme-generator
pnpm nx test @fmmenchi/theme-generator   # node vitest (Tree-based generator + executor specs)
```

## Shape (composition)

- **generator `theme`** — scaffolds `<projectRoot>/src/themes/<name>.css`: a COMPLETE
  `[data-theme='<name>']` assignment instantiated from the **installed** `@fmmenchi/tokens`
  (`vars.css` resolved at run time from the consumer workspace → always in sync with their tokens
  version; `--tokensPath` escape hatch). Then CALLS the `validation` generator.
- **generator `validation`** — adds/updates the `validate-themes` target on the project
  (idempotent: merges + dedupes the theme list).
- **executor `validate`** — parses each theme CSS and runs the installed
  `@fmmenchi/tokens/validate` `validateTheme()` (dynamic import; tokens is ESM) — completeness,
  parsable colors, sRGB gamut, WCAG pairs. Exact ratios in the failure output.

## Rules

- **No static import of `@fmmenchi/tokens`** (scope boundary: plugins → plugins/shared only).
  Everything resolves at RUN TIME from the consumer workspace — that is also what keeps generated
  themes and validation in sync with the installed contract.
- The generator writes into an EXISTING project (`--project`); it never creates one.
- Tests stub the validate module (executor) and point `--tokensPath` at this workspace's real
  `vars.css` (generator) — the spec asserts generated role set ≡ contract role set.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

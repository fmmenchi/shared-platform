---
title: '@fmmenchi/theme-generator'
---

# @fmmenchi/theme-generator

Nx plugin for brand themes: **scaffold a complete theme from the tokens contract you have
installed, and gate it in CI** — one command wires both. The scaffold is instantiated at
generation time from your installed `@fmmenchi/tokens`, so it cannot drift from the contract.

## Install

```bash
pnpm add -D @fmmenchi/theme-generator
```

## Usage

```bash
# Scaffold apps/web/src/themes/acme.css + wire the validate-themes target
pnpm nx g @fmmenchi/theme-generator:theme acme --project=web

# The CI gate: completeness, sRGB gamut, WCAG contrast with exact ratios
pnpm nx run web:validate-themes
```

Edit the generated values, never remove a role, re-run the gate. Failure output is actionable:

```
✗ apps/web/src/themes/acme.css is NOT an allowed theme:
  primary × primary-foreground: 3.91 < 4.5
```

Pieces: generator `theme` (scaffold) → generator `validation` (wires the target, idempotent) →
executor `validate` (runs the installed `@fmmenchi/tokens/validate`).

## Reference

- What a theme must satisfy: [@fmmenchi/tokens](./tokens.md)
- Source: `packages/plugins/theme-generator`

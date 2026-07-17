# AGENTS.md — @fmmenchi/tokens

Design-token skeleton (contract) + reference presets, exposed as CSS. Part of `shared-platform` — the workspace contract is
[../../../AGENTS.md](../../../AGENTS.md); read it first. Scope `client`, type `util`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/tokens
pnpm nx build @fmmenchi/tokens
pnpm nx lint @fmmenchi/tokens
```

## Specifics

- Skeleton in `src/index.ts` (types + CSS-var names); values in `src/styles/` (Tailwind v4 `@theme` + `[data-theme]` presets).
- Consumers import `@fmmenchi/tokens/styles/tailwind.css` and reference `var(--fm-*)` — never import values from TS.
- Brand presets live in the apps; only reference presets ship here.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

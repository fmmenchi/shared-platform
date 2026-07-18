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

- Skeleton in `src/index.ts` (types + CSS-var names); values in `src/styles/` twice: `tailwind.css` (Tailwind v4 `@theme` source) and `vars.css` (same tokens as plain `:root` custom properties, for non-Tailwind consumers). Presets are plain `[data-theme]` CSS (`presets/*.css`), valid for both.
- Consumers reference `var(--fm-*)`; import `tailwind.css` (Tailwind build) or `vars.css` (agnostic) — never import values from TS. Keep the two files in sync.
- Brand presets live in the apps; only reference presets ship here.
- **Declared viewports** (`@theme`): mobile = base (no query), `--breakpoint-tablet` (48rem), `--breakpoint-desktop` (64rem); Tailwind's default breakpoints are reset (`--breakpoint-*: initial`) so only these exist. Build-time only (media queries) — NOT in `vars.css`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

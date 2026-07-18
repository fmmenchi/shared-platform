# AGENTS.md — @fmmenchi/ui

Native-first, accessible, provider-agnostic React components (CSS Modules + Tailwind + cva). Part of `shared-platform` — the workspace contract is
[../../../AGENTS.md](../../../AGENTS.md); read it first. Scope `client`, type `ui`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ui
pnpm nx build @fmmenchi/ui
pnpm nx lint @fmmenchi/ui
pnpm nx test @fmmenchi/ui            # Vitest browser mode (Chromium)
pnpm nx storybook @fmmenchi/ui       # Storybook + MCP at :6006/mcp
```

## Specifics

- Native-first: build on native elements (`<button>`, `<dialog>`) + light a11y; do not pull a headless behavior lib.
- Styling: one CSS Module per component (`<name>.module.css`), authored with Tailwind `@apply` + `var(--fm-*)` colors, `@reference` the token theme; **no utility strings in JSX**. `cva` maps variants → module classes + the `cn` helper; polymorphism via Radix Slot (`asChild`). Published as precompiled `@fmmenchi/ui/style.css` (no consumer Tailwind). See [../../../doc/styling.md](../../../doc/styling.md).
- Provider-agnostic: no copy, no i18n engine, no router; the app injects adapters through the single `UiProvider`. DS internal labels are **colocated** per component in `<name>.messages.ts` (`defineMessages('<ns>', {…})` + `useMessages(catalog)` — typed keys, every locale required); no central catalog. App overrides via the `messages` port keyed by `"<ns>.<key>"`.
- Every component MUST be tested for semantics, accessibility (axe) and functionality with React Testing Library (semantic queries, `user-event`) + a snapshot. Tests run in Vitest browser mode (Chromium).
- Storybook (`.storybook/`) with the MCP addon (`/mcp`) and a11y/docs addons; a story per component, theme + locale toolbars.
- Browser-only: DOM lib enabled in `tsconfig.lib.json`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

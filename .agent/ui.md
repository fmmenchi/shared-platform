# UI & design system — agent rules

The design system lives in `client/` as three packages (settled in
[ADR-0001](../doc/adr/0001-ui-library-foundations.md)): `@fmmenchi/tokens`,
`@fmmenchi/ui-ports`, `@fmmenchi/ui`.

## Components

- **Native-first.** Build on native elements (`<button>`, `<dialog>`, popover, `<details>`…) +
  light accessibility. Do NOT pull a headless behavior lib. Keep components SSR-safe (no
  `window`/`document` at module top-level).
- **Structure:** folder-per-component, `components/<name>/<name>.component.tsx` (+ `.test.tsx`,
  `.stories.tsx`).
- **Variants:** `cva` + the `cn` helper (clsx + tailwind-merge). Polymorphism via Radix Slot
  (`asChild`). Styling: Tailwind, token-driven utilities (`bg-primary`, `outline-ring`, …) — no
  hardcoded colors.
- **Provider-agnostic:** no copy, no i18n engine, no router. The app injects adapters
  (`@fmmenchi/ui-ports`) through the single `UiProvider`. DS internal labels are self-contained
  (`src/i18n/messages.ts`), resolved from the active locale; `direction` is derived
  (`Intl.Locale`), never injected.

## Tests — mandatory per component

React Testing Library, **semantic queries only** (by role/label/text, never test-id), `user-event`
for interaction. Every component covers: **semantics** · **accessibility** (axe, via
`test/axe.ts`) · **functionality** · a **snapshot**. Runner is Vitest **browser mode** (Chromium),
so native `<dialog>`/focus/`cancel` behave for real — use `@vitest/browser/context` `userEvent`
when a test needs real browser input (e.g. Escape).

## Tokens

Skeleton (types + CSS-var names) in `@fmmenchi/tokens/src/index.ts`; values as Tailwind v4
`@theme` + `[data-theme]` presets in `src/styles/`. Consumers import
`@fmmenchi/tokens/styles/tailwind.css` and read `var(--fm-*)`. Brand presets live in apps; only
reference presets ship here.

## Storybook

`.storybook/` with the **MCP addon** (`/mcp`) + a11y/docs addons; theme + locale toolbars wire
the preset (`data-theme`) and the DS locale. A story per component. Consult the Storybook MCP
before building/changing a component (`pnpm nx storybook @fmmenchi/ui` → `http://localhost:6006/mcp`).

## tsconfig

Browser packages enable the DOM lib in their own `tsconfig.lib.json`
(`"lib": ["es2023", "dom", "dom.iterable"]`).

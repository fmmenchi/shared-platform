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
- **Variants:** `cva` mapping to **CSS-module class names** (`styles.primary`) + the `cn` helper.
  Polymorphism via Radix Slot (`asChild`).
- **Styling:** one CSS Module per component (`<name>.module.css`), authored with Tailwind `@apply`
  (structural utilities) + `var(--fm-*)` (themeable colors), with `@reference
'@fmmenchi/tokens/styles/tailwind.css'` at the top so `@apply` resolves. **No utility strings in
  JSX** (they don't survive precompilation — put them in the module as a class). No hardcoded
  colors. See [styling](../doc/styling.md).
- **Provider-agnostic:** no copy, no i18n engine, no router. The app injects adapters
  (`@fmmenchi/ui-ports`) through the single `UiProvider`. DS internal labels are **colocated** per
  component in `<name>.messages.ts` via `defineMessages('<ns>', {…})`, read with
  `useMessages(catalog)` — typed keys, all locales required, app can override by `"<ns>.<key>"`. No
  central catalog, no i18n engine. `direction` is derived (`Intl.Locale.maximize().script`), never
  injected.

## Tests — mandatory per component

React Testing Library, **semantic queries only** (by role/label/text, never test-id), `user-event`
for interaction. Every component covers: **semantics** · **accessibility** (axe, via
`test/axe.ts`) · **functionality** · a **snapshot**. Runner is Vitest **browser mode** (Chromium),
so native `<dialog>`/focus/`cancel` behave for real — use `@vitest/browser/context` `userEvent`
when a test needs real browser input (e.g. Escape).

## Tokens

Skeleton (types + CSS-var names) in `@fmmenchi/tokens/src/index.ts`; values in `src/styles/`, two
shapes of the SAME tokens: `tailwind.css` (Tailwind `@theme` source, for a Tailwind consumer) and
`vars.css` (plain `:root` custom properties, for a non-Tailwind consumer). Presets are plain
`[data-theme]` CSS (`presets/*.css`), valid in both. Components read `var(--fm-*)`. Brand presets
live in apps; only reference presets ship here.

## Styling distribution — precompiled, agnostic

`@fmmenchi/ui` **precompiles** its CSS Modules to `dist/index.css` (hashed classes, no Tailwind
preflight) as part of the Vite lib build — exported as `@fmmenchi/ui/style.css`. Consumers import
that CSS; **Tailwind is NOT required** at the consumer. Do NOT ship source for the consumer to
`@source`-compile (that would couple every consumer to Tailwind), and do NOT ship a raw utility
sheet. Rationale + consumer recipes in [styling](../doc/styling.md).

## Browser support — Baseline

Target **Baseline: Widely available**. Enforced by `browserslist-config-baseline` (build target) +
`eslint-plugin-baseline-js` (JS/Web-APIs on `**/src/**`) + `@eslint/css` `use-baseline` (plain
shipped CSS) — wired per client package via `eslint.baseline.mjs`. Prefer widely-available APIs;
e.g. derive direction from `Intl.Locale.maximize().script`, **not** `getTextInfo` (not Baseline).
The lint isn't exhaustive (misses some `Intl` cases) — review too. Details in
[styling](../doc/styling.md#browser-support--baseline).

## Storybook

`.storybook/` with the **MCP addon** (`/mcp`) + a11y/docs addons; theme + locale toolbars wire
the preset (`data-theme`) and the DS locale. A story per component. Consult the Storybook MCP
before building/changing a component (`pnpm nx storybook @fmmenchi/ui` → `http://localhost:6006/mcp`).

## tsconfig

Browser packages enable the DOM lib in their own `tsconfig.lib.json`
(`"lib": ["es2023", "dom", "dom.iterable"]`).

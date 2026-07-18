# UI & design system — agent rules

The design system lives in `client/` as three packages (settled in
[ADR-0001](../doc/adr/0001-ui-library-foundations.md)): `@fmmenchi/tokens`,
`@fmmenchi/ui-ports`, `@fmmenchi/ui`.

## Components

- **Native-first.** Build on native elements (`<button>`, `<dialog>`, popover, `<details>`…) +
  light accessibility. Do NOT pull a headless behavior lib. Keep components SSR-safe (no
  `window`/`document` at module top-level).
- **Structure:** folder-per-component, one concern per file: `<name>.component.tsx` (**component
  only** — React Fast Refresh needs the file to export just the component), `<name>.types.ts` (**all
  types**), `<name>.variants.ts` (`cva`), `<name>.messages.ts` (i18n copy), `<name>.module.css`,
  `<name>.stories.tsx`, `<name>.test.tsx`, `<name>.mdx`, `index.ts` (barrel). Types always live in
  `.types.ts`, never scattered.
- **Variants:** `cva` (in `.variants.ts`) mapping to **CSS-module class names** (`styles.primary`) +
  the `cn` helper. Polymorphism via the `as` prop (hand-rolled `PolymorphicProps`, no headless lib).
- **Responsive:** **mobile-first** — base styles target mobile; enhance up. In the module CSS use
  the `@variant` directive (NOT `@apply tablet:…`, which drops the query): `@variant tablet {}` /
  `@variant desktop {}` for **viewport**, and prefer **container queries** (`@apply @container` on
  the root + `@variant @sm/@md {}`) so a component adapts to **its container**, not the screen.
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

## Tests — split by kind (logic vs component)

Two files, one axis — never mix:

- **Component** (`<name>.test.tsx`): the rendered component — semantics, interaction, a11y (axe via
  `test/axe.ts`), snapshot. React Testing Library, **semantic queries only** (role/label/text,
  never test-id), `user-event`.
- **Logic** (`<name>.test.ts` next to the code it tests, e.g. `i18n/provider.test.tsx`): pure
  functions/hooks with no component under test (direction resolution, message resolution, …). Test
  them where they live, generically — not through a component.

Runner is Vitest **browser mode** (Chromium) so native focus/keyboard behave for real — use
`@vitest/browser/context` `userEvent` when a test needs real browser input. Every component covers
semantics · a11y · functionality · a snapshot.

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

## Storybook & docs

`.storybook/` with the **MCP addon** (`/mcp`) + a11y/docs addons; theme + locale toolbars wire
the preset (`data-theme`) and the DS locale. A story per component. Consult the Storybook MCP
before building/changing a component (`pnpm nx storybook @fmmenchi/ui` → `http://localhost:6006/mcp`).

**Component docs** follow a standard colocated `<name>.mdx` format — a **package convention**, kept
with the code: see [`packages/client/ui/AGENTS.md`](../packages/client/ui/AGENTS.md) and Storybook →
**Guidelines/Component docs**.

## tsconfig

Browser packages enable the DOM lib in their own `tsconfig.lib.json`
(`"lib": ["es2023", "dom", "dom.iterable"]`).

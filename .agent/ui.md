# UI & design system — agent doctrine

The design system lives in `client/` as three packages (settled in
[ADR-0001](../doc/adr/0001-ui-library-foundations.md)): `@fmmenchi/tokens` (design tokens),
`@fmmenchi/ui-ports` (injection contracts), `@fmmenchi/ui` (components). Dependencies point
downward: `ui → ui-ports`, `ui → tokens`.

This spoke is the **cross-package doctrine** (the why/what). For **how to author in `@fmmenchi/ui`**
— styling, primitives, tests, i18n, component docs, build/packaging — open the package's own hub and
`.agent/` spokes: [`packages/client/ui/AGENTS.md`](../packages/client/ui/AGENTS.md).

## Principles

- **Native-first, no headless behavior lib.** Build on native elements (`<button>`, `<dialog>`,
  popover, `<details>`…) + light accessible-name wiring. SSR-safe (no `window`/`document` at module
  top-level).
- **Provider-agnostic via ports.** The lib bundles no i18n engine, router, icon set or app copy; the
  app injects adapters (`@fmmenchi/ui-ports`) through one thin `UiProvider`. DS micro-copy is
  self-contained and colocated; `direction` is derived from the locale
  (`Intl.Locale.maximize().script`), never injected. Port design in
  [ADR-0001](../doc/adr/0001-ui-library-foundations.md).
- **Structure.** Folder-per-component, one concern per file; component files export **only** the
  component (Fast Refresh), types always in `<name>.types.ts`.
- **Tests split by kind.** Component behaviour (semantics, interaction, a11y via axe, snapshot) vs
  pure logic/hooks (tested where they live, generically). Vitest browser mode.
- **Responsive: mobile-first, container-first.** Base = mobile; a component adapts to **its
  container** (container queries) before the viewport.
- **Browser support = Baseline: Widely available**, enforced in tooling —
  [styling](../doc/styling.md#browser-support--baseline).

## Tokens (`@fmmenchi/tokens`)

Skeleton (TS types + CSS-var names) + values in two shapes of the SAME tokens: `tailwind.css`
(`@theme` source) and `vars.css` (plain `:root` custom properties, for non-Tailwind consumers).
Presets are plain `[data-theme]` CSS; declared viewports (mobile/tablet/desktop) are `@theme`
breakpoints. Components read `var(--fm-*)`; brand presets live in apps.

## Styling distribution — precompiled, agnostic

`@fmmenchi/ui` is authored with CSS Modules + Tailwind `@apply` + `cva` and **precompiled** to
scoped CSS (`@fmmenchi/ui/style.css`) so consumers import CSS and **never run Tailwind**. Rationale,
the adversarial review, and consumer recipes: [styling](../doc/styling.md).

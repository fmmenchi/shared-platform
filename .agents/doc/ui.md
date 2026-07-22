# UI & design system — agent doctrine

The design system lives in `client/` as three packages (settled in
[ADR-0001](../../apps/docusaurus/docs/adr/0001-ui-library-foundations.md)): `@fmmenchi/tokens` (design tokens),
`@fmmenchi/ui-ports` (injection contracts), `@fmmenchi/ui` (components). Dependencies point
downward: `ui → ui-ports`, `ui → tokens`.

This spoke is the **cross-package doctrine** (the why/what). For **how to author in `@fmmenchi/ui`**
— styling, primitives, tests, i18n, component docs, build/packaging — open the package's own hub and
`.agents/doc/` spokes: [`packages/client/ui/AGENTS.md`](../packages/client/ui/AGENTS.md).

## Principles

- **Native-first, no headless behavior lib.** Build on native elements (`<button>`, `<dialog>`,
  popover, `<details>`…) + light accessible-name wiring. SSR-safe (no `window`/`document` at module
  top-level).
- **Provider-agnostic via ports.** The lib bundles no i18n engine, router, icon set or app copy; the
  app injects adapters (`@fmmenchi/ui-ports`) through one thin `UiProvider`. DS micro-copy is
  self-contained and colocated; `direction` is derived from the locale
  (`Intl.Locale.maximize().script`), never injected. Port design in
  [ADR-0001](../../apps/docusaurus/docs/adr/0001-ui-library-foundations.md).
- **Structure.** Folder-per-component, one concern per file; component files export **only** the
  component (Fast Refresh), types always in `<name>.types.ts`.
- **Tests split by kind.** Component behaviour (semantics, interaction, a11y via axe, snapshot) vs
  pure logic/hooks (tested where they live, generically). Vitest browser mode.
- **Responsive: mobile-first, container-first.** Base = mobile; a component adapts to **its
  container** (container queries) before the viewport.
- **Browser support = Baseline: Widely available**, enforced in tooling —
  [styling](../../apps/docusaurus/docs/styling.md#browser-support--baseline).

## Tokens (`@fmmenchi/tokens`) — the theme contract

**Semantics wins over everything**: components consume ONLY semantic roles (`--fm-*`); the bridge
resets Tailwind's default palette so a raw colour utility does not compile. Single source of values
= `vars.css` (static, Baseline-safe literals); `tailwind.css` is a names-only `@theme inline`
bridge; presets are plain `[data-theme]` CSS overriding EXACTLY every color role. A theme =
complete color-role assignment (`ThemeColors`), enforced with WCAG-contrast by
`tokens.test.ts`. Declared viewports are the `@theme` breakpoints. Brand presets live in apps.
Rules: [`packages/client/tokens/AGENTS.md`](../packages/client/tokens/AGENTS.md).

## Styling distribution — precompiled, agnostic

`@fmmenchi/ui` is authored with CSS Modules + Tailwind `@apply` + `cva` and **precompiled** to
scoped CSS (`@fmmenchi/ui/style.css`) so consumers import CSS and **never run Tailwind**. Rationale,
the adversarial review, and consumer recipes: [styling](../../apps/docusaurus/docs/styling.md).

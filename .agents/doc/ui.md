# UI & design system — agent doctrine

The design system lives in `client/` as two packages (foundations in
[ADR-0001](../../apps/docusaurus/docs/adr/0001-ui-library-foundations.md); the port package was later
absorbed, [ADR-0006](../../apps/docusaurus/docs/adr/0006-absorb-ui-ports.md)): `@fmmenchi/tokens`
(design tokens), `@fmmenchi/ui` (components + the injection-port types it re-exports). Dependencies
point downward: `ui → tokens`.

This spoke is the **cross-package doctrine** (the why/what). For **how to author in `@fmmenchi/ui`**
— styling, primitives, tests, i18n, component docs, build/packaging — open the package's own hub and
`.agents/doc/` spokes: [`packages/client/ui/AGENTS.md`](../packages/client/ui/AGENTS.md).

## Principles

- **Native-first, no headless behavior lib.** Build on native elements (`<button>`, `<dialog>`,
  popover, `<details>`…) + light accessible-name wiring. SSR-safe (no `window`/`document` at module
  top-level).
- **Provider-agnostic via ports.** The lib bundles no i18n engine, router, icon set or app copy; the
  app injects adapters (typed by the injection ports `@fmmenchi/ui` re-exports) through one thin
  `UiProvider`. DS micro-copy is
  self-contained and colocated; `direction` is derived from the locale
  (`Intl.Locale.maximize().script`), never injected. Port design in
  [ADR-0001](../../apps/docusaurus/docs/adr/0001-ui-library-foundations.md).
- **Icons: artwork is app content, the DS owns the seam.** An icon set is brand identity (like a
  colour preset) → it lives app-side, injected via the `IconRenderer` port / `icon` props. Injected
  icons must satisfy the contract documented on `IconRenderer` (`currentColor`, square viewBox,
  `em`-sized, decorative-by-default). Functional glyphs a component needs to work (spinner, a future
  chevron/✕) are drawn **inline in the component** — never from an icon set.
- **One fact, one owner.** Never keep a second copy of something the platform already knows — which
  element has focus, whether a popover is open, what a control's value is. Six of the eight design
  defects found building the Menu were one copy drifting from its original: an `activeId` the arrows
  read while the pointer wrote it, a label captured at registration while the DOM said otherwise, an
  intent put in state that a `toggle` firing before the re-render read stale. Three consequences, in
  the order to reach for them:
  - **Let CSS read the fact.** `:focus`, `:popover-open`, `:checked`, `:disabled`. An invariant the
    engine enforces cannot drift; one an attribute enforces is only as good as the code writing it.
  - **Where React must RENDER from a platform fact** — `aria-expanded` sits on a different element,
    `tabindex` cannot be expressed in CSS — mirror it in ONE direction, from the platform, and never
    command the platform from the mirror (`useOpenMirror`).
  - **Where a fact has to travel between parts before React can re-render**, put it on the element,
    not in state: `toggle` fires before the re-render, so a state update is read stale by the handler
    that follows it.
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

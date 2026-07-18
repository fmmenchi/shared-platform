# ADR 0001 — UI library foundations

- **Status:** draft (scouting)
- **Date:** 2026-07-17
- **Deciders:** Fabio Menchicchi

## Context and problem statement

The platform needs its design-system library in `client`: a token skeleton, components, and a
reference preset. The solution space is wide — component primitives, styling engine, theming
mechanism, provider integration — and the wrong early pick is expensive to reverse once
components exist. This ADR frames the scouting: the drivers, the anatomy of what "independent"
concretely requires, a proposed layering (with names), the options to compare, and what a spike
must prove before ADR-0002 records the actual decision.

## Decision drivers

1. **Abstract, provider-agnostic layer.** Consumed by different apps; must not hard-depend on any
   app-level provider choice (i18n library, router, date library, icon set).
2. **SSR-safe** (no `window`/`document` at module top-level) and ideally RSC-friendly (minimal
   `use client` surface).
3. **Independent release** (this repo's model): tree-shakable, side-effect-free modules, stable
   public API per package.
4. **Accessibility baseline** without hand-rolling focus/aria logic.
5. **Dev loop**: Storybook-compatible, unit-testable, visually diffable.

## The injection seam — anatomy of "independent"

"Provider-agnostic" is achieved by **dependency injection through ports**: the lib defines an
interface (the port), the app supplies an implementation (the adapter), passed through a single
thin `UiProvider`. That provider carries _only_ injected adapters + the active preset — it is an
inversion-of-control seam, not a feature provider. The ports the lib must expose:

| Concern       | What the lib must NOT bundle    | Injected port (proposed name)                          |
| ------------- | ------------------------------- | ------------------------------------------------------ |
| i18n          | an i18n engine, a locale source | `I18n` (`{ locale, messages? }`) — see below           |
| Navigation    | `react-router` / `next/link`    | `LinkComponent` and/or `NavigateFn`                    |
| Icons         | an icon set                     | `IconRenderer` (name → node) or icons-as-props         |
| Portal target | a hardcoded container           | `PortalContainer` (`HTMLElement \| () => HTMLElement`) |
| Polymorphism  | assuming the rendered element   | `asChild` / `render` prop (Slot pattern)               |

i18n is the subtlety and gets its own section below; the short version is that the lib owns no
app copy and no i18n engine, and formats via the platform `Intl` API rather than a bundled
library.

### i18n ownership

The rule is: **separate the mechanism from the content, and the state from the rendering.**

| Thing                                         | Who provides it                 | Frequency                          |
| --------------------------------------------- | ------------------------------- | ---------------------------------- |
| Translation mechanism (the `I18n` port)       | `@fmmenchi/ui-ports` (contract) | —                                  |
| Internal labels ("Close", "Previous month")   | the DS — bundled catalogs       | never passed; resolved by `locale` |
| Active locale                                 | the app, via the provider       | once                               |
| Label override / extra locale                 | the app, via `messages`         | once, optional                     |
| App copy (a Dialog's title, etc.)             | the app, as props/children      | it is the app's own text           |
| Supported product languages / switcher option | the app                         | app business — not in the port     |
| i18n engine (i18next / react-intl)            | the app                         | never in the DS                    |

Consequences that fix the earlier over-modeling:

- **Internal labels are self-contained.** The DS bundles its own label catalogs keyed per
  locale, resolves them from the active `locale`, and falls back to `UI_FALLBACK_LOCALE`. You
  **never pass "Close" to a `Dialog`**, and you don't register the DS's keys in your app catalog.
  `messages` on the provider is a set-once override, not a per-instance prop.
- **The DS is stateless about the active locale.** Current language, the switch action and
  persistence (URL / cookie / user pref) are the app's — bound to its router/state. The DS only
  _reads_ the injected locale and re-renders; owning that state would fight the app.
- **`direction` is derived, not injected.** It is a function of the locale
  (`new Intl.Locale(locale).textInfo.direction`), so it is not a port field — injecting both
  would allow the illegal `{ locale: 'ar', direction: 'ltr' }`. The provider sets `dir` on its
  root from the locale and components use CSS logical properties, so most never branch on it. An
  optional `directionOverride` is an escape hatch, not the norm.
- **`supportedLocales` is app business, not a port input.** The DS doesn't change behavior based
  on the app's language list; it only needs the active locale and falls back internally. The DS
  instead _exposes_ its own coverage as read-only metadata (`UI_SUPPORTED_LOCALES`,
  `UI_FALLBACK_LOCALE`) so the app can reason about it. A `<LocaleSwitcher>`, if offered, takes
  its options as props from the app.
- **The provider is thin.** It carries no catalogs and no state — pure pass-through of the
  injected adapter into context, so deep components read it without prop-drilling.

## The three-layer lens (how mature libs separate concerns)

Every mature system splits three axes; we evaluate options along the same lens:

1. **Behavior + a11y (headless, unstyled)** — React Aria Components (Adobe), Radix Primitives,
   Ariakit, Headless UI. This is the layer we build _on_, not reinvent.
2. **Styling strategy** — runtime CSS-in-JS (MUI/Chakra via emotion; rich theming, costly under
   RSC) vs. zero-runtime (vanilla-extract, Panda, Tailwind v4, CSS Modules; tokens → CSS
   variables at build time; fits independent release + RSC).
3. **Distribution model** — published npm package (MUI, Chakra, Mantine, Radix) vs. copy-in /
   "own the code" (shadcn/ui). We need **one published package** consumed by many apps → npm
   model; copy-in is explicitly out.

Reference point for the injection pattern in the wild: MUI's date pickers take
`<LocalizationProvider dateAdapter={AdapterDayjs}>` — a mature lib _injects_ the app's date
library instead of bundling one. React Aria already externalizes locale (`I18nProvider`),
navigation (`RouterProvider` + your `navigate`), uses `Intl`, and ships overridable localized
strings — i.e. it solves roughly half of the ports table for free.

## Proposed layering (to validate in the spike)

Bottom-up, each layer independently releasable; dependencies point strictly downward
(D → C → B → A). All packages `scope:client`; the app implements B's contracts, supplies A's
preset, and wraps its tree in D's provider.

| Layer | Proposed package     | Type        | Responsibility                                                                                                                    |
| ----- | -------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A     | `@fmmenchi/tokens`   | `type:util` | Token **skeleton** (`Tokens` type + CSS-variable names) + a reference `Preset` (values). No React — usable by any styling engine. |
| B     | `@fmmenchi/ui-ports` | `type:util` | Port **contracts** only (TS interfaces below). Zero runtime — an app can write adapters without importing components.             |
| C     | _(internal)_         | —           | Headless behavior/a11y layer: adopt (React Aria / Radix) vs. build. Likely internal, not published separately at first.           |
| D     | `@fmmenchi/ui`       | `type:ui`   | Styled, token-driven components on top of C, plus the single `UiProvider` wiring B's adapters into context. Depends on A + B.     |

Open sub-questions for the spike: whether **B and C** deserve their own packages or start as
subpaths of `@fmmenchi/ui` (clean boundaries vs. over-fragmentation), and whether the reference
`Preset` ships inside `@fmmenchi/tokens` or as a separate `@fmmenchi/preset-base`. Independent
release pays off here: a brand tweak is a patch to A alone; a new component is a minor to D
without touching A.

### Proposed interface names (Layer B / provider)

```ts
// @fmmenchi/ui-ports
type Direction = 'ltr' | 'rtl'; // derived, not injected

interface I18n {
  locale: string; // the only mandatory i18n input; direction derived from it
  messages?: DeepPartial<UiMessages>; // set-once override of the DS's own labels
}

type LinkComponent = React.ComponentType<
  { href: string } & Record<string, unknown>
>;
type NavigateFn = (href: string) => void;
type IconRenderer = React.ComponentType<{ name: string }>;
type PortalContainer = HTMLElement | (() => HTMLElement);

interface UiAdapters {
  // the injected bundle
  i18n: I18n;
  Link?: LinkComponent;
  navigate?: NavigateFn;
  Icon?: IconRenderer;
  portalContainer?: PortalContainer;
}

// @fmmenchi/ui
export const UI_SUPPORTED_LOCALES = ['en', 'it', 'es'] as const; // DS coverage (read-only)
export const UI_FALLBACK_LOCALE = 'en';
type UiProviderProps = UiAdapters & {
  preset: Preset;
  children: React.ReactNode;
};
// <UiProvider>…</UiProvider> — thin: pass-through only, no catalogs, no locale state.
// direction = new Intl.Locale(i18n.locale).textInfo.direction, set as `dir` on the root.
```

Names are proposals to bikeshed once the shape is validated, not locked.

## Options to explore

- **Behavior (C):** React Aria Components · Radix Primitives · hand-rolled.
- **Styling (D):** CSS Modules · vanilla-extract · Tailwind v4 · (runtime CSS-in-JS — likely out).
- **Theming:** CSS custom properties from the skeleton, preset = variable values, theme switch =
  `data-theme`/class on a root element (preferred) · React context carrying the preset (worse SSR).
- **Provider:** single `UiProvider` with per-concern defaults (partial adoption) · per-concern
  contexts · props-only.

## Current direction (spike variant 1 — implemented)

Chosen for the first spike, now built in `packages/client/{tokens,ui-ports,ui}`:

- **C → native-first, lightweight a11y.** Build on native elements (`<button>`, `<dialog>`) and
  add only accessible-name wiring; the platform gives role, focus trap, Escape and `::backdrop`
  for free. No headless behavior lib. Polymorphism via Radix Slot (`asChild`) only.
- **D → CSS Modules authored with Tailwind, variants via `cva`.** Each component has a
  `<name>.module.css` written with Tailwind `@apply` (structural utilities) + `var(--fm-*)`
  (themeable colors), with `@reference` to the token theme so `@apply` resolves. `cva` maps the
  variant API to the module's class names; `cn` composes. Tokens are the Tailwind `@theme` for
  authoring; presets override `[data-theme]`.

### Styling distribution — precompiled, agnostic

Decision: the lib is **published to external repos**, so it must not impose a styling engine on
consumers (Driver 1). It therefore **precompiles**:

- `@fmmenchi/ui`'s Vite build compiles the CSS Modules to `dist/index.css` — hashed, scoped
  classes, **no Tailwind preflight** — with the JS referencing the same hashes. Exported as
  `@fmmenchi/ui/style.css`. Consumers `import` it; **no Tailwind required**. `cva`/`cn` are
  bundled runtime internals, invisible to consumers.
- `@fmmenchi/tokens` ships the tokens in two shapes: `tailwind.css` (`@theme` source, for a
  Tailwind consumer or the lib's own authoring) and `vars.css` (plain `:root` custom properties,
  for the agnostic import). Colors resolve through `var(--fm-*)`, so `[data-theme]` presets
  re-theme the precompiled CSS at runtime.
- Storybook and the browser tests act as a Tailwind host that compiles the modules, so the dev
  loop and the published artifact share one authoring source.

This is the andes-routes authoring pattern (CSS Modules + `@apply` + `cva`) **plus** a precompile
step that andes-routes omits — its `libs/ui` is _internal_, so its app compiles the source via
`@source '…/libs/ui/src'`. Rejected alternatives: shipping source for the consumer to
`@source`-compile (couples every consumer to Tailwind and the exact toolchain, with silent-failure
footguns when a bundler skips `node_modules` CSS), and a precompiled **raw utility** sheet (global
utilities that collide with the app's and override poorly). Full rationale + adversarial review in
[styling](../styling.md).

- **Provider → single thin `UiProvider`** carrying the injected `UiAdapters`; DS labels
  self-contained, `direction` derived.
- **Testing → Vitest browser mode (Chromium)**, React Testing Library semantic queries + axe;
  every component covers semantics, a11y, functionality and a snapshot.
- **Storybook** with the MCP addon + a11y/docs, theme + locale toolbars.

Open for a possible variant 2 / ADR-0002: whether a headless lib (React Aria/Radix) is worth it
for richer widgets, and the bundle/RSC measurements. Names above may still bikeshed.

## Scouting plan

One spike per shortlisted combination (start: React Aria + {vanilla-extract | CSS Modules} +
CSS-variable theming + single provider) with the same 3 components — `Button` (trivial),
`TextField` (forms + a11y), `Dialog` (portal/focus-trap, the SSR/RSC stress test) — themed by two
different presets and rendered in a host app with a fake i18n adapter and a fake `Link`. Compare:
bundle size, SSR/RSC behavior, theming ergonomics, a11y out of the box, and consumer API noise.

**Exit criteria:** one combination wins on the drivers → ADR-0002 records the decision
(behavior layer, styling, theming, provider pattern, final package split + names) and this ADR
moves to `superseded by 0002`.

## Consequences

TBD — recorded by ADR-0002 after the spikes.

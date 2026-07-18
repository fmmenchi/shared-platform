# Styling the design system — Tailwind + CSS Modules + `cva`

How `@fmmenchi/ui` is styled, why it is done this way, and what a consumer has to do. The short
version: **we author with Tailwind and CSS Modules, model variants with `cva`, and publish
precompiled CSS so consumers need no Tailwind of their own.**

> Agent rules (the terse checklist) live in [`.agent/ui.md`](../.agent/ui.md). This file is the
> human explanation and the rationale behind those rules.

## The three tools and what each is for

The combination is not three ways of doing the same thing — each tool owns a different job, and
they only work well together.

| Tool                    | Job                                                                                                                | Lives in               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **Tailwind** (`@apply`) | Authoring shorthand for the _mechanical_ CSS — flexbox, spacing, radius, font, transitions, focus-ring geometry.   | inside `*.module.css`  |
| **CSS Modules**         | Scoping. Turns our class names into hashed, collision-proof classes and lets the build emit one stylesheet.        | `<name>.module.css`    |
| **`cva`**               | The variant contract. Maps the component's public API (`variant`, `size`, …) to the right class names, with types. | `<name>.component.tsx` |

`cn` (clsx + tailwind-merge) is a small helper that composes the resulting class list with any
`className` a caller passes. That's all it does.

## Why this combination (and not the obvious alternatives)

### Why CSS Modules — not utilities inline in the JSX

The tempting default is Tailwind's headline style: utility strings right in the markup
(`className="px-4 bg-primary"`). We deliberately don't, because of **who consumes this library**.
`shared-platform` publishes abstract layers to _external_ repos (see the
[architecture](./architecture.md) note and Driver 1 in [ADR-0001](./adr/0001-ui-library-foundations.md)).
Utilities-in-JSX only become real CSS when _something runs Tailwind over that JSX_. For an
in-repo app that's fine — but for a published package it would force **every** consumer to install
Tailwind, register our package as a `@source`, and match our toolchain, or the components render
unstyled with **no error at all**. CSS Modules give us hashed classes we can **precompile once**
and ship as plain CSS — the consumer imports a stylesheet and is done.

### Why Tailwind `@apply` — not hand-written CSS

Inside the module we still author with Tailwind, via `@apply`. It keeps the ergonomics we like
(`@apply inline-flex items-center gap-2 rounded-md` reads faster than the longhand) and, crucially
in v4, **`@apply` of a token utility compiles to a `var()`, not a frozen literal** — e.g.
`@apply rounded-md` becomes `border-radius: var(--radius-md)`. So theming still works through the
precompiled output. Tailwind here is a _build-time authoring detail_, never something the consumer
sees. (`@apply` is often discouraged for app code because it re-introduces the naming indirection
Tailwind tries to remove — but that objection is about co-location in markup, which we've already
traded away on purpose for a publishable boundary. As a build-time convenience behind
precompilation it's a fair call.)

### Why `cva` — not conditionals by hand

Components have orthogonal axes (colour `variant` × `size` × state). `cva` expresses that as data
and derives the prop types from it, so the public API and the classes never drift. It maps to
**class names**, and those names can be CSS-module classes just as easily as utilities — so `cva`
composes cleanly with the CSS-Modules choice above.

### Why colours go through `var(--fm-*)`, structure through `@apply`

A rule of thumb worth stating: **themeable properties use `var(--fm-*)`, mechanical ones use
`@apply`.** A preset (`[data-theme="dark"]`) re-defines the `--fm-*` variables at runtime; because
the precompiled CSS references those variables, the theme switch works with no rebuild. Spacing,
radius and typography aren't re-themed per brand, so `@apply` shorthand for them is fine (and, as
noted, still resolves to `var()` where a token is involved).

## What a component looks like

`cva` maps variants to module classes; the module holds the actual styling:

```tsx
// button.component.tsx
import { cva } from 'class-variance-authority';
import styles from './button.module.css';

const buttonVariants = cva(styles.button, {
  variants: {
    variant: { primary: styles.primary, secondary: styles.secondary /* … */ },
    size: { sm: styles.sm, md: styles.md, lg: styles.lg },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

```css
/* button.module.css */
@reference '@fmmenchi/tokens/styles/tailwind.css'; /* gives @apply the token theme */

.button {
  @apply inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition;
}
.primary {
  background: var(--fm-color-primary); /* themeable → preset re-colours it */
  color: var(--fm-color-primary-foreground);
}
.md {
  @apply px-4 py-2;
}
```

Two rules make or break this:

1. **`@reference` at the top of every module** — it pulls in the token `@theme` so `@apply` (and
   the color utilities) resolve at build time, without duplicating that CSS into the output.
2. **No utility strings in the JSX.** Anything you'd write as `className="…"` with utilities must
   instead be a class in the module (e.g. the decorative icon slot is `styles.icon`, not an inline
   string). Inline utilities are invisible to precompilation and would silently do nothing for a
   consumer.

## Distribution — precompiled, agnostic

The Vite library build already does the work: it compiles every `*.module.css` (resolving
`@apply`/`@reference`) into a single **`dist/index.css`** with hashed class names, and the emitted
JS references those same hashes. Two properties matter:

- **No Tailwind preflight** leaks into the output — the base reset stays out, so importing our CSS
  never restyles the consumer's page.
- **Hashes are consistent** because the JS and the CSS come from the _same_ build.

It is exported as **`@fmmenchi/ui/style.css`**. Tokens ship in two shapes so both kinds of consumer
are covered by the _same_ variables:

- `@fmmenchi/tokens/styles/tailwind.css` — the Tailwind `@theme` source (authoring, or a Tailwind
  consumer that wants the tokens in its own build).
- `@fmmenchi/tokens/styles/vars.css` — the SAME tokens as plain `:root` custom properties (single source — the Tailwind file is a names-only bridge over it), for
  a consumer with no Tailwind.
- `@fmmenchi/tokens/styles/presets/*.css` — plain `[data-theme]` overrides, valid in both lanes.

### Consumer recipe

```css
@import '@fmmenchi/tokens/styles/vars.css'; /* the --fm-* variables (plain CSS) */
@import '@fmmenchi/tokens/styles/presets/dark.css'; /* optional [data-theme='dark'] preset */
@import '@fmmenchi/ui/style.css'; /* precompiled component styles */
```

```tsx
import { UiProvider, Button } from '@fmmenchi/ui';

<UiProvider adapters={{ i18n: { locale: 'en' } }} theme="base">
  <Button variant="primary">Save</Button>
</UiProvider>;
```

Set `data-theme="dark"` on a root element to switch preset at runtime — the variables re-theme the
precompiled components, no rebuild.

## Relationship to andes-routes, and what we changed

The **authoring** pattern is andes-routes': CSS Modules + `@apply` + `cva`, colours via CSS
variables. We kept it wholesale.

The **distribution** is where we diverge, on purpose. andes-routes' `libs/ui` is an _internal_
library: its app compiles the library's source and registers it with
`@source '…/libs/ui/src'`, so Tailwind runs once, over app + library together. That's the right
call for an internal library — but it requires the consumer to run Tailwind. Because
`@fmmenchi/ui` is **published to external repos**, we add the one step andes-routes doesn't need:
**precompilation**. Same authoring, compiled artifact instead of source.

### Alternatives we rejected (adversarial review)

- **Ship source, let the consumer `@source`-compile it** (the andes-routes model, applied to a
  published package). Rejected: it exports our toolchain as a consumer requirement — Tailwind v4,
  CSS-Modules processing, PostCSS over `node_modules` — and Tailwind v4 skips `node_modules` by
  design, so a forgotten `@source` yields **unstyled components with no error**. It also
  contradicts Driver 1 (provider-agnostic).
- **A precompiled _raw utility_ sheet** (`.px-4`, `.bg-primary` shipped globally). Rejected: two
  global utility sheets (app + library) collide, and consumers can only override by fighting
  utility specificity. Scoped CSS-module classes avoid both.
- **Tailwind as a hard consumer requirement** ("all our apps are Tailwind, so just `@source` us").
  Rejected as a platform coupling we can't guarantee for external consumers; precompilation lets
  Tailwind and non-Tailwind apps consume the library identically.

The trade we accept: overriding an individual property from outside is less ergonomic than with
utilities (do it through the token variables, or with a higher-specificity rule), and there is a
build-time `@apply` dependency on Tailwind. Both are contained inside the library and invisible at
its boundary.

## Browser support — Baseline

The platform targets **Web Platform Baseline: Widely available** — features supported across the
core browser set (Chrome, Edge, Firefox, Safari) for **30+ months**. We don't hand-maintain a
browser matrix; Baseline is the moving target and the tooling below enforces it.

Three tools, each covering a different layer:

| Tool                               | Enforces                                                                                                                       | Where                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **`browserslist-config-baseline`** | the **build target** — the compiler (Tailwind/Lightning CSS, esbuild) emits CSS/JS for Baseline (fallbacks, no too-new output) | root `package.json` `browserslist`                  |
| **`eslint-plugin-baseline-js`**    | non-Baseline **JS syntax / builtins / Web APIs** in shippable source                                                           | `eslint.baseline.mjs`, on `**/src/**` (client only) |
| **`@eslint/css` `use-baseline`**   | non-Baseline **CSS features** in the **plain** stylesheets we ship (`vars.css`, presets)                                       | same config                                         |

Notes and honest limits:

- **The browserslist target is the real lever for CSS.** Our component CSS is Tailwind-authored
  and precompiled, so `@eslint/css` can't source-lint it (its parser rejects `@apply`/`@reference`);
  what keeps the _compiled_ CSS Baseline is the compiler honoring the browserslist target. The CSS
  lint therefore only guards the plain hand-written token stylesheets.
- **The JS lint runs on `src/**` only** — not Node tooling (eslint/vite configs) or dev-only
  test/story files, whose runtime never reaches a consumer's browser. It's wired **per client
  package** (each imports `eslint.baseline.mjs`); it deliberately does not live in the root config,
  which also covers Node-targeted `server`/`shared` code.
- **The linter is not omniscient.** It flags what `web-features` maps (e.g. `Promise.withResolvers`,
  `structuredClone`) but misses some `Intl` edge cases — the reason we caught
  `Intl.Locale.prototype.getTextInfo` (not Baseline; Firefox shipped it late) by review and switched
  the direction logic to `Intl.Locale.maximize().script` (Baseline). Tooling + review, not tooling
  alone.

Run it with the normal `pnpm nx lint`; a non-Baseline feature fails the lint (and CI).

## Responsive — mobile-first, container-first

The DS **declares its viewports** as tokens (mobile is the base; `tablet` ≥ 768px, `desktop` ≥
1024px) and resets Tailwind's default breakpoints so only those exist. Author **mobile-first**: base
styles target the smallest screen, and you enhance up.

Two gotchas make this concrete:

1. **`@apply tablet:…` does not work.** Tailwind v4 can't inline a media query into a flat rule, so
   `@apply tablet:flex` silently drops the query and just applies `flex`. Use the **`@variant`**
   directive instead, which wraps the nested rules:

   ```css
   .toolbar {
     display: block; /* mobile */
     @variant tablet {
       display: flex;
     } /* ≥768px */
   }
   ```

2. **Prefer container queries over viewport queries.** A reusable component should respond to _its
   container_, not the screen — the same Card behaves right in a sidebar and in a wide main column.
   Mark the root a container and query its size:

   ```css
   .card {
     @apply @container;
     display: block;
     @variant @md {
       display: grid;
     } /* container ≥ md */
   }
   ```

   Reserve viewport queries (`@variant tablet/desktop`) for genuine page-layout decisions.

Storybook has a **viewport toolbar** (Mobile / Tablet / Desktop) to preview each device class.

## Rules of thumb (recap)

- One `*.module.css` per component; `@reference` the token theme at the top.
- `@apply` for structure, `var(--fm-*)` for anything a brand re-themes. No hardcoded colours.
- `cva` maps variants → module classes; `cn` composes with the caller's `className`.
- **Never** put utility strings in the JSX — they don't survive precompilation.
- The library ships CSS (`@fmmenchi/ui/style.css`); it never asks the consumer to run Tailwind.

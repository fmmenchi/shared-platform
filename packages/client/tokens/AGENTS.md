# AGENTS.md — @fmmenchi/tokens

The token VALUES, and the stylesheets that carry them — the most delicate package of the platform:
what it ships is what every consumer paints with. Part of `shared-platform`; workspace contract in
[../../../AGENTS.md](../../../AGENTS.md). Scope `client`, type `util`.

**The CONTRACT is not here.** What a theme IS and whether one is allowed live in
[`@fmmenchi/theme`](../../shared/theme) — private, source-only, bundled into whoever uses it. The
split is not tidiness: `@fmmenchi/nx-theme-generator` is `scope:plugins` and may not depend on a
`scope:client` library, so as long as the contract lived here the generator could only reach it
through `createRequire` and dynamic `import()`. `scope:shared` is the one scope a client library, a
plugin and an app may all import.

## Commands

```bash
pnpm nx typecheck @fmmenchi/tokens
pnpm nx build @fmmenchi/tokens
pnpm nx lint @fmmenchi/tokens
pnpm nx test @fmmenchi/tokens      # contract validation (completeness, bridge, WCAG contrast)
pnpm nx test @fmmenchi/tokens -- -u # regenerate styles/properties.css after changing the contract
```

## Where this package stops

It owns **the values** and the artefacts rendered from them:

```
styles/vars.css            the values — hand-written, and the design work
styles/presets/dark.css    the dark assignment
styles/properties.css      GENERATED from the contract + vars.css
styles/tailwind.css        a names-only bridge (no values -> no drift)
styles/baseline.css        optional element rules
```

Plus the suites that hold those stylesheets to the contract, and the emitter that renders
`properties.css`.

**THERE IS NO TS SURFACE.** This package exports stylesheets and nothing else — no `.` entry, no
`dist`, no build target. `COLOR_ROLES`, `tokenVars` and the types come from `@fmmenchi/theme`, and
everything in this workspace imports them from there directly.

A re-export barrel was tried first, so that consumers would keep one import. It was removed for a
measured reason: `@fmmenchi/theme` is private, so a published `dist` re-exporting it must INLINE it,
and while Vite inlines the JavaScript, the declarations keep `export … from '@fmmenchi/theme'` —
`rollupTypes`, `rollupConfig.bundledPackages` and the config `@nx/js:library --bundler=vite`
generates all leave it there, because api-extractor treats anything in `node_modules` as external
and a workspace link is in `node_modules`. A JS consumer would have worked and a TypeScript one
would not have resolved a single name, with nothing in this repo failing.

The cost is that an EXTERNAL consumer has no `tokenVars` and no types — and that cost is temporary
by design rather than accepted. Those are not a contract to re-export; they are a BINDING, and a
binding is **generated into the consumer's own repo and imported from there**, never exported from
here — the same shape as the theme CSS: the generator writes the file, the consumer imports their
own. So no package of ours needs to carry it, and re-exporting it would have been the wrong
mechanism even if the declarations had inlined cleanly. Until that lands, a consumer reads
`var(--fm-*)`, which is the universal surface and always was.

**This package is on its way to becoming a generated artefact.** The direction settled on
2026-08-31: one code path from bases to theme CSS, ours being an invocation of it with our bases,
exactly as a consumer's is with theirs — so "our theme" and "their theme" cannot differ in kind. When
that lands, `vars.css` stops being hand-written, the suites below that check the CSS against the
contract stop being necessary (a generated file cannot drift), and the design reasoning currently in
this file's comments has to move beside the data rather than disappear. Not yet, and nothing here
should be written as though it had happened.

## Rules

- **Semantics wins over everything.** Components consume ONLY semantic roles (`--fm-color-primary`,
  `--fm-space-inset-m`, …) — never raw values, never a palette. The Tailwind bridge RESETS the
  default palette, so `bg-red-500` fails the build.
- **`styles/properties.css` is GENERATED and must never be edited by hand.** It is rendered by
  `src/utils/generate-properties.ts` from the contract + `vars.css`, and `generate-properties.test.ts` compares it to what is on
  disk with `toMatchFileSnapshot` — so a hand edit fails the ordinary test run and a legitimate
  change is `vitest -u`. The existence of the file is asserted SEPARATELY, because
  `toMatchFileSnapshot` writes a missing file and reports a pass outside CI.
  - **What is generated and what is not, and why.** `vars.css` holds the values and stays
    hand-written: those numbers are the design work, they already live in exactly one place, and
    the prose around them is the reasoning for them — generating it would move it without removing
    any duplication. `properties.css` is the opposite: 481 lines, not one of them a value, every
    block identical but for a name. **The rule: a file that only RESTATES the contract is
    generated; a file that DECIDES something is written.**
  - It caught two live drifts the moment it was turned on: a section heading naming three status
    families after `error` had become the fourth, and four radius `initial-value`s in px kept by
    hand beside their rem originals with nothing to fail if they stopped agreeing (a `@property`
    whose `initial-value` is a `rem` is rejected outright, so those px cannot simply be dropped —
    they are now computed at the 16px root).
  - **A new derived artifact is an emitter in `src/utils/generate-properties.ts` plus one `toMatchFileSnapshot`.**
    It must be an artifact, never a runtime adapter — see the framework-agnostic rule below. And it
    must be added to `files` in `package.json`: only `dist` and `src/styles` are published, so an
    artifact written anywhere else resolves to nothing in an installed package (`npm pack
--dry-run` is how to check, and how this was caught).
  - **`toPixels` THROWS on anything that is not px or rem**, and must keep doing so. An
    `@property` `initial-value` has to be computationally independent, so `em`, `calc()`, `clamp()`
    or a `var()` makes the browser reject the WHOLE rule — silently, losing both the interpolation
    and the type guard. Nothing downstream can see it: Stylelint has no rule and `styles.test.ts`
    only greps for `rem`.
  - **`parseCssVars` (in `@fmmenchi/theme`) is THE parser for `--fm-*` declarations** — the contract
    suite shares it rather than keeping a second one, which it did, anchored on nothing. It strips
    comments before parsing, and everything reading `vars.css` must go through it.
    The declaration regex anchors on the start of a LINE, so a role commented OUT during a retune
    reads as a live declaration — completeness passes, contrast reads the value out of the comment,
    the registration is emitted, and the shipped CSS defines nothing, so the role resolves to the
    registered `initial-value`: black, on every consumer, in both themes. It also throws on a
    duplicate declaration, which is the check the second parser used to make.
  - **`src/utils/generate-properties.ts` is build-time only** and excluded from
    `tsconfig.lib.json`: nothing exports it, so shipping it to consumers is weight with no surface.
- **Single source of values: `src/styles/vars.css`** (`--fm-*`, static oklch literals — Baseline:
  no runtime relative-color). `styles/properties.css` (imported at the top of `vars.css`)
  `@property`-registers the color roles + radius so they are TYPED and INTERPOLATABLE (theme
  crossfade, gradients) — ADR-0012. A COLOUR's `initial-value` is a throwaway placeholder, never the
  real token, so single-source holds; a LENGTH's cannot be (the browser rejects a `rem` there and
  drops the whole rule), so it is COMPUTED from the real value **assuming a 16px root** — which is a
  user preference, not a guarantee. It costs nothing in practice: `:root` plus `inherits: true`
  always cascades the real rem over the initial-value, which is only ever reached when the
  stylesheet is not in effect. Coverage asserted by `styles.test.ts`, agreement with the values by
  `generate-properties.test.ts`. `styles/tailwind.css` is a
  names-only `@theme inline` bridge (no values → no drift). `presets/dark.css` overrides EXACTLY
  every color role **plus the shadow tokens** (elevation is theme-dependent: light's 4-12% black
  shadows vanish on a dark background — enforced by `styles.test.ts`).
- **A theme = a complete assignment of every color role** (`Theme` in `@fmmenchi/theme`).
  Non-color tokens inherit. Brand presets live in apps and must satisfy the same shape — apps
  validate theirs with `validateTheme()` (re-exported here from `@fmmenchi/theme`): completeness +
  parseability + every `CONTRAST_PAIR`. The reference presets pass the same validator.
- **Declared pairs are the usage contract.** A component may put a foreground on a background ONLY
  in a pairing declared in `CONTRAST_PAIRS` (`@fmmenchi/theme`); a component introducing a new
  pairing MUST add it there (all themes re-validate automatically).
- **Changing the contract:** adding a role = update `tokens.types.ts` in **`@fmmenchi/theme`** (the
  `as const` roles, which drive every type) + `vars.css` + `presets/dark.css` + the bridge in
  `tailwind.css` + the re-export in `src/index.ts` if consumers should see it + the group in
  `tokens.types.ts` if the FAMILY is new, then `vitest -u` to re-render
  `properties.css` — `styles.test.ts` fails until the first four agree, `styles.test.ts` until the
  fifth does, and `generate-properties.test.ts` until the derived file does,
  and every declared color pair must pass WCAG AA (4.5:1 text, 3:1 ring/invalid; `-disabled`
  exempt). New values: derive with the ramp methodology (base ± lightness, scaled chroma), ship the
  resolved literal.
- **Values must be sRGB-displayable** (validator kind `out-of-gamut`): out-of-gamut oklch renders
  differently per browser and falsifies contrast math — clamp chroma at constant lightness and
  verify the FORMATTED string (rounding can push a boundary value back out).
- **Contrast policy:** hard gate = WCAG AA + an APCA floor (|Lc| ≥ 45) on text pairs; |Lc| < 60
  (body-text guideline) is logged as advisory, not failed. Dark hover/active are GRADED from the
  fill (+5/+10 lightness pp, chroma ×0.94/×0.88) — never let a state ramp clamp to white.
- **The contract ships in TWO shapes of the same names, and neither is a port.** CSS custom
  properties are the universal surface — every styling library on the web reads `var(--fm-*)`, so
  there is nothing to adapt and nothing to inject. `tokenVars` (`@fmmenchi/theme`, re-exported here) is the same names as
  TypeScript strings, for consumers whose styles are written in TS (styled-components, emotion,
  vanilla-extract, inline `style`): `tokenVars.color.primary === 'var(--fm-color-primary)'`. It adds
  no capability, only the fact that a typo stops compiling instead of rendering nothing — which is
  asserted with `@ts-expect-error`, since every runtime test would still pass if the types were
  relaxed to `Record<string, string>`.
  - **Not `vars`, and not `t`.** `t` is every i18n library's translate function; `vars` is
    vanilla-extract's canonical identifier (`export const vars = createThemeContract(…)`), so it
    would have collided with the one audience the docs name, on their first line.
  - **It is not for React Native**, which has no custom properties: the string is not a colour it
    can use and there is no DOM read to fall back on. And `var()` is invalid in a media or container
    query's feature value — `@media (min-width: ${tokenVars.size.container})` compiles, is dropped
    whole, and never matches. Breakpoints are exported as literals for that.
  - **Never add a per-library adapter here.** A styled-components theme object, a Panda preset
    written by hand — either would make this package import a consumer's styling library, which the
    workspace's "framework-agnostic" rule forbids outright. A generated ARTIFACT (a `.css`, a
    `.json`) is a different thing and is allowed; a runtime dependency is not.
  - **Keys are the token names, kebab and all** — `tokenVars.color['primary-foreground']`,
    `tokenVars['font-weight'].bold`. camelCase would read better and would be a second vocabulary to
    keep in step with the first. Searching one string has to find the CSS, the contract and the
    call site.
  - **References, never values.** There is no `values.color.primary` and there should not be: a
    value read at build time is the BASE theme's, and a preset re-points it at runtime, so the
    export would be right until somebody switched theme. A consumer who genuinely needs the
    resolved value (canvas, a charting library) reads it from the DOM —
    `getComputedStyle(el).getPropertyValue('--fm-color-primary').trim()`. Two traps this package
    makes worse: a colour role is `@property`-registered, so the read NEVER returns `''` — before
    the stylesheet applies it returns the registered `initial-value`, opaque black, with nothing
    falsy to branch on; and a registered role serialises computed while an unregistered token comes
    back as the raw token stream, which Chrome and Safari prefix with a space.
  - **Adding a token family** means adding it to `TOKEN_VARS` _and_ to `tokenVars` (both in
    `@fmmenchi/theme`); `styles.test.ts` compares the two as sets and fails until they agree.
  - **A DTCG export is WANTED and is NOT here yet** — it is what Figma's tooling reads, and the one
    direction this package cannot talk in. A first attempt was written and removed the same day,
    because emitting the token values as-is is not "partial", it is a file that claims a format it
    does not satisfy: DTCG `color` is a hex string or a `{ colorSpace, components }` object, never
    `oklch(41% 0.135 255)`; `number` is a JSON number, and `--fm-leading-*` values are
    `calc(1.25 / 0.875)`; `fontWeight` is a number or a keyword, not `"300"`; a font STACK must be
    an array, and `--fm-font-heading` is `var(--fm-font-sans)`, which DTCG expresses as an alias.
    Doing it properly means converting values, resolving aliases, and validating the output against
    a schema — without that last part nothing can tell whether the file is right, since a snapshot
    only compares the file to itself.
- **No side effects, no fonts**: `vars.css` is variables-only (`:root`); font tokens default to
  system stacks (apps override `--fm-font-*`).
- **`styles/baseline.css` is the one file here with element rules, and it is OPTIONAL.** No
  component depends on it — each normalises itself (`control-base` in `@fmmenchi/ui`) — so never
  move a component's normalisation into it. It is neutral, not a Preflight clone: headings keep
  their size, `<ul>` keeps its markers; what it adds over a normaliser is applying the theme to the
  page (`body` gets `background`/`foreground`, `::selection` gets the selection roles — the only
  consumer those two roles have). It ships inside `@layer fmmenchi.base` so it can never beat the
  components: a layer's own rules win over its sublayers, so
  `fmmenchi.base < fmmenchi < the app's css`, and the consumer orders nothing.
- **The type scale is a PAIR, and the leading half is a ratio.** `--fm-text-<step>` ships with
  `--fm-leading-<step>`, and both are bridged (`--text-<step>` + `--text-<step>--line-height`) —
  the bridge is asserted, because a step whose leading never reaches Tailwind loses it silently.
  The leading is unitless on purpose: an absolute one is inherited as a frozen number, so a
  descendant that changes its font-size keeps the ancestor's line box, and a brand overriding a
  size gets rows that overlap. Never split the pair, and never override one half alone.
- Weight utilities are `font-regular` (not `font-normal`); breakpoints are build-time literals in
  `tailwind.css`, asserted against `BREAKPOINTS` in TS.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

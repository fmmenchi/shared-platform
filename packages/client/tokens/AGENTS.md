# AGENTS.md — @fmmenchi/tokens

The semantic token CONTRACT — the most delicate package of the platform: it defines the allowed
themes. Part of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md).
Scope `client`, type `util`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/tokens
pnpm nx build @fmmenchi/tokens
pnpm nx lint @fmmenchi/tokens
pnpm nx test @fmmenchi/tokens      # contract validation (completeness, bridge, WCAG contrast)
pnpm nx test @fmmenchi/tokens -- -u # regenerate styles/properties.css after changing the contract
```

## Rules

- **Semantics wins over everything.** Components consume ONLY semantic roles (`--fm-color-primary`,
  `--fm-space-inset-m`, …) — never raw values, never a palette. The Tailwind bridge RESETS the
  default palette, so `bg-red-500` fails the build.
- **`styles/properties.css` is GENERATED and must never be edited by hand.** It is rendered by
  `src/generate.ts` from the contract + `vars.css`, and `generate.test.ts` compares it to what is on
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
  - **A new derived artifact is an emitter in `src/generate.ts` plus one `toMatchFileSnapshot`.**
    It must be an artifact, never a runtime adapter — see the framework-agnostic rule below. And it
    must be added to `files` in `package.json`: only `dist` and `src/styles` are published, so an
    artifact written anywhere else resolves to nothing in an installed package (`npm pack
--dry-run` is how to check, and how this was caught).
  - **`toIndependentLength` THROWS on anything that is not px or rem**, and must keep doing so. An
    `@property` `initial-value` has to be computationally independent, so `em`, `calc()`, `clamp()`
    or a `var()` makes the browser reject the WHOLE rule — silently, losing both the interpolation
    and the type guard. Nothing downstream can see it: Stylelint has no rule and `tokens.test.ts`
    only greps for `rem`.
  - **`readVars` is THE parser for `--fm-*` declarations** — the contract suite shares it rather
    than keeping a second one, which it did, anchored on nothing. It strips comments before parsing,
    and everything reading `vars.css` must go through it.
    The declaration regex anchors on the start of a LINE, so a role commented OUT during a retune
    reads as a live declaration — completeness passes, contrast reads the value out of the comment,
    the registration is emitted, and the shipped CSS defines nothing, so the role resolves to the
    registered `initial-value`: black, on every consumer, in both themes. It also throws on a
    duplicate declaration, which is the check the second parser used to make.
  - **`src/generate.ts` and `src/registry.ts` are build-time only** and excluded from
    `tsconfig.lib.json`: nothing exports them, so shipping them to consumers is weight with no
    surface.
- **Single source of values: `src/styles/vars.css`** (`--fm-*`, static oklch literals — Baseline:
  no runtime relative-color). `styles/properties.css` (imported at the top of `vars.css`)
  `@property`-registers the color roles + radius so they are TYPED and INTERPOLATABLE (theme
  crossfade, gradients) — ADR-0012. A COLOUR's `initial-value` is a throwaway placeholder, never the
  real token, so single-source holds; a LENGTH's cannot be (the browser rejects a `rem` there and
  drops the whole rule), so it is COMPUTED from the real value **assuming a 16px root** — which is a
  user preference, not a guarantee. It costs nothing in practice: `:root` plus `inherits: true`
  always cascades the real rem over the initial-value, which is only ever reached when the
  stylesheet is not in effect. Coverage asserted by `tokens.test.ts`, agreement with the values by
  `generate.test.ts`. `styles/tailwind.css` is a
  names-only `@theme inline` bridge (no values → no drift). `presets/dark.css` overrides EXACTLY
  every color role **plus the shadow tokens** (elevation is theme-dependent: light's 4-12% black
  shadows vanish on a dark background — enforced by `tokens.test.ts`).
- **A theme = a complete assignment of every color role** (`ThemeColors` in `src/tokens.types.ts`).
  Non-color tokens inherit. Brand presets live in apps and must satisfy the same shape — apps
  validate theirs with the PUBLIC `validateTheme()` (`@fmmenchi/tokens/validate`): completeness +
  parseability + every `CONTRAST_PAIR`. The reference presets pass the same validator.
- **Declared pairs are the usage contract.** A component may put a foreground on a background ONLY
  in a pairing declared in `CONTRAST_PAIRS` (`src/validate.ts`); a component introducing a new
  pairing MUST add it there (all themes re-validate automatically).
- **Changing the contract:** adding a role = update `src/tokens.ts` (the `as const` roles, which
  drive the `src/tokens.types.ts` types) + `vars.css` + `presets/dark.css` + the bridge in
  `tailwind.css` + the group in `src/refs.ts` if the FAMILY is new, then `vitest -u` to re-render
  `properties.css` — `tokens.test.ts` fails until the first four agree, `refs.test.ts` until the
  fifth does, and `generate.test.ts` until the derived file does,
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
  there is nothing to adapt and nothing to inject. `tokenVars` (`src/refs.ts`) is the same names as
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
  - **Adding a token family** means adding it to `TOKEN_VARS` _and_ to `tokenVars`; `refs.test.ts`
    compares the two as sets and fails until they agree.
  - **The DTCG export is `src/dtcg/base.json` + `dtcg/dark.json`** (subpaths
    `@fmmenchi/tokens/dtcg/*.json`), generated by `src/dtcg.ts` from the contract + `readVars` and
    committed like `properties.css`. It exists for the consumers `var(--fm-*)` cannot reach — Figma
    (Tokens Studio), Style Dictionary, anything that wants values rather than references. A first
    attempt was removed the same day for emitting values as-is; the bar it set is met, not argued
    down: `color` is the draft `{ colorSpace, components, hex }` object (culori converts, oklch
    fidelity kept, hex fallback for sRGB-only readers), `leading` calcs are evaluated to numbers,
    `fontWeight` is a number, a font stack is an array, `var(--fm-font-sans)` is the alias
    `{font.sans}`. `dtcg.test.ts` VALIDATES the committed files construct-by-construct (the group
    publishes prose, not a schema) including a hex↔oklch round-trip through a separate culori path —
    the file no longer only agrees with itself. `dark.json` carries only what the preset overrides;
    sets stack. `shadow`/`ease`/`transition` stay out until a consumer can read a parse of them —
    ours include a `linear()` ease no DTCG object carries.
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

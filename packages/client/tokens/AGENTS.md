# AGENTS.md — @fmmenchi/tokens

The semantic token CONTRACT — the most delicate package of the platform: it defines the allowed
themes. Part of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md).
Scope `client`, type `util`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/tokens
pnpm nx build @fmmenchi/tokens
pnpm nx lint @fmmenchi/tokens
pnpm nx test @fmmenchi/tokens   # contract validation (completeness, bridge, WCAG contrast)
```

## Rules

- **Semantics wins over everything.** Components consume ONLY semantic roles (`--fm-color-primary`,
  `--fm-space-inset-m`, …) — never raw values, never a palette. The Tailwind bridge RESETS the
  default palette, so `bg-red-500` fails the build.
- **Single source of values: `src/styles/vars.css`** (`--fm-*`, static oklch literals — Baseline:
  no runtime relative-color). `styles/properties.css` (imported at the top of `vars.css`)
  `@property`-registers the color roles + radius so they are TYPED and INTERPOLATABLE (theme
  crossfade, gradients) — ADR-0012; the `initial-value` is a throwaway placeholder, never the real
  token, so single-source holds (coverage asserted by `tokens.test.ts`). `styles/tailwind.css` is a
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
  `tailwind.css` — `tokens.test.ts` fails until all four agree,
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
  there is nothing to adapt and nothing to inject. `vars` (`src/refs.ts`) is the same names as
  TypeScript strings, for consumers whose styles are written in TS (styled-components, emotion,
  vanilla-extract, inline `style`): `vars.color.primary === 'var(--fm-color-primary)'`. It adds no
  capability, only the fact that a typo stops compiling instead of rendering nothing.
  - **Never add a per-library adapter here.** A styled-components theme object, a Panda preset
    written by hand — either would make this package import a consumer's styling library, which the
    workspace's "framework-agnostic" rule forbids outright. A generated ARTIFACT (a `.css`, a
    `.json`) is a different thing and is allowed; a runtime dependency is not.
  - **Keys are the token names, kebab and all** — `vars.color['primary-foreground']`,
    `vars['font-weight'].bold`. camelCase would read better and would be a second vocabulary to
    keep in step with the first. Searching one string has to find the CSS, the contract and the
    call site.
  - **References, never values.** There is no `values.color.primary` and there should not be: a
    value read at build time is the BASE theme's, and a preset re-points it at runtime, so the
    export would be right until somebody switched theme. A consumer who genuinely needs the
    resolved value (canvas, a charting library) reads it from the DOM —
    `getComputedStyle(el).getPropertyValue('--fm-color-primary')`.
  - **Adding a token family** means adding it to `TOKEN_VARS` _and_ to `vars`; `refs.test.ts`
    compares the two as sets and fails until they agree.
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

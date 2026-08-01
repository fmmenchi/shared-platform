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
- **No text/leading scale yet — deliberately.** Utilities use Tailwind's default sizes until a
  Text/Heading component settles the size+leading pairing; never re-add an unbridged `--fm-text-*`
  scale (a token nothing consumes silently diverges from the utilities — the phantom-contract trap).
  Introduce the scale WITH that component, bridged in the same change.
- Weight utilities are `font-regular` (not `font-normal`); breakpoints are build-time literals in
  `tailwind.css`, asserted against `BREAKPOINTS` in TS.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

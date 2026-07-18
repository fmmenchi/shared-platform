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
  no runtime relative-color, no `@property`). `styles/tailwind.css` is a names-only `@theme inline`
  bridge (no values → no drift). `presets/dark.css` overrides EXACTLY every color role.
- **A theme = a complete assignment of every color role** (`ThemeColors` in `src/index.ts`).
  Non-color tokens inherit. Brand presets live in apps and must satisfy the same shape — apps
  validate theirs with the PUBLIC `validateTheme()` (`@fmmenchi/tokens/validate`): completeness +
  parseability + every `CONTRAST_PAIR`. The reference presets pass the same validator.
- **Declared pairs are the usage contract.** A component may put a foreground on a background ONLY
  in a pairing declared in `CONTRAST_PAIRS` (`src/validate.ts`); a component introducing a new
  pairing MUST add it there (all themes re-validate automatically).
- **Changing the contract:** adding a role = update `src/index.ts` (types) + `vars.css` +
  `presets/dark.css` + the bridge in `tailwind.css` — `tokens.test.ts` fails until all four agree,
  and every declared color pair must pass WCAG AA (4.5:1 text, 3:1 ring/invalid; `-disabled`
  exempt). New values: derive with the andes-routes ramp methodology, ship the resolved literal.
- **Values must be sRGB-displayable** (validator kind `out-of-gamut`): out-of-gamut oklch renders
  differently per browser and falsifies contrast math — clamp chroma at constant lightness and
  verify the FORMATTED string (rounding can push a boundary value back out).
- **Contrast policy:** hard gate = WCAG AA + an APCA floor (|Lc| ≥ 45) on text pairs; |Lc| < 60
  (body-text guideline) is logged as advisory, not failed. Dark hover/active are GRADED from the
  fill (+5/+10 lightness pp, chroma ×0.94/×0.88) — never let a state ramp clamp to white.
- **No side effects, no fonts**: `vars.css` is variables-only (`:root`); font tokens default to
  system stacks (apps override `--fm-font-*`).
- Weight utilities are `font-regular` (not `font-normal`); breakpoints are build-time literals in
  `tailwind.css`, asserted against `BREAKPOINTS` in TS.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

# AGENTS.md — @fmmenchi/theme-builder

The wizard that turns seven brand colours into a theme file the Nx generator installs. Part of
`shared-platform`; workspace contract in [../../AGENTS.md](../../AGENTS.md). Scope `app`, type `app`.

**It is not published and it is not a product.** `apps/` is excluded from `nx release`, and nothing
depends on it — the module-boundary rule is one-directional on purpose. It exists so that "our theme"
and "a consumer's theme" cannot differ in kind: both come out of `generatePalette` + `generateTheme`,
with different bases.

## Commands

```bash
pnpm nx dev @fmmenchi/theme-builder        # React Router dev server (port 4201)
pnpm nx typecheck @fmmenchi/theme-builder
pnpm nx lint @fmmenchi/theme-builder
pnpm nx test @fmmenchi/theme-builder       # node vitest — no browser mode here
pnpm nx build @fmmenchi/theme-builder
```

## The four steps, and what each owns

| step                         | owns                                                                   |
| :--------------------------- | :--------------------------------------------------------------------- |
| 1 `routes/steps/colours.tsx` | the seven bases, as one form validated as a SET                        |
| 2 `routes/steps/palette.tsx` | the ramp's two ends, and the palette they produce                      |
| 3 `routes/steps/roles.tsx`   | every role re-pointable, with the measured ratio of each declared pair |
| 4 `routes/steps/review.tsx`  | the validator's verdict, and the download                              |

State lives in providers wired in `root.tsx`: `bases.tsx`, `ramp.tsx`, `role-overrides.tsx`,
`draft-theme.tsx`. Each throws outside its provider — "no value" and "not wired" must not look alike.

## Rules

- **THE APP HOLDS NO CONTRACT AND NO RULES.** `@fmmenchi/theme` owns what a theme is and whether one
  is allowed; `@fmmenchi/tokens` owns the values. This app reads both and decides nothing about
  colour. A check written here would be a second opinion nobody asked for, and the wizard would then
  be able to promise a theme CI refuses.
- **The alias map is READ, never written.** `declarations.server.ts` resolves
  `@fmmenchi/tokens/styles/vars.css` through `createRequire` and sends the declarations as loader
  data. Where each role points is the design system's decision and already lives in that file; a
  table of it here would be one decision in two places, obliged to agree forever.
  - Two JSON artefacts (`placements.json`, `rungs.json`) were added to `@fmmenchi/tokens` to feed
    this app and removed the same day. They were a round trip: contract in TypeScript, transcribed
    to CSS, parsed back out, serialised to JSON, loaded back into TypeScript. **A file that exists
    so something can read back what was known one step earlier is not an artefact.**
- **`REFERENCE_RAMP` (in `ramp.tsx`) IS THE RAMP `vars.css` USES**, and `ramp.spec.ts` asserts it:
  every rung it produces from the reference bases equals the rung the shipped stylesheet resolves
  to. Break that and the claim "ours is an invocation of the same code path as a consumer's" goes
  back to being a direction rather than a fact.
  - It stays here rather than moving to `@fmmenchi/theme`, which was tried and reverted: these are
    numbers a designer chose, and that package holds no values of any kind.
- **What step 2 exposes is decided by which numbers carry the guarantee, not by taste.** The two
  ends are offered; the chroma factors and the rung count are not — see the table in `ramp.tsx`.
  Every offered option is PROBED (`ramp-probe.ts`) by building the theme it would produce and
  running the real `validateTheme`, so the control cannot hand a person a theme that fails on step
  four. `probeShape` never throws: `generateTheme` throws on a hole, which is right for a build step
  and wrong for a probe.
- **Step 3's overrides ARE declarations.** `useThemedDeclarations()` merges them into the map, so
  every later step sees what the person actually has. Anything downstream that reads
  `useDeclarations()` instead is quietly ignoring step three.
- **The export writes DECLARATIONS AT EVERY LAYER, not the 84 finished colours.** Bases, then rungs
  as relative colour off their base, then roles as `var(--fm-palette-…)`. A file carrying only the
  resolved roles is a photograph: same pixels, nothing left to recompute. The rung layer was
  literals once, and that made a wizard-built theme WORSE than the design system's own — change a
  base and nothing moved.
- **There is no CSS emitter here.** The generator's job is to generate the theme; this app's job
  ends at the file it is handed. A second renderer for the same bytes would be two renderings of one
  decision, and the theme a person downloaded could then differ from the theme installed in their
  repo.
- **Every `var(--fm-*)` this app writes must be a token the contract declares** —
  `tests/tokens-exist.spec.ts` reads the installed `vars.css` and fails otherwise. It exists because
  the scales do not agree on their own suffixes: type is `xs · sm · base · lg · xl`, spacing is
  `s · m · l`, so `--fm-space-inline-s` is right and `--fm-text-s` is nothing, one letter apart.
  Three invented tokens in one afternoon is what bought this test.
- **Inline `style` is used here and that is deliberate.** This app is not a design-system consumer
  demo; it paints GENERATED colours, which no token can name because they did not exist when the
  stylesheet was written. Everything that is NOT a generated colour still goes through
  `var(--fm-*)`.
- **The 144-brand grid lives in `tests/grid.ts`**, shared by `ramp.spec.ts` and
  `ramp-shape.spec.ts`. A second copy would be a second definition of "harsh", free to drift, and a
  claim proved on one would be quoted about the other.

## Known gaps

- **DARK IS NOT IN THE WIZARD.** It reads `vars.css` only, never `presets/dark.css`, so it builds
  ONE theme. Step 4's `--scheme` is handed to the generator, which emits it as the `color-scheme`
  line and nothing else — so choosing `dark` produces light-derived colours labelled dark, and
  native controls go dark on a light theme. A dark theme is not a second ramp on the same bases: the
  dark preset states its own bases at lightness 0.75 and its own 17-rung scale stepping 0.05 where
  light steps 0.08, and its `-subtle` points at a DARK rung (the 1400) where light's points at a pale
  one (the 50).
- **The 25 has no role pointing at it.** The 50 does — the eight chromatic `-subtle` roles — so the
  pale end of step 2 is no longer entirely free: dropping to `paleRungs: 0` makes those roles name a
  rung that does not exist, and `probeShape` reports that as an unavailable option rather than
  letting it through. The 25 remains headroom.
- **`secondary-50` and `neutral-50` render alike.** A shared chroma fraction of a deliberately
  muted grey-blue base is a grey; measured, `secondary-50` lands exactly on `neutral-50`'s chroma
  (`accent-50` is only 1.4x it). So `secondary-subtle` and `neutral-subtle` are the same colour to
  the eye. Forcing them apart would push `negative-50` out of sRGB.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

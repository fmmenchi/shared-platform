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

| step                               | owns                                                                       |
| :--------------------------------- | :------------------------------------------------------------------------- |
| 1 `routes/steps/brand-colours.tsx` | the fourteen bases — light and dark, a tab each — light validated as a SET |
| 2 `routes/steps/palette.tsx`       | the ramp's ends and the palette they produce, per theme                    |
| 3 `routes/steps/roles.tsx`         | every role re-pointable, per theme, with each declared pair measured       |
| 4 `routes/steps/review.tsx`        | the validator's verdict, and the download                                  |

State lives in providers wired in `root.tsx`: `bases.tsx`, `ramp.tsx`, `role-overrides.tsx`. Each
throws outside its provider — "no value" and "not wired" must not look alike. `theme-scope.tsx`
applies a resolved theme to a subtree and holds no state (it replaced `draft-theme.tsx`, which held
the draft as a CSS string nothing ever wrote).

**EVERY LINK IN THIS APP MUST BE THE ROUTER'S.** The state above is in memory, so one full document
load is the whole wizard gone. The sidebar in `root.tsx` was `<NavLink href>` on the design system's
component and therefore plain anchors: measured, every click reloaded, a brand colour set to
`#aa3311` came back `#3072c1`, and the theme exported afterwards was the design system's own. The
design system was not wrong to render an anchor — it reads the router off `UiProvider`, and that
sidebar renders in `Layout`, ABOVE the route tree, so the port can never be in scope there. Hence
`asChild` with React Router's own `Link` per call, and `current` stays the app's.

**THE CHROME SAYS WHAT IT DOES.** The sidebar holds the four STEPS and nothing else; the header
holds the MODE — `Building` / `Preview` — as two links marked with `current`. The preview was a fifth
sidebar item under a hairline rule, the same shape as the steps, while a `Badge` in the header
reported which mode you were in without being able to change it: one concept in two places, and the
preview reading as a step it is not (nothing is decided there, and it is reachable at any time).

- **Links, NOT a `SegmentedControl`**, which is what a mode switch looks like and the wrong component:
  that is a radio group (ADR-0025) and the design system draws the line itself — "a tab list navigates
  the page, a radio group answers a question". `Tabs` is out for the other half of the same sentence.
- **`/preview?from=<slug>` is how "Building" gets you back to the step you left.** In state it was
  worse twice: `setState` in an effect is the cascading-render anti-pattern the lint rule refuses, and
  a memory here dies on a reload or a shared `/preview` link. The param is validated against `STEPS`,
  so `?from=whatever` lands on step one rather than throwing.

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

## Both themes

The wizard builds **two** themes and exports two files. That is only possible because the dark
preset's seven bases stopped being hand-picked: `deriveDarkBases` in `@fmmenchi/theme` computes them
from the light seven, and `@fmmenchi/tokens`' `palette-dark.test.ts` asserts the shipped preset IS
what it produces. Before that they followed no rule at all — measured, neither a fraction of the
gamut ceiling at L 0.75 (3.16x spread) nor a fraction of the light chroma (2.02x) — so there was
nothing to compute a brand's dark colours from.

- **The dark bases are EDITABLE**, on step 1 in their own tab, and until somebody edits one they
  **FOLLOW the light seven** — `setBases` re-derives them, `darkFollowsLight` says whether it still
  will, and the panel states which of the two it is. "Never automatic" was the rule here first, and
  the export is where it was caught: change the light primary to `#1f5fa8` and the dark file still
  carried the derivation of the REFERENCE blue, chroma 0.1007 where the brand's is 0.1107 — half the
  handoff was the design system's colours, silently. Following costs nothing while the dark seven are
  still the derivation, which is exactly when there is no work to lose; the first hand edit stops it
  for good, which is the whole of what the old rule protected. `deriveFromLight()` is how a person
  goes back to following, and it is disabled while they already do. `tests/bases-store.spec.tsx`
  holds both halves — verified by mutation: dropping the follow fails three of its tests, dropping
  the stop fails two.
- **`DARK_REFERENCE_RAMP` is stated whole**, not offered as a `RampShape`. Its two ends have no role
  pointing at them, so a control over them would probe two matrices to move nothing.
- **Step three's overrides are PER SCHEME**, one map each, and a light one is never carried into
  dark: the two themes point their roles at different rungs — `-subtle` at the 1400 in dark where
  light's is at the 50 — so the same choice would mean a different colour. Step 4 validates BOTH and
  labels which scheme each violation is from.
- **`tests/dark.spec.ts` holds the claim**: the app's default dark bases are the shipped ones, the
  dark ramp reproduces every one of the seventeen shipped rungs, and the theme validates.
- **Step 4's `--scheme` field is gone.** It was a false choice — the generator emits `--scheme` as
  the `color-scheme` line and nothing else, so picking `dark` shipped light colours with dark native
  controls. There is nothing to choose now: each file's scheme is a fact about which file it is.

## Known gaps

- **A role's rung menu offers EVERY family, not just the role's own.** Deliberate: a role
  legitimately points outside its family — every `-foreground` is `neutral-0`, and `background`,
  `border` and `muted` are neutral too — so filtering to one family would make the commonest case
  impossible. It is also not derivable from the name: `--fm-color-error` and `--fm-color-destructive`
  both point into `negative`, so a filter would need a role→family table, a second home for a
  relation `vars.css` already states. The plausible family IS readable from the declaration a role
  starts on, so ORDERING the menu by it (own family, then neutral, then the rest) would answer the
  complaint without forbidding a deliberate cross-family choice. Not done yet.
- **The 25 (light) and the 1500 (dark) have no role pointing at them.** Deliberate headroom, and
  what makes the pale end of step 2 nearly free: the only thing `paleRungs: 0` breaks is the eight
  chromatic `-subtle` roles that now name the 50, which `probeShape` reports as an unavailable
  option rather than letting through.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

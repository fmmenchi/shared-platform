# design-sync notes — @fmmenchi/ui → claude.ai/design

Everything here was measured on the first sync. Read it before touching config.

## [GENERAL] The export needs its own build: `nx build-design`

The React Compiler emits `import { c } from 'react/compiler-runtime'`. React 19 ships that module
as **CommonJS**, and it does `require("react")` internally. Real bundlers resolve that against the
app's React — which is why the PUBLISHED build keeps the compiler and is correct. The preview
harness serves React as a global `<script>`, so there is no module `require`, and esbuild's
`__require` fallback is captured in the bundle prologue before any module body runs — nothing
loaded later can supply one (tried: an `extraEntries` shim runs too late, by construction).

Measured: with the compiler, **0 of 55** previews mount; without it, **55 of 55** render clean.

So `vite.config.mts` gained `FM_DESIGN_EXPORT=1` → skip the compiler, emit to `dist-design/`, and
`cfg.entry`/`cfg.buildCmd` point there. Same sources, same CSS, same types, same API; only the
memoization transform differs, and that changes no markup. **Do not "fix" this by disabling the
compiler in the published build** — its comment documents two real incidents.

## [GENERAL] `resync.mjs` does NOT run the repo's build — you do, and Nx will cache a stale one

The driver's `build` stage is the CONVERTER, not `cfg.buildCmd`. Its own header says the agent runs
"the repo's own build when source may have changed", and it is easy to read the green `build` stage
as covering that. It does not.

Cost the 2026-08-31 sync one full cycle: the driver ran clean against a `dist-design/` that predated
the new component, the diff correctly listed `Stepper` as added (it reads STORIES), and validate then
failed the only way it could — `[BUNDLE_EXPORT] 1/56 not a component on window.FmmenchiUI: Stepper`
plus `[RENDER] root empty`. The symptom points at the component; the cause is an unbuilt artifact.

**So: `pnpm nx build-design @fmmenchi/ui --skip-nx-cache` before every driver run**, and mind the
flag — `build-design` declares `cache: true` with no `inputs`, and a plain run served the previous
sync's output from the Nx cache even though the sources had changed. `.design-sync/rebuild.sh` runs
the build before the converter and is the safe habit for a manual cycle; the driver path needs the
build run by hand.

## [GENERAL] `react/compiler-runtime` must be external in the LIBRARY build

Separate from the above, and a real defect in the shipped package: it was missing from
`rolldownOptions.external`, so React's CJS compiler runtime was **inlined into `dist/`** behind
rolldown's `require` interop. Any strict browser-ESM consumer would break. Fixed in
`vite.config.mts`; keep it.

## [GENERAL] Tokens ship from `src/styles`, not `dist`

`@fmmenchi/tokens` publishes its CSS from `src/styles/*` (see its `exports`), so the converter's
default `dist/css | css | dist | .` probe found **0 files** and every design would have rendered
with unresolved `var(--fm-*)`. `cfg.tokensGlob: "src/styles/**/*.css"` takes the whole public
contract — 6 files, and validate now reports **476 tokens defined / 261 referenced**.
`presets/dark.css` is scoped under `[data-theme='dark']`, so importing it adds dark mode without
forcing it.

## [GENERAL] `cfg.provider` is required — decorators cannot be bundled

`.storybook/preview.tsx` uses Storybook 9's `definePreview` factory API; the converter's stubs
don't cover it, and every preview logged `definePreview is not a function`. The decorator's only
runtime contribution is the i18n provider, so it is declared explicitly:
`{"component": "UiProvider", "props": {"adapters": {"i18n": {"locale": "en"}}}}`. The rest of the
decorator (`data-theme` on `<html>`, body colours) is framing — light is already the `:root`
default.

## [GENERAL] `storyImports.shim` — otherwise previews recompile the DS from source

The single most damaging default. Stories import components by RELATIVE source path
(`./button.component.js`), and without a shim esbuild compiles that source into the preview. Two
failures follow, both silent:

1. **Everything unstyled.** The recompiled source gets esbuild's own CSS-module names
   (`button_button`), while the shipped stylesheet has the real hashed ones (`_button_gdl2j_2`).
   Measured in the DOM: `hashedInDom: 0`, background = the browser default. The compare sheet is
   what caught it — the render check called all 55 "clean" while every one was naked.
2. **A duplicate React context.** Story wrappers import `UiProvider` from `../../i18n/provider.js`;
   bundled from source it is a DIFFERENT provider than the one the shimmed components read, so all
   11 form adapters died with `no form binding in scope`.

Current value: `[".component.", "/src/i18n/provider", "/components/table/use-"]`. Every pattern
points at a PUBLIC export — that is the rule. A blanket `/src/components/` was tried and broke 11
components: it also shims non-exported internals, which then resolve to `undefined`.

## Curation

- `titleMap`: `Toast → ToastRegion` (the export is the region); `Colors` and
  `Rebrandinsevennumbers` are Foundations DOC pages, excluded with `null`.
- `cardMode: "column"` on Button, Calendar, Pagination, Tooltip — validate measured their stories
  wider than a grid cell, so the product card would crop them.

## [GENERAL] The reference renders body text in UA serif — the PREVIEW is the correct side

Found independently by three grading waves, so it is on EVERY sheet in this DS. Storybook's
`.storybook/preview.tsx` imports `vars.css` + `presets/dark.css` and never `baseline.css` — and
`baseline.css` is the file carrying `body { font-family: var(--fm-font-sans) }`. The exported
`styles.css` DOES import it, so the preview shows what a consumer gets and the reference is the
under-styled side. Graded `match` per §4's "when the REFERENCE side is the artifact" rule.

Causal proof, not inference: in FormErrorSummary a DS-styled control's text matches byte-for-byte
across both panels while every _inherited_ run of text diverges — exactly what a missing
`body{font-family}` predicts.

**Corrected on a later wave:** an earlier version of this note generalised that to "a UA button does
not inherit the body font". That holds for a DS-STYLED control, which carries its own font rules,
but NOT for a story's own bare native one — `baseline.css` also carries
`button, input, optgroup, select, textarea { font: inherit }` in the same layer. Measured on
Combobox `In A Form` (a plain `<button type="submit">`): the button face is **19px tall in the
reference vs 22px in the preview**, because the preview inherits 16px `system-ui` while storybook
keeps the UA's 13.33px. Same single cause; the preview is still the shipping-correct side. A second-order effect follows from
the same cause: labels read bolder on the preview side because `font-weight: 500` has no medium cut
in Times but does in `system-ui`. **That is not a weight bug — do not chase it.**

**Not a `[FONT_MISSING]` case.** `--fm-font-sans` is `ui-sans-serif, system-ui, sans-serif` — a pure
system stack, no webfont to ship. Both sides HAVE the font; only the reference fails to apply it. So
the compare oracle's font blind spot (both sides falling back identically) does not apply here.

**It is not only the font — it is also `box-sizing`, and that moves GEOMETRY.** `baseline.css`
carries `*,::before,::after { box-sizing: border-box }` in `@layer fmmenchi.base` alongside
`body{font-family}`, so the reference canvas runs on the UA's `content-box`. Measured on Card at
full res: the story sets `maxWidth: '22rem'` and the card's outer width is **402px in storybook vs
352px in the preview** — exactly `2 × 24px` inset `+ 2 × 1px` border, i.e. `max-width` landing on
the content box on one side and the border box on the other. Interior proportions are correct on
both, so it is a whole-component scale offset, and the preview is again the shipping-correct side.

A third consequence, subtler: **any box derived from font metrics changes size too.** `Skeleton
shape="text"` is sized in `1lh`, so the 4-bar `Paragraph` stack measures ~72px in the reference and
~75px in the preview — ~1px per line box. Read without knowing the cause, that is a spacing bug.
The same applies to anything using `1lh`, `1em`, `ch` or `ex`.

**And it is not always ~1px — do not let the Skeleton example set your expectation.** Table
`Declared Widths` sizes columns in `10ch` / `6ch`, and a `ch` resolves against the element's own
font: Times `0` is 8.0px against system-ui's ~8.8px, which moves the column boundaries **~42px**
while total table height stays identical (163px on both — that equality is the tell). At that size
it reads as a layout bug to anyone who does not know the cause.

**DONE — applied on the 2026-08-31 re-sync, and it must be RE-APPLIED every sync.** The whole of
`packages/client/tokens/src/styles/baseline.css` is now injected into
`.design-sync/sb-reference/iframe.html` as a `<style id="design-sync-baseline">` before `</head>`.
The full file rather than the three rules the earlier plan named: the three were the ones the
campaign had _measured_, but the file is what a consumer actually loads, and the Stepper's
`WithLinksBack` story proved the shortlist incomplete — a bare `<a>` takes its colour from
`baseline.css`'s `a { color: var(--fm-color-link) }`, so with only the three rules the reference
would have painted UA blue against the preview's themed link and the story would have graded
`mismatch` for a reason that is not a defect.

Injecting more than planned was safe _because_ the campaign was over: the 55 already-graded
components are carried forward, not re-graded, so there is no seam inside one roster — and the
driver noticed the reference had moved and auto-ordered a `[SPOT_CHECK]` of five carried
components (AppLayout, Avatar, Calendar, Card, ChoiceField). All five still matched their recorded
grades, and **Card's 402px-vs-352px geometry gap closed**: the same widths on both panels now.
That is the measured proof the injection does what this section says it would.

`sb-reference/` is GITIGNORED and rebuilt from scratch by `build-reference.sh`, so the injection
does not survive — **re-inject right after every reference build, before any grading**. The script
is idempotent: it no-ops when the `design-sync-baseline` id is already present. A sync that forgets
it does not fail; it just silently grades against the under-styled oracle again, which is how this
whole section came to exist.

Do NOT "fix" it by importing `baseline.css` into `.storybook/preview.tsx`: ADR-0022 deliberately
starts that canvas at "token values, our component CSS, and whatever the browser does". And never
compensate per-component by pinning widths — that bakes the under-styled side's metrics into the
shipping artifact.

**Also framing, same family:** the preview harness hardcodes an UNLAYERED
`body{margin:0;padding:24px;background:#fff}` (`.ds-sync/lib/emit.mjs`), which beats
`baseline.css`'s layered `body{background-color: var(--fm-color-background)}`. Storybook's decorator
sets that token inline instead, so every reference panel carries a faint grey field
(`oklch(98.5% 0.004 256)`). On `layout: 'fullscreen'` stories the wide content-bbox crop makes that
tint read as a component surface — it is not.

## [GENERAL] The reference storybook has the `:dir()` → `:lang()` minifier regression

Slider / Switch RTL stories render with LTR geometry in storybook and CORRECTLY in the preview.
Measured: `.design-sync/sb-reference/assets/slider-*.css` has `:dir(` = 0 and `:lang(` = 76, while
`ds-bundle/_ds_bundle.css` has `:dir(` = 6 and `:lang(` = 0. The shipped bundle is intact; the
oracle is degraded.

This is the regression `vite.config.mts` already pins (`build.cssTarget` + the
`assertNoLanguageSniffPlugin` guard) — but `.storybook/main.ts` has no `viteFinal` raising
`cssTarget`, so the storybook build never received the fix, and its guard is scoped to the library
artifact by design. Stories set `dir="rtl"` with no `lang`, so the downleveled selector never
matches.

**Worth fixing in the repo on its own merits**, independently of this sync: Storybook is where the
team LOOKS at these components, and RTL has been wrong there. Affects every component with a
`:dir()` rule in the bundle: input/char-count, select, slider, switch — all already graded `match`
on the component render, with the diagnosis in their `grade.json` notes.

## Confirmed NOT a risk

- **Story-local providers ARE applied on the preview side.** FormChoice resolves its bound error and
  the date pickers render in Italian on both panels even though `cfg.provider` declares
  `i18n.locale: "en"` — the story's own `<UiProvider>` correctly wins. Italian copy in those cells
  is not a locale leak.
- **`mm/dd/yyyy` vs `gg/mm/aaaa`** across DateInput and DatePicker is DS-authored placeholder copy
  vs a native `<input type="date">` following the BROWSER locale. Both panels share the browser, so
  it cannot diverge.

## Grading traps — read before judging any sheet

These produced, or nearly produced, false verdicts. All measured.

1. **The two shots are framed differently, by a CONSTANT offset.** The reference shot is cropped to
   its content bbox (e.g. 868×N); the preview shot is the full page (900×700) with ~24px padding.
   Judged off the sheet, the preview looks "indented and lower" — that alone would have produced
   four false `close` grades in one batch. Subtract the constant offset, then compare bands: a real
   layout defect never yields the SAME offset on every band.
2. **The downscaler lifts light greys to near-white on the narrower reference panel.** A "white vs
   grey" field fill (Toolbar `With A Field`, SegmentedControl's disabled segment) was the same grey
   at full res. Confirmed twice, independently.
3. **`flex-wrap` stories break at a different index on the two panels** (Calendar `Across Locales`:
   3 per row in storybook, 2 in the preview) — narrower preview content box plus the reference's
   serif metrics. Grade the individual instances, never the wrap index. **Do NOT pin a width in an
   owned preview to force the reference's wrap point** — that bakes the under-styled side's metrics
   into the shipping artifact.
4. **Heading is NOT affected by the serif/sans delta** — it sets `--fm-font-heading` explicitly
   instead of inheriting the body font. Proven by identical advance widths on both panels (271px on
   `Default`; 104/92/74/63/57/52 across `Levels`). So a typography defect there would still be
   visible; it is not masked.

## AppLayout: the card shows the MOBILE form, and no warning can see it

`app-layout.module.css` swaps the whole layout on a **container query** (`@container` + the declared
48rem), not a media query. The product card grid is `repeat(auto-fit, minmax(320px,1fr))` with
`.ds-cell{overflow:hidden}`, so cells land at ~320–400px — below the swap point — and the card
paints the mobile drawer form while the grades cover the desktop shell.

`cardMode: "column"` is applied (full card width per story). It does not by itself cross 48rem, so
the card may still render the mobile form: **this is honest responsive behaviour, not a defect**,
and the desktop shell is what was graded. If a future sync wants the desktop form in the card, the
lever is `cardMode: "single"` + an explicit `viewport` — which IS a capture-viewport change and so
re-grades that component.

Worth knowing on its own: `[GRID_OVERFLOW]` **cannot see a container-query swap**. AppLayout's
stories are fluid, so validate emits no geometry warning at all. Only reading the CSS finds it.

## Overlays: every story renders CLOSED

Menu, Menubar, Popover, Tooltip and Dialog all render their surface closed on both panels — no
`defaultOpen`, no play function. What compare grades for an overlay in this DS is the TRIGGER.
Consequence: **no `cardMode: "single"` is warranted anywhere**, because no cell can paint over a
sibling in the product grid card. Do not add one speculatively.

## `:dir()` → `:lang()` affected components (reference-side only)

input/char-count, select, slider, switch, **segmented-control**. The corner-radius tell on
SegmentedControl is only visible at ~4x — at sheet scale both panels look identical because the
option ORDER is correct on both sides. Tooltip's RTL story is NOT in this list: it drives native
flex direction on a plain `div`, not a `:dir()` rule, so it is a true match.

## Components with no visual signature — do not hunt for one

`Table` `Busy` is pixel-identical to `Default` within each panel (measured, AE = 0 on both sides).
That is correct: `busy` only writes `aria-busy` (`table.component.tsx`), and the CSS has no busy
rule — "the rows stay on screen" IS the whole visual contract. Likewise `Resizable` shows no handle
in a capture: the handles paint on hover/focus only.

## A grading method that made the images affordable

`magick <story>__ds.png -bordercolor white -fuzz 1% -trim +repage` removes the constant framing
offset by construction, and `-gravity west -append` stacks the pair vertically at native resolution
(868/852px, under the image-read downscale threshold). Three to seven stories then fit in ONE
full-fidelity image read, and most `raw/` round-trips disappear. One artefact to expect: trimming a
CHROMELESS preview (ghost Button, unpressed Toggle) crops to the glyphs — that is the trim doing its
job, and it doubles as positive evidence that the transparent variant really is transparent.

## Story caps — CLEARED on this sync

Compare captures 6 stories per component by default. Six components have more — Button (13),
Table (15), InputGroup (7), Combobox (7), DatePicker (7), Toggle (7) — and their tails were
**recaptured with `--max-stories 15` and graded individually** on this sync. All 56 stories are
`match` with a first-time verdict each; nothing in this DS is verified-by-inference. Keep the raised
cap on re-syncs so the tails stay covered.

## Grading practice that paid off

The downscaled sheets are actively misleading for small type — a shared grey field fill read as
white-vs-grey on FormCombobox, and "Rome" read as "Roma" on FormSelect. **Open `raw/` for any
small-type or subtle-fill delta** before calling it.

## Known validate warns — the 20 `[DOCS_UNMAPPED]` are expected

Every run prints the same twenty and they are NOT a regression: AppLayout, ChoiceField, DateInput,
DatePicker, DateRangePicker, FormChoice, FormCombobox, FormDateInput, FormDatePicker,
FormDateRangePicker, FormErrorSummary, FormInput, FormSegmentedControl, FormSelect, FormSwitch,
FormTextarea, InputGroup, SegmentedControl, ToastRegion, VisuallyHidden.

They are components whose prose lives in a sibling's `.mdx` (the `Form*` adapters in their base
component's page) or that have no page of their own. Recorded here so the next run can do what the
skill asks — diff the warn lines against a known list — instead of re-deriving twenty names.
**A twenty-first name IS new: look at it.** Stepper, added on the 2026-08-31 sync, did not appear,
which is the check working.

## Re-sync risks — what to watch next time

- **`dist-design/` must be rebuilt with the DS.** `cfg.buildCmd` does it, but a hand-run
  `package-build.mjs` against a stale `dist-design` silently exports old components.
- **The two builds must not drift.** If someone edits `vite.config.mts` plugins, check the
  `DESIGN_EXPORT` branch still differs only by the compiler.
- **`storyImports.shim` is a list of public exports.** A new story importing a NEW public hook by
  relative path needs its pattern added, or that component renders unstyled — and the render check
  will still call it clean. The compare sheet is the only thing that sees it.
- **Story caps.** Button (13 stories) and Table (15) were compared on the first 6; the tail is
  verified-by-upload, not individually graded. Raise `--max-stories` if those tails carry variants
  worth checking. Stepper has 7, so every re-sync of it needs `--max-stories 12` or its last story
  (`Right To Left` — the one that proves the logical properties work) silently drops out of the grade.
- **The baseline injection does not survive a reference rebuild.** `sb-reference/` is gitignored and
  rebuilt from scratch; re-inject `baseline.css` into its `iframe.html` immediately afterwards and
  before any grading (see the UA-serif section). Forgetting it fails nothing — it just grades
  against the under-styled oracle.
- **Storybook 9 factory API.** If `.storybook/preview.tsx` grows real runtime behaviour beyond the
  i18n provider, `cfg.provider` must be updated by hand — decorators still cannot be bundled.

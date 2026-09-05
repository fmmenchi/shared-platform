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

| step                               | owns                                                                          |
| :--------------------------------- | :---------------------------------------------------------------------------- |
| 1 `routes/steps/brand-colours.tsx` | the fourteen bases — light and dark, one at a time — light validated as a SET |
| 2 `routes/steps/palette.tsx`       | the ramp's ends and the palette they produce, per theme                       |
| 3 `routes/steps/roles.tsx`         | every role re-pointable, per theme, with each declared pair measured          |
| 4 `routes/steps/review.tsx`        | the validator's verdict, and the download                                     |

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

**THE PREVIEW IS A DOCKED RAIL, AND ONLY THAT.** `theme-preview.tsx` is the design system under the
theme being built, rendered as an `<aside>` region of `AppLayout` (opened with `?preview=1`). It
renders no heading of its own — the rail's `h2` names the region — and brings no padding, because
`SidePanel` insets itself. There WAS a `/preview` route, the same component at full width, and it
was deleted rather than linked: once the rail existed nothing pointed at it (the `Building` /
`Preview` mode links, the step's button and the rail's `Full width` had all gone in favour of one
control), and an orphan route is the worst of link-it / delete-it / leave-it. The `sectionLevel` prop
existed only for that second host and went with it.

- **THE RAIL IS `clamp(26rem, 40cqi, 32rem)` WIDE**, retuned through `--fm-size-aside` on
  `AppLayout` (a token so a consumer can). Not 18rem: at 288px the preview's own buttons wrapped
  onto three lines. Not 26rem either — asked for wider twice, with a screenshot of `soft` still on a
  line of its own — and the arithmetic says why: `SidePanel` insets 1.5rem a side and the scope
  2rem, so 7rem of the rail is padding, leaving 288px for a row that measures ~290. 32rem leaves
  ~384px. CLAMPED to 40% of the shell because the rail is taken out of `main`: 32rem flat at a
  1024px shell would leave the step 256px. `cqi` resolves against `AppLayout`'s outer element (the
  container; the token is not `@property`-registered, so the unit resolves where it is used).

- **A REGION, NOT A BOX IN THE CONTENT.** It was a second grid column inside `main` first, and it
  read as a card floating in the page. `AppLayout` has had an `<aside>` region all along: it places
  it by what it IS (`.layout > aside`), sizes it with `--fm-size-aside`, makes the grid
  `nav main aside` when both are present, and stacks it under `main` below its `@xl` container
  query. None of that is this app's to write and none of it is a media query here. Measured across
  widths: 1500px → rail 288px / main 956px; 900px → main 356px; 700px → rail full width, stacked.
  Never a sideways scroll.
- **Which is why the loader and the stores are in `root.tsx`.** A region has to be a direct child of
  the shell, so it cannot read a route's loader — and that collapsed the duplicate loader
  `routes/preview.tsx` was carrying. `Stores` wraps the declarations conditionally because `Layout`
  renders the error shell too, where there is no data. `UiProvider` came up with them, which also
  fixed a pre-existing oddity: the sidebar and footer were outside it.
- **`SidePanel` IS the region, not something in it** — it renders an `<aside>` — and it brings the
  four things the region has no opinion about: the surface, its own scroll, the required name, the
  tab stop a scroll container needs ([ADR-0034](../../doc/adr/0034-a-side-panel-is-not-a-drawer.md)).
  It is NON-MODAL, which is the whole reason it can be there: verified in a browser, with the rail
  open a role select behind it has no `inert` ancestor and re-pointing one moves the rail's swatches.
- **DOCKED, THE SHELL IS THE WINDOW AND `main` SCROLLS** (`styles.css`, under the shell's own
  `@variant @xl`). The rail followed the shell's "page scrolls, column sticks" model first — sticky,
  capped at `100dvh` — and that put TWO scrollbars on every step: the rail's content is taller than
  any window, so the cap was its height, the row grew to it, and the document measured
  header + 100dvh + footer whatever the step held ("quella esterna non ha senso", with a screenshot).
  `AppLayout`'s stylesheet names the viewport-locked shape the specialised one, "an operator panel,
  wrong for a page" — which is what this app is. So the grid is pinned to `100dvh`, `main` gets
  `overflow-y: auto`, and the rail, a stretched item in a row that is now definite, needs nothing
  but `SidePanel`'s own `max-block-size: 100%`. Below the swap the page scrolls as the shell intends
  and the rail is a row under `main` capped at a screen. Placement is the app's, per the ADR — and it
  is in the stylesheet rather than inline because it differs either side of a container query.
  Without any bound at all the rail was 9313px tall with `scrollHeight === clientHeight`.
- **One control per state.** The header's `Show the preview` link opens it (marked `current` while
  it is open); the rail's `×` closes it. Both are LINKS that add or drop `?preview=1`, so the browser
  can do it — middle-click, no JavaScript. `preview-open.ts` owns the param's spelling, because it is
  a fact about the URL rather than about the shell.

**THE SHELL FOLLOWS THE SYSTEM'S THEME, UNLESS PINNED.** `theme-choice.ts` holds `Scheme | null` in
`localStorage` — `null`, nothing stored, meaning follow the OS — and applies the resolution as
`[data-theme='dark']` on `<html>` (light is the attribute's ABSENCE: `:root` is the light theme). The shell was the reference
theme, light, always, argued from "a draft whose contrast fails must not take down the controls" —
right about the DRAFT, silent about dark mode, and the dark preset was not even imported
(`styles.css` does now). Two readers of the choice, kept in step by `tests/theme-choice.spec.tsx`:

- **`BOOT_SCRIPT`**, inline in `<head>`, runs before the first paint so a stored `dark` never flashes
  light. It is built from the same constants (key, values, query) as the TypeScript, and the spec
  RUNS the string in jsdom against `resolveScheme` for every choice × system preference. `<html>`
  carries `suppressHydrationWarning` because the script has set the attribute before React looks.
- **`useScheme`**, `useSyncExternalStore` TWICE — over storage (server snapshot `null`) and over
  `matchMedia` (server snapshot light) — returning the RESOLVED scheme, with an effect that only
  applies it to the document. The media query is a store rather than an effect because the toggle has
  no `system` state left to render, so the resolution has to happen during render; the primitive
  renders the server snapshot during hydration and re-renders with the real value straight after, so
  there is no mismatch to suppress. Not `useState` seeded from storage: that is state set in an
  effect and a hydration mismatch, both.
- **The preview is untouched**: `ThemeScope` sets the roles inline and inline beats a preset, and no
  component stylesheet reads a palette rung directly (checked). The rail shows THEIR dark while the
  shell wears the design system's.

**WHICH THEME YOU ARE EDITING IS ONE QUESTION, IN THE URL.** `editing-scheme.tsx` owns the
`scheme` param and the `SegmentedControl` that writes it, and everything that needs the answer
reads it there — steps one, two and three, and the preview rail.

- **IT WAS ASKED FOUR TIMES.** Each of the three steps held its own `Tabs` with its own state, and
  the rail held a fourth in a `useState`. Set step one to dark, walk to step three, and you were
  editing light again with nothing on screen admitting the jump. The complaint was that there were
  too many switches; the defect was that ONE question was drawn four times, so it read as four.
- **A RADIO GROUP, NOT `Tabs`** — ADR-0025's own line, "a tab list navigates the page, a radio group
  answers a question". Those tab lists navigated nothing: both panels were the same step. So the
  component changes for the same reason the count does.
- **IN THE URL** for the reasons `preview-open.ts` gives about its own param, plus one it does not
  have to: `useStepLink` carries the whole query, so the scheme follows a step change with no
  plumbing. `tests/editing-scheme.spec.tsx` holds that as a property of the pair.
- **REPLACE, NOT PUSH.** Looking at the other theme is not somewhere you went, and a history stacked
  with it would make Back mean "the other theme" instead of "the previous step".
- **ONE PANEL RENDERS, NOT BOTH.** `TabPanel` stays mounted and goes `hidden`, which is right for
  tabs and was making step three render 168 comboboxes to show 84. A radio group has no such
  obligation. Measured: that page went from 385KB to 215KB.
- **THE CONTROL APPEARS TWICE and that is not a second answer** — on the step and in the rail, both
  over the URL. The rail keeps one because step four has none of its own and the rail must still be
  steerable from there. Its `name` comes from `useId`: radios sharing a `name` are ONE group to the
  browser, so a fixed name would have the two pairs uncheck each other.
- **The rail no longer previews a theme you are not editing.** It could, and nobody used it; a
  comparison is a feature (two themes side by side), not a fourth answer to one question.

**THE CHROME SAYS WHAT IT DOES.** The sidebar holds the four STEPS and nothing else; the header
holds the two things that are not steps: the theme switcher (`theme-switcher.tsx`, an icon `Button`)
and the preview toggle.

- **TWO STATES, NOT THREE.** It was a `SegmentedControl` over `system` / `light` / `dark`, argued as
  "`system` is a real state a person must be able to return to". It is a real state — it is just not
  a real CHOICE, because it is what you get by not choosing, so a third of the control was spent on
  the case nobody clicks. `system` moved from the control to the storage. THE COST, recorded: once a
  person pins, this UI cannot put them back to following the OS.
- **THE ICON SHOWS THE ACTION, NOT THE STATE** — a sun while dark — and that is what makes it a
  `Button` rather than a `Toggle`. A face that advertises its action is a button; a face that
  advertises its state is a toggle and carries `aria-pressed`. An action icon ON a toggle would show
  a sun while a screen reader announced "Dark theme, pressed": two accounts of one control
  disagreeing, the ADR-0024 defect that is invisible until somebody listens to it. The accessible
  name says what the icon says ("Switch to light theme") and changes with the state, which is right
  precisely because there is no `aria-pressed` here for it to contradict.

The preview was a fifth sidebar item under a hairline rule, the same shape as the steps, while a
`Badge` in the header reported which mode you were in without being able to change it: one concept
in two places, and the preview reading as a step it is not (nothing is decided there, and it is
reachable at any time).

- **A link, NOT a `SegmentedControl`**, which is what a mode switch looks like and the wrong
  component: that is a radio group (ADR-0025) and the design system draws the line itself — "a tab
  list navigates the page, a radio group answers a question". `Tabs` is out for the other half of
  the same sentence.

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

- **The dark bases are EDITABLE**, on step 1 with the switch on dark, and until somebody edits one they
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

## Step one is live, and the set check gates the advance

The light seven reach the store AS THEY CHANGE (`live-bases.tsx`, a `watch` subscription on the
form), and "Check and continue" runs the SET validation and then only navigates. Step one used to be
half committed and half live — light on submit, dark as you type — with two consequences both
watched happening: the dark seven could not follow a light edit until you continued (so "Re-derive
from the light seven" looked broken, disabled against a store the person was not looking at), and
the preview rail could not show a light edit at all, a hole in the feature the rail exists for.

This contradicts an earlier decision and the contradiction is deliberate. The objection on record —
"a store that accepted one colour at a time would invite writing an unchecked value into it" — was
about the set-level checks (a theme these seven cannot make readable), and those still run where they
did, on submit, gating step two. They never gated the WRITE, and nothing a colour input produces is
malformed; `parseBasesShape` checks the shape anyway before the store is touched. A theme that fails
a contrast floor is still a theme, and showing it failing while it is fixed is what the rail is for.
`tests/live-bases.spec.tsx` holds the boundary: the store moves on a valid edit, the dark seven move
with it, a malformed value is refused, and "Back to the reference colours" resets the FORM as well as
the store (through the store's own `reset`, which keeps the follow — the two-write version it
replaced stopped the dark seven from following, a hand edit as far as the store could tell).

## Known gaps

- **A role's rung menu offers EVERY family, ordered by the role.** Every family, deliberately: a
  role legitimately points outside its own — every `-foreground` is `neutral-0`, and `background`,
  `border` and `muted` are neutral too — so a filter would make the commonest case impossible, and
  the family is not derivable from the name (`--fm-color-error` and `--fm-color-destructive` both
  point into `negative`), so a filter would need a role→family table, a second home for a relation
  `vars.css` already states. `orderRungOptions` puts the family the role STARTS in first (read off
  the design system's own declaration with `homeFamilyOf`, not the re-pointed one, so the menu does
  not reshuffle under a choice), `neutral` second, the rest alphabetical. `tests/rung-options.spec.ts`
  asserts the order and that nothing is dropped.
- **The 25 (light) and the 1500 (dark) have no role pointing at them.** Deliberate headroom, and
  what makes the pale end of step 2 nearly free: the only thing `paleRungs: 0` breaks is the eight
  chromatic `-subtle` roles that now name the 50, which `probeShape` reports as an unavailable
  option rather than letting through.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

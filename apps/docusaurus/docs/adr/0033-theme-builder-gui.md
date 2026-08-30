# ADR 0033 — A GUI for the theme generator

- **Status:** proposed (2026-08-30)
- **Date:** 2026-08-30
- **Deciders:** Fabio Menchicchi

## Context and problem statement

`@fmmenchi/theme-generator:theme` scaffolds a brand preset and wires its CI validation. It is
headless, as an Nx generator is, and it emits **the 84 semantic roles copied from the light theme**
with an instruction to edit the values by hand.

[ADR-0032](./0032-tokens-gain-a-primitive-layer.md) made that obsolete twice over. A theme is now
**seven bases** and a handful of role remappings, not 84 literals — and the choices that turn a brand
colour into those seven are not obvious. Measured while building three borrowed themes for the
Storybook demo, three of them go wrong silently:

- **which step a fill points at.** Airbnb's coral is lightness 68%; pinned to the default fill step it
  renders at 41%, a burgundy. The theme looked wrong and the reason was invisible.
- **whether a chroma was a choice or a limit.** Setting every base to the gamut maximum made
  `secondary` identical to `primary` — they share hue 256 — because secondary's 0.04 was a decision
  and primary's 0.118 was the ceiling.
- **which ink a fill can carry.** Coral on white text is 3.05 against a 4.5 floor; on dark text it is
  6.88. Nothing in the CLI tells you that until the gate fails.

All three are visual problems, and all three were caught by looking at a rendering. Hence a GUI: not
as decoration, but because **the feedback these decisions need is a picture, and the generator's
current output is a file.**

## The constraint that decides the architecture

**A faithful preview needs React.** The components' class names are hashed CSS Modules —
`._button_gdl2j_2` — and the hash changes with every build of the stylesheet. A static HTML page
cannot reproduce a Button by writing its markup: there is no stable class to write. Reproducing the
components by hand against `var(--fm-*)` is possible but is a second implementation of every
component, which drifts from the first and hides exactly the defects the preview exists to reveal.

So the preview either mounts the real components, or it is not a preview of this design system.

## Considered options

**Nx Console's form.** Free: the extension renders a form from the generator's JSON schema. Rejected
as insufficient rather than wrong — it gives labelled inputs and no rendering, which addresses none of
the three failures above.

**A preview written in the GUI against the tokens.** Hand-written HTML using `var(--fm-*)`, served as
a static page. Cheap and independent, and it would have shown the coral problem. Rejected: it is a
parallel implementation of Button, Input, Alert and Card that nothing keeps in step with the real
ones. The moment they diverge the preview is lying, and a lying preview is worse than none.

**A dedicated wizard app** (`apps/theme-builder`). Full control over a multi-step flow, real
components, and the plugin stays dependency-free. Rejected for now on cost of ownership: it is a new
app to build, test and keep alive, and the workspace admits application projects only as a stated
exception (the docs site).

## Decision

**Three parts, and the calculation is the one that matters.**

### 1 · `buildPreset()` in `@fmmenchi/tokens`

A pure function, no DOM, no React:

```ts
buildPreset(brand: Partial<Record<Family, string>>, opts?: { scheme: 'light' | 'dark' }): Preset
```

It does what was done by hand for the demo themes: hue and chroma from each hex; the base at the
scheme's lightness, with chroma kept when it was a choice and raised when it was a gamut limit; the
fill pointed at the step nearest the brand colour's lightness; the ink chosen by **measuring**
contrast on that fill; and `validateTheme()` run before returning, so an unusable preset comes back
as an error naming the pair, not as CSS.

It returns structured data — bases, role assignments, and the reason for each — with CSS emission as
a separate function. The GUI needs the reasons to display them; the generator needs the CSS.

This is the only place the arithmetic lives. Both consumers below call it.

### 2 · The generator emits seven bases

`nx g @fmmenchi/theme-generator:theme --name=acme --primary=#635BFF --accent=#00D4FF` writes the
preset `buildPreset()` returns. The rest of the generator is unchanged: the file layout, the
`validate-themes` target, the executor. Existing behaviour with no colour flags stays as it is, so
the change is additive.

### 3 · The GUI is a published app, launched over npx

`@fmmenchi/theme-builder` — its own package, with a `bin`, so it runs two ways:

```bash
nx g @fmmenchi/theme-generator:theme --name=acme --gui   # the generator launches it
npx @fmmenchi/theme-builder                              # or a person runs it directly
```

**Why not a Storybook story**, which was the earlier draft here: the story serves
only this repository. `theme-generator` is a PUBLISHED plugin whose users are
apps bringing their own brand, and those apps do not have our Storybook. A
published app reaches them; a story does not. The story would also have grown into
an eight-step application inside a `.stories.tsx`, which is the wrong container
for it.

**The contract between the two is a file, not a socket.** The generator creates a
temp path, launches the builder with it, and waits:

```
theme-builder --out <path>.json --tokens <resolved @fmmenchi/tokens dir> [--name acme]
```

The builder serves its own page, opens a browser, and on submit writes the JSON
and exits. The generator reads the file and writes the preset into the workspace.
No HTTP between processes, no port negotiation across a boundary, and each half is
testable on its own: the builder against its JSON output, the generator against a
JSON fixture.

`--tokens` matters: the builder shows the CURRENT palette of the consumer's
installed contract, not ours. It reads the stylesheet it is pointed at, the same
way the generator already reads the installed contract.

**The wizard: eight steps.**

_Step 1 — the palette._ Brand colours, the ALGORITHM, and the ramps drawn beside
them. The algorithm is a real choice: _constant step_ (what ships — fixed
lightness offsets, families aligned with each other, contrast verified afterwards
by the gate) or _constant contrast_ (the Leonardo model — each step defined by the
ratio it must clear, so a step IS a guarantee, and a fill that cannot carry its
ink cannot be generated). Neither is better; exposing the choice beats picking one
and hiding it, and this is the step where the cost of each is visible because the
ramps are right there.

_Steps 2–8 — one per family_ (`primary`, `secondary`, `accent`, `negative`,
`success`, `warning`, `info`). Roles are assigned by **picking steps from the
palette**, not by choosing free colours — the Radix model, and what stops a theme
drifting off its own scale. Each step shows the family's ramp with the current
assignment marked, the components that actually use those roles, and the measured
contrast of every pair it touches.

_The demo page_, from step 1 onward: header, cards, a form, alerts, assembled from
real components, because a theme is judged as a page. It is where the failure this
exists to catch appears — the coral theme's `primary` and `destructive` are both
warm reds, invisible in a palette and obvious next to each other on a page.

_Contrast is checked in every step, not only at the end._ Each family step
measures the pairs it touches, live, as the assignment changes — the ratio beside
the swatch, and the floor it has to clear. A step that would drop a pair below AA
says so while the choice is being made, which is the difference between a wizard
and a form.

_Step 9 — the verdict._ Every declared pair with its ratio, and one sentence at
the top: this theme is AA, or these pairs are not. Two levels, because they catch
different things:

- **the contract**, via the public `validateTheme()` — the same function the
  `validate-themes` target runs in CI. Not a second implementation: if the
  summary says AA and the pipeline disagrees, the summary is worthless, so it has
  to be the identical check.
- **the page**, via axe on the rendered demo. This finds what the pair list
  cannot — a combination no pair declares, or two roles that pass individually
  and are indistinguishable from each other. The coral theme's `primary` next to
  its `destructive` is exactly that: both clear AA on their own, and a person
  cannot tell the submit button from the delete button.

The verdict is a report, not a lock. A theme with a failing pair can still be
exported — the CSS is written, the failure is stated, and the CI gate will say
the same thing. Refusing to export would only teach people to bypass the tool.

_Exit at any step_ with the CSS or the `nx g` command. The wizard is a place to
see, not a gate to pass.

**Where it lives.** `packages/tools/theme-builder`, scope `tools`, published with
a `bin`. It depends on `@fmmenchi/ui` and `@fmmenchi/tokens` — the components are
the preview, and mounting the real ones is the whole point (the class names are
hashed, so nothing else can). That dependency direction is fine: a tool may
depend on the layers, and the module-boundary rule forbids the reverse.

### What is deliberately NOT built

**The generator does not host the GUI.** It launches a separate process and reads a
file. Everything a browser needs — a server, a port, a bundled page — belongs to
the builder, which is an application and can own those things; a generator that
grew an HTTP server would be a generator with a second job.

**No live round-trip.** The builder does not write into the workspace and the
generator does not stay open while a person clicks. One handoff, one file. A
watch mode where edits land in the repo as they happen is a different tool and a
much larger promise.

## Consequences

**`culori` becomes a runtime dependency of `@fmmenchi/tokens`**, which today has none. The gamut
search and the contrast measurement need it, and reimplementing either is how a resolver starts
asserting its own arithmetic. Two ways out if the weight is unacceptable: ship `buildPreset` from a
subpath so importers of the token names do not pay for it, or move it to a `bin` — the workspace has
that pattern in `@fmmenchi/ci`. Decide when measuring the bundle, not before.

**The plugin gains a dependency on `@fmmenchi/tokens`.** It generates themes for that contract, so it
is not a foreign dependency; and it already reads the installed contract at generation time.

**Two algorithms mean two implementations to keep correct**, and the second one
does not exist yet. `buildPreset()` takes the strategy as a parameter; constant
step is the one in use and the one the round-trip test pins. Constant contrast
lands with the wizard or after it, and until it does the wizard offers one
choice — which is honest, where a disabled radio button implying a missing
feature would not be.

**The story is a dev tool that ships nowhere**, like the rest of Storybook. The borrowed-brand
palettes stay in the demo story and out of the package, for the reason recorded there.

## What gets tested

- `buildPreset()` regenerates the presets this repo already ships, from their own brand colours. That
  is the test that matters: it ties the generator to a truth already in the repository rather than to
  a snapshot of itself.
- Every preset it emits passes `validateTheme()` — asserted on the three demo brands, whose colours
  include the two cases that break naive derivation (a pale fill, and two families sharing a hue).
- The generator's existing spec keeps passing with no colour flags.
- The builder story renders, via the story test run.
- The wizard's step logic is unit-tested where it decides something: which steps a
  family may point at, and what the contrast of an assignment is.
- The final verdict agrees with `validateTheme()` by construction, since it calls
  it — asserted on a theme built to fail, so the summary is known to report a
  failure rather than only to pass on good input.
- The handoff: the builder's JSON against a schema, and the generator against a
  JSON fixture. Each half testable without the other.

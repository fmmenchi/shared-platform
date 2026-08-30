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

### 3 · The GUI lives in Storybook

A dedicated story — `Foundations/Theme builder` — with a colour input per family, the preview built
from the **real** components, and two outputs: the CSS to paste, and the `nx g` command with the
flags filled in.

Storybook is where the real components already run, with the tokens loaded and both schemes
switchable. Putting the builder there costs no new infrastructure and cannot drift from the
components, because it _is_ the components.

The story is a story, so `@storybook/addon-vitest` runs it: a builder that throws fails `nx test`.

### What is deliberately NOT built

**The generator does not open a browser.** `nx g theme --gui` starting a local server, opening a page
and waiting for a POST is the wizard in the literal sense, and it is the one part that can be added
later at low cost once part 1 exists — the server would be a thin wrapper around `buildPreset()`.
Building it now would mean owning an HTTP server, a port negotiation, a bundled page and a browser
launch inside a generator, before knowing whether the Storybook flow is enough. It is a follow-up,
not a rejection.

## Consequences

**`culori` becomes a runtime dependency of `@fmmenchi/tokens`**, which today has none. The gamut
search and the contrast measurement need it, and reimplementing either is how a resolver starts
asserting its own arithmetic. Two ways out if the weight is unacceptable: ship `buildPreset` from a
subpath so importers of the token names do not pay for it, or move it to a `bin` — the workspace has
that pattern in `@fmmenchi/ci`. Decide when measuring the bundle, not before.

**The plugin gains a dependency on `@fmmenchi/tokens`.** It generates themes for that contract, so it
is not a foreign dependency; and it already reads the installed contract at generation time.

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

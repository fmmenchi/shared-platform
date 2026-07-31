# ADR 0002 — UI library foundations: native-first, no behaviour layer, precompiled CSS Modules

- **Status:** accepted (2026-07-30) — supersedes [ADR-0001](./0001-ui-library-foundations.md)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

> **Recorded retroactively.** ADR-0001 reserved this number for the decision its scouting would
> produce, and pointed here four times. The decision was in fact made — but by building, not by the
> spike comparison 0001 planned, and it ended up scattered across 0006, 0013, 0017, 0018 and 0019
> rather than written anywhere. This ADR states it in one place, from what was built and what the
> evidence showed. Where the reasoning came after the fact rather than before it, this document says so.

## Context and problem statement

ADR-0001 framed the scouting and set the exit criteria: **one combination wins on the drivers, and
0002 records the decision — behaviour layer, styling, theming, provider pattern, package split.** Its
drivers were provider-agnosticism, SSR-safety, independent release, an accessibility baseline without
hand-rolling focus and aria logic, and a workable dev loop.

**The planned spikes were never run.** Instead the library was built — Button, Badge, Alert, Input,
Field, Fieldset, InputGroup — and each component answered a piece of the question with evidence. That
is a weaker method than a controlled comparison and it is worth naming; what redeems it is that the
answers were tested against real components and real assistive technology rather than against a demo.

## Decision

### 1. Behaviour layer: none. Native-first.

**No React Aria, no Radix primitives, no headless behaviour library.** A component is built on the
right native element, with the light ARIA the platform does not provide, and nothing else.

This is the decision 0001 left explicitly open ("whether a headless lib is worth it for richer
widgets"), and the evidence that settled it came from building:

- **The native element is often the more accessible one, not merely the lighter one.** `Fieldset` uses
  a real `<fieldset>` and `<legend>` rather than `<div role="group">` — which is what React Aria and
  MUI use — because `role="group"` is effectively unsupported by VoiceOver on iOS, the majority mobile
  screen reader. The headless path would have cost accessibility, not bought it.
- **What we actually needed from a behaviour library was context wiring**, and that is a hook: a
  control becomes field-aware by reading a context (`useFieldControl`), and a control we do not own is
  wired with prop getters (`useField`). Neither needs a dependency.
- **The hard widgets are still ahead**, and this decision is not a promise to hand-roll them — see the
  exit signal below.

### 2. Styling: CSS Modules authored with Tailwind, variants with cva, **precompiled**

Confirmed as 0001 proposed. A published package cannot assume its consumer runs Tailwind, so we
compile the artifact ourselves and ship plain CSS. Rejected there and still rejected: shipping source
for the consumer to `@source`-compile (couples every consumer to our toolchain, with silent failures
when a bundler skips `node_modules` CSS), and a precompiled raw-utility sheet (global utilities that
collide with the app's).

How that CSS behaves once it arrives — one cascade layer, unlayered tokens, `@property`-typed roles, no
motion runtime — is [ADR-0018](./0018-how-the-ds-ships-css.md).

### 3. Theming: semantic token roles as custom properties

Roles (`--fm-color-*`, `--fm-space-*`, `--fm-duration-*`…) in an unlayered `:root`, presets applied with
`[data-theme]`, contrast pairs validated at build time. Components may use **only** the semantic roles;
`lint-css` enforces it. A consumer themes by reassigning roles, never by overriding component rules —
though they can do that too, by construction (ADR-0018).

### 4. Provider: one thin `UiProvider` carrying injected adapters

As 0001 designed it: an inversion-of-control seam, not a feature provider. It carries the app's
adapters (i18n locale, link component, icon renderer, portal container) and the active theme, derives
`direction`, and holds no application state. The DS owns its own internal copy in colocated catalogs
and never receives app text through the port.

### 5. Package split: two, not three

`@fmmenchi/tokens` and `@fmmenchi/ui`. The `@fmmenchi/ui-ports` package 0001 proposed was absorbed into
`ui` ([ADR-0006](./0006-absorb-ui-ports.md)): the port contracts had exactly one consumer, and a
package boundary with one consumer buys nothing and costs a release cycle.

## The exit signal — when a behaviour library would become justified

Native-first is a decision, not an identity. The components that would reopen it are **Combobox** and
**Menu**: roving tabindex, typeahead, virtual focus and the list-of-options interaction have no native
equivalent, and hand-rolling them is where accessibility bugs are actually written. When one of those
lands on the roadmap, this decision is re-examined for that component — adopting a library for a widget
is a smaller commitment than adopting one for the library.

The signal to watch is not "this is hard" but "this is hard **and** the platform offers nothing": a
`<dialog>` is hard and the platform offers plenty, which is why it stays native.

## Consequences

- **Zero runtime dependencies for behaviour**, and the accessibility floor is the platform's rather
  than a library's — which has been better, in at least one measured case, and requires that every
  component justify its ARIA rather than inherit it.
- **The cost is real:** we own the ARIA, the focus management and the edge cases. The mitigation is the
  build discipline — a source survey before writing, an adversarial review before merging — not
  optimism.
- **0001 moves to `superseded by 0002`.** Its scouting content stands: the port anatomy and the i18n
  ownership table in it are still the contract, and this ADR does not restate them.
- The decisions that grew out of these foundations, each with its own record:
  [0008](./0008-cross-app-framework-agnostic-layers.md) what earns a layer ·
  [0013](./0013-form-controls-contract.md) form controls ·
  [0016](./0016-minimal-semantic-markup.md) markup ·
  [0017](./0017-browser-platform-target.md) platform target ·
  [0018](./0018-how-the-ds-ships-css.md) CSS delivery ·
  [0019](./0019-ui-package-organisation.md) package organisation.

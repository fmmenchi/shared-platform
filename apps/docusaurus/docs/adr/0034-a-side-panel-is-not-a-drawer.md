# ADR 0034 — A non-modal side panel is not a drawer, and the line is what the page can still do

- **Status:** proposed (2026-09-02)
- **Date:** 2026-09-02
- **Deciders:** Fabio Menchicchi

> Draws the boundary [ADR-0021](./0021-anchored-surfaces.md) does not reach. That one governs
> surfaces that float **above** the page — tooltip, popover, menu, the modal dialog — and settles
> them on the platform's top layer. This one is about a surface that sits **in** the page and
> reflows what is beside it, which the top layer cannot express. Nothing here reverses it, and
> nothing here changes what `Dialog` is.

## Context and problem statement

The theme builder ([ADR-0033](./0033-theme-builder-gui.md)) has a preview: the design system's real
components, rendered under the theme being built. It was a page of its own, and a page is the wrong
shape for it — the preview exists to answer "what does this colour do", and a person asking that is
mid-choice, looking at the control they just moved. Sending them to another page takes the control
away at the moment the answer arrives.

So it should open **beside** the work. The design system has a drawer already, and its own
documentation says what a drawer is:

> It is the same modal and not a second component: `showModal()` traps the focus, makes the page
> inert, draws the backdrop, locks the scroll and hands the focus back, all of which a drawer wants
> unchanged. What differs is geometry, so this is geometry.
>
> — `DialogContentProps.side`

That sentence is right, and it is exactly why the drawer cannot serve this case. `showModal()` makes
the page inert. A preview whose purpose is feedback on the control you are touching **cannot make
that control unreachable**. Reach for the drawer here and the feature contradicts itself: you may
look at your theme, or change it, never both.

The question is therefore not "does the package need a drawer" — it has one. It is **where the line
runs between two side surfaces that look identical and mean opposite things**, answered before an
app picks the wrong one. Picking wrong is easy and quiet: the geometry is what a designer specifies,
the modality is what nobody mentions, and `side="inline-end"` is right there.

### What was measured first

Both halves of the layout were checked in a browser before deciding anything, because "put it beside
the content" is a claim about width:

- **The wizard's steps reflow.** At 760px and at 620px of column, none of the four steps scrolls
  sideways: every one of them is a wrap-based grid, so a column half the width costs height and
  nothing else. The only clipping is the stepper's own labels, which happens at those widths already
  and is chrome.
- **The preview is a strip, not a page.** In a 448px column it is 3357px tall (3669px at 380px,
  2913px at 560px), and it does not scroll sideways at any of them. So a panel holding it needs its
  **own** scroll: the thing beside it must stay put while it moves.

Neither number decides the boundary. They decide that the boundary is worth having: a non-modal
panel is achievable here, so the reason to use the modal one would only be that it was the component
that existed.

## Decision

### 1. Two side surfaces, and the line is inertness

| the page keeps working while it is open | the surface                                          |
| :-------------------------------------- | :--------------------------------------------------- |
| **yes**                                 | `SidePanel` — non-modal, in the layout, reflows      |
| **no**                                  | `Dialog` + `DialogContent side` — the drawer we have |

One question, asked of the use case rather than of the design: **is the content beside it still
usable?** A filter panel you tune while watching the list, a details pane, an inspector, a preview —
yes. A confirmation, a form that must be finished or abandoned, a navigation drawer on a phone where
there is no "beside" — no.

It is not a spectrum and there is no third state. `inert` is a boolean the platform sets for us.

### 2. Not a `modal={false}` prop on `Dialog`

The drawer earned its place on `DialogContent` because geometry was the only difference. Here the
differences are: inertness, the backdrop, the scroll lock, the focus trap, the focus return, the top
layer, and whether what is beside it reflows or is covered. That is everything except "it is a
surface at an edge".

A prop that changed all seven would not be a variant, it would be two components sharing a name —
and the name would be the modal's, so the non-modal case would arrive as a negation of it. The same
reasoning [ADR-0024](./0024-toggle-switch-checkbox-boundary.md) used on `Toggle` and `Switch`: alike
on screen, different in what they mean, therefore not one component with a flag.

### 3. It is a layout participant, so no top layer and no `<dialog>`

`<dialog>` without `showModal()` is non-modal, and it is still not this: it does not participate in
layout, so nothing reflows around it, and it brings a dialog role a complementary region should not
have. The Popover API is out for the same reason — [ADR-0021](./0021-anchored-surfaces.md) chose the
top layer because an anchored surface must escape `overflow` and every stacking context. A panel
must do the opposite: stay inside the flow and take its share of the width.

So it is an ordinary element in the page, and everything that follows from that is a feature — it
scrolls with the document if the app wants, it can be sticky if the app wants, and it costs no focus
management at all, because focus never left.

### 4. It is an `<aside>`, and it must be named

Complementary content, so `<aside>` — which is a landmark, which is why the name is required rather
than nice, for the same reason `Nav` requires one: a page with two unnamed complementary regions
offers a screen reader user a list of things all called "complementary".

**And no parts.** A `SidePanelTitle` was drafted here and dropped while building: without an
`aria-*` job it is `Heading` plus a class, and `CardTitle` earns its place by adding the whole-card
link layer, which has no analogue on a panel. The name is `label`, or an `aria-labelledby` pointing
at a heading you already show — which `Nav` already documents and which needs no context, no
registration effect, and therefore has no SSR gap of the kind `Field`'s description wiring has.

**One more thing the element brings, found by axe rather than by reasoning.** A scrolling region that
holds nothing focusable cannot be scrolled by a keyboard at all: there is no tab stop to land on, so
the arrow keys have nowhere to go (`scrollable-region-focusable`). The panel is therefore focusable —
unconditionally, because the alternative is measuring per render, which is a behaviour layer over a
question CSS already answers, and [ADR-0002](./0002-ui-library-foundations-decision.md) refuses
that. One tab stop on a panel that happens not to scroll is the price of never shipping a region a
keyboard cannot reach.

### 5. Whether a panel is open is the APP's state, not the panel's

The design system renders a panel; it does not own the question of whether one exists right now. The
app conditionally renders it, and where it can, it should keep that in the URL rather than in memory
— linkable, survives a reload, and needs no JavaScript to be correct. The theme builder uses
`?preview=1`, next to the `?from=` it already had.

This is the same division `Dialog` already draws differently and for a good reason: a modal owns its
open state because the platform's `showModal()` does, and there is nothing for the app to reflow.

### 6. `SidePanel`, not `Panel` and not `SideSheet`

`TabPanel` exists, so "panel" alone is already spoken for in this vocabulary and would name two
unrelated things. `SideSheet` is one library's word rather than the shared one. `Aside` names the
element, and the element is an implementation the component may keep or change.

### 7. Narrow screens are the app's call, and both answers are already available

Below the width where two columns fit, an app either stacks the panel under the content — which
`grid-template-columns: repeat(auto-fit, minmax(…, 1fr))` does with no media query and no JavaScript
— or shows the modal drawer instead, which is the component this ADR leaves untouched. The design
system does not choose: it has both, and the choice depends on whether the content below is worth
reaching.

## Consequences

- `@fmmenchi/ui` gains `SidePanel`, and no parts. Small: an element, a name, a surface, its own
  scroll, and the tab stop that scroll requires. No behaviour layer, per
  [ADR-0002](./0002-ui-library-foundations-decision.md).
- `Dialog` is unchanged, and `side` keeps meaning exactly what it says.
- The theme builder's preview becomes one component rendered in two places — the panel beside a step,
  and the full-width page for reading all eleven sections. Not two renderings of one thing.
- The next app that wants a surface at an edge has to answer one question to pick, and the answer is
  about its use case rather than about our inventory.
- **Left open:** a panel that is resizable, and one whose width a person can drag. Neither is needed
  yet, and both are geometry rather than boundary — they can arrive on this component without
  reopening this decision.

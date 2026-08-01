# ADR 0021 — Anchored surfaces: the platform owns the layer, we import the geometry, the behaviour stays ours

- **Status:** accepted (2026-08-01) — refines [ADR-0002](./0002-ui-library-foundations-decision.md), does not supersede it
- **Date:** 2026-08-01
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Four components are ahead — **Tooltip**, **Popover**, **Menu**, **Combobox** — and all four put content
somewhere the normal flow cannot reach: floating beside a trigger, above everything, positioned so it
stays on screen. Nothing we have built so far needed that.

Three questions have to be answered before the first of them is written, and answering them per
component would guarantee four different answers:

1. **Where does the floating element live?** A portal into `document.body`, or the platform's top layer?
2. **Who computes the position** — including flipping when it does not fit and sliding to stay in view?
3. **Who owns the interaction** — hover, focus, dismissal, roving, typeahead, ARIA?

[ADR-0002](./0002-ui-library-foundations-decision.md) already answered the third for the library as a
whole (no behaviour layer) and pre-declared the condition for reopening it: _"the signal to watch is not
'this is hard' but 'this is hard **and** the platform offers nothing'"_, naming Combobox and Menu as the
components that would reopen it. This ADR applies that test to the three questions and finds them
answered differently — which is the point.

## Decision

### 1. The layer is the platform's. The Popover API, declaratively. No portals.

An element with the `popover` attribute is promoted to the **top layer** when shown. From there it
escapes every `overflow: hidden`, ignores every stacking context and `z-index`, and — measured — its
containing block becomes the viewport even inside a transformed ancestor, which is the classic cause of
"the menu is 200px off". The platform also gives light dismiss, `Esc`, and focus return.

It does that **without moving the node in the DOM**, so reading order, tab order and `aria-*`
relationships stay as authored. A portal moves the element and each of those has to be repaired by hand.

What the top layer gives is a **coordinate space, never a position**: it says the surface may paint above
everything and measures its `fixed` coordinates against the viewport, and then leaves it at the origin.
Deciding _which_ coordinates is question 2, and nothing in the Popover API answers it.

The evidence is not theoretical. In `iungo` — same team, same problem, portal-based — the Tooltip carries
this:

```ts
const getContainer = useCallback(() => {
  return hasTopLayerElementAnchestor(triggerRef.current)
    ? getTopLayerAnchestor(triggerRef.current)
    : portalContainer;
}, [portalContainer]);
```

A tooltip portalled to `body` renders **under** a `<dialog>`, because the dialog is in the top layer and
the portal is not. They had to detect the top-layer ancestor and portal into it. That code exists only
because the element was moved; in the top layer the case does not arise.

**API shape follows from the gate.** The `popover` attribute is HTML and passes
[ADR-0017](./0017-browser-platform-target.md) by construction. Where the interaction is a **click** —
Popover, Menu — `popovertarget` drives it declaratively and no script is involved at all.

A Tooltip cannot take that route: it opens on hover and on focus, and HTML has no declarative trigger for
either. So it calls `showPopover()`, which is exactly the enhancement tier of ADR-0017 — feature-detected
(`'showPopover' in surface`), never assumed. **The visibility must not depend on it.** The surface is
shown and hidden by our own state and CSS; the popover call only promotes it to the top layer. Where the
API is missing the tooltip still appears, merely clippable — a tooltip that fails to appear is not a
graceful degradation, it is a missing description.

**Consequence:** `portalContainer` in `UiAdapters` is removed. It has never been read by any component,
and with the top layer it never will be. Unlike a token role — vocabulary a theme fills — a port member
is a promise every consumer must implement; one for a mechanism we have decided against is a phantom.

### 2. The geometry is imported: `@floating-ui/dom`, and only that

CSS anchor positioning is the direction the platform is going, and where it exists it is better than any
library: it recomputes on scroll and resize natively, with no observers to install or forget. But it is
not enough today, and the gaps are not exotic:

| what is needed                            | CSS anchor positioning                    |
| ----------------------------------------- | ----------------------------------------- |
| flip to the opposite side                 | yes — `position-try-fallbacks`            |
| **slide continuously to stay in view**    | **no** — it picks from discrete fallbacks |
| centre the arrow                          | yes — `anchor-center`                     |
| hide when the anchor is clipped           | yes — `position-visibility`               |
| recompute on scroll/resize                | yes, natively                             |
| **anchor to a cursor, a range, a canvas** | **no** — an anchor must be a real element |
| **anchor to a wrapped inline element**    | **no** — uses the whole bounding box      |
| **visual viewport (mobile keyboard)**     | **no** — layout viewport only             |

The first gap alone decides it: continuous shift is what a Popover near a viewport edge and a Combobox
list near the bottom of the screen both need, and those are two of the four components.

So the geometry is imported — `computePosition` and the middleware — and nothing else:

| layer                                         | owner                                          |
| --------------------------------------------- | ---------------------------------------------- |
| top layer, and — with `auto` — dismissal      | the platform (`popover`)                       |
| where it goes, flip, shift, arrow             | `@floating-ui/dom`                             |
| roles, relations, timing, roving, typeahead   | **us**                                         |
| hover/focus/click wiring, portal, focus traps | **nobody** — `@floating-ui/react` is not taken |

Measured, by fetching the packages: `@floating-ui/dom` 4.0 kB gzip, `@floating-ui/core` 4.7 kB,
`@floating-ui/utils` 1.8 kB — **~9 kB gzip** for the graph, less with tree-shaking since the middleware
are separate exports. `@fmmenchi/ui` already carries `class-variance-authority`, `clsx` and `tslib`, so
this is a fourth runtime dependency, not a first.

**This does not reopen ADR-0002.** By its own test — "hard **and** the platform offers nothing" — the
behaviour half fails the test: the platform offers plenty, and we take it. The geometry half passes it:
the platform offers something, and not enough. A positioning function is not a behaviour layer; it
computes coordinates and touches neither the DOM's semantics nor the user's focus.

### 3. Tooltip and Popover are two components, not one with a flag

They share a geometry and nothing else. Written out, because the shortcut "a tooltip is a small popover"
is how inaccessible tooltips get built:

|               | Tooltip                                          | Popover                              |
| ------------- | ------------------------------------------------ | ------------------------------------ |
| opens on      | hover **and** keyboard focus                     | an explicit action (click / `Enter`) |
| on touch      | does not exist                                   | works normally                       |
| focus         | **never** receives it                            | may; returns to the trigger on close |
| content       | short text, **nothing interactive**              | anything                             |
| ARIA          | `role="tooltip"` + `aria-describedby`            | `aria-expanded` + `aria-controls`    |
| `Esc`         | dismisses **without moving focus** (WCAG 1.4.13) | closes **and** returns focus         |
| popover state | `manual` — must not dismiss anything else        | `auto` — full light dismiss          |

The shared piece is therefore deliberately thin and **internal**: given a trigger and a content element,
put the content in the right place, in the top layer, and keep it there while it is open. It knows
nothing about focus, dismissal or ARIA. It becomes public only if a second consumer confirms its shape.

Tooltip additionally owes WCAG 1.4.13 — dismissible without moving the pointer, hoverable, persistent —
and its content is typed as a **string**, so "no interactive content" is enforced by the compiler rather
than by a guideline. (Borrowed from `iungo`, which does the same.)

## Consequences

- **A dependency in a published package.** It enters every consumer's tree, the Trivy scan and the
  Dependabot cycle. `@floating-ui/dom` is 1.x and stable; `@floating-ui/react` — the 0.x half — is not
  taken, which is also where the churn lives.
- **`z-index` stops being a lever, and that is the trade.** Nothing an app declares can cover a
  top-layer element, which removes the usual war; but ordering **among** top-layer elements is by
  activation order and cannot be overridden. A consumer with a hand-rolled modal at a high `z-index`
  will find our popover above it, and the only fix is that they use the top layer too.
- **The real footgun is not stacking, it is `auto` dismissal.** A `popover="auto"` closes other `auto`
  popovers that are not its ancestors. A Menu inside a Popover, or a Combobox list inside a Dialog, must
  be a DOM descendant (or invoked from within) or they close each other. This is why Tooltip uses
  `manual`: a tooltip must never dismiss the menu it is describing. `hint` is the state written for
  exactly this and it does one thing `manual` cannot — close on the next hover elsewhere — but it is not
  Widely available, and a tooltip already closes on its own `pointerleave`. It replaces `manual` the day
  the gate lets it, with no API change.
- **Reversible by construction.** When CSS anchor positioning reaches Widely, `@floating-ui/dom` is
  deleted and the CSS takes over. Positioning is internal, so no component's public API changes.
- **Combobox and Menu are still open.** ADR-0002's exit signal names them, and this ADR does not spend
  it: it decides the surface they will sit on. Whether their behaviour — roving, typeahead, virtual
  focus — is hand-rolled or imported is decided when they are built, per component, with the same test.

## Alternatives considered

**All of `@floating-ui/react`** — what `iungo` uses. It brings `useHover`, `useFocus`, `useDismiss`,
`useRole`, `FloatingFocusManager`, `FloatingPortal`: precisely the behaviour layer ADR-0002 refused, and
precisely what the native shell already provides. Rejected: it would trade a platform guarantee for a
dependency, and it is the half that carries the 0.x churn.

**CSS anchor positioning only, no library.** The zero-dependency path, and the destination. Rejected for
now on one measurement: no continuous shift, and the two components that need it are the two we are
about to write.

**Hand-rolled positioning (~60 lines).** Honest while the case stays "menu below a button". Rejected
because the long tail — containing blocks, nested scroll containers, inline anchors, visual viewport,
iframes — is exactly what is not visible when you write it and is very visible in a consumer's app.

**Portals with our own `z-index` scale.** Rejected: it reintroduces clipping, containing-block and
reading-order problems that the top layer closes, and `iungo`'s top-layer-ancestor helper is what that
path costs in practice.

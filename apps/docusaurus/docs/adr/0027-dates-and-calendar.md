# ADR 0027 — Dates: a native field, and a Calendar for what it cannot do

- **Status:** proposed
- **Date:** 2026-08-12
- **Deciders:** Fabio Menchicchi

> **This replaces an earlier draft** (written 2026-08-11, never proposed, so never part of the
> record) which reached the same conclusion about the field and a stricter one about the calendar:
> it gated `Calendar` on **Temporal reaching Baseline Widely**. That gate does not survive
> measurement and is withdrawn below, with the reasoning, because a decision that defers on a false
> constraint is worse than no decision — it looks principled.

## Context and problem statement

The roadmap defers date and time pickers with one line — _"the native inputs are inconsistent across
engines and the hand-rolled ones are a calendar widget with a locale problem. Not before there is a
real consumer."_ That is true and it is not a plan. When a consumer arrives, the decision gets made
under deadline pressure, which is exactly when a design system reaches for the dependency it swore
off. This decides it while nobody needs it.

The question was never "should there be a date picker". It is **which of four shapes the answer
takes**, because they differ by an order of magnitude in cost:

1. a styled native `<input type="date">`;
2. GOV.UK's "memorable date" — three labelled text inputs;
3. the native input, plus a standalone `Calendar` for what it cannot do;
4. a fully custom DateField (segments) + Calendar + Popover composition.

## What the native input actually does — measured

Folklore says `input[type=date]` cannot be styled. Measured in the suite's real Chromium, at a
414px viewport, that is true of **one** part of it and false of the rest.

| Question                                      | Measured                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Does the box model apply to the closed field? | **Yes, exactly.** border/background/color/padding/font-size/radius all applied |
| …to the pixel?                                | 260 + 22 padding + 4 border = **286px**; 44 + 14 + 4 = **62px**                |
| Is the calendar icon ours?                    | **Yes.** intrinsic 142px → hidden **122px** → widened to 60px **186px**        |
| Can our own button open the picker?           | **Yes.** `showPicker` is a function                                            |
| Is the value the one we want to store?        | **Yes.** `value === '2026-08-12'`, `valueAsDate` agrees                        |
| Do `min`/`max` reach `ValidityState`?         | **Yes.** `rangeUnderflow` and `rangeOverflow` both fire                        |
| Does the browser hold the state?              | **Yes.** after `form.reset()` the value is back to `2026-08-12`                |
| Is the popup stylable?                        | **No.** not in the DOM, no shadow access — there is nothing to write CSS on    |
| Is the segment geometry ours?                 | **No.** `padding-inline` on `::-webkit-datetime-edit-month-field`: no effect   |

Two limits on that table, stated rather than buried. It is **one engine**: the `::-webkit-*`
pseudo-elements are Blink/WebKit, Firefox has no equivalent, and that is read from the platform, not
measured here. And the segment result tested padding only — it does not license a claim about colour.

What this buys for free, and what it would cost to rebuild: the value is always ISO `yyyy-mm-dd`
while the **display** follows the user's locale — month names, field order, numbering system — with
no i18n dependency; on touch it opens the OS sheet, which beats any JS calendar; and the browser
holding the value is the same contract this package already measured and chose for `Input`,
`Checkbox` and `Switch`.

## The ceiling, and it is a real one

- **No per-date disabling.** `min`/`max` are an interval, not a set. "Only these slots", "never on a
  Tuesday", "these three days are booked" are not expressible. This is the limit that decides.
- **The open popup belongs to the engine**, looks different in each, and cannot be themed.
  `::picker()` / `appearance: base-select` is Chromium-only, applies to `<select>`, and extending it
  to date inputs is an open Open UI discussion with no spec — under this workspace's Baseline Widely
  bar that door stays shut for years.

## What a Calendar actually costs

The reputation is earned but it is not evenly distributed. Separated:

**Irreducible, and this is the real work.** The APG grid keyboard contract: arrows across and down,
PageUp/PageDown for months, Shift+PageUp/PageDown for years, Home/End — plus the part that catches
everyone: **the roving focus is a date, not a cell index**. Cross a month boundary and the grid
re-renders underneath the focus, which then has to land on the right cell of the new month. Add
announcing the month change without flooding a screen reader. This is Menubar-class work, and it is
the whole of what makes a calendar hard.

**Assumed hard, and isn't.**

- **Date arithmetic.** A calendar picks a **civil date** — year, month, day. No time, no timezone.
  Arithmetic on a `{y, m, d}` triple of integers is exact and short: days-in-month plus one
  `Date.UTC` for the weekday. The JavaScript date horror stories come from doing arithmetic on
  `Date` objects that carry a time, which is precisely what this must never do. **Temporal is
  convenience here, not capability — so the earlier draft's gate on it is withdrawn.**
- **Month and weekday names.** `Intl.DateTimeFormat` is Baseline. Free, in every locale.
- **First day of the week.** `Intl.Locale.getWeekInfo()` is Newly and shipped with two incompatible
  shapes — but as a **prop with a detected default** it passes the Newly test in
  [ADR-0017](./0017-browser-platform-target.md) rather than failing it. That test is "not degradable
  ⇒ not yet", and this degrades: without the API the grid still works, the week simply starts where
  the fallback says, and a consumer who cares states the prop. Marked and ledgered like any other
  Newly use. A design, not a blocker.

**Genuinely out of reach.** Non-Gregorian calendar systems: `Intl` will _format_ them, but grid
arithmetic in them is a research project. That is a scope boundary, not an obstacle.

**Why the field's best teams refused, and why it does not transfer.** Radix — years of it being
their top-requested component — never shipped one. Adobe answered by writing an entire date library
(`@internationalized/date`). shadcn delegates wholesale to `react-day-picker`. MUI evicted pickers
from core and put range selection behind a paywall. All four were promising _any_ locale **and**
_any_ calendar system **and** ranges, to consumers they will never meet. "Gregorian, one date, first
day of the week as a prop" is a far smaller promise, and it is the promise a design system with
known consumers is allowed to make.

**And the primitives already exist here.** `primitives/roving.ts` and `primitives/use-descendants.ts`
are the two a grid needs, already exercised by Menubar, Tabs, Toolbar and SegmentedControl.

## Decision

**Option 3 — the native field, plus a scoped `Calendar` — with option 2 as a documented recipe and
option 4 rejected.**

1. **`DateInput`** (and its `FormDateInput` twin): a styled native `input[type=date]` on the `Input`
   recipe. The browser holds the value; tokens style the closed field; the popup stays the engine's,
   and the docs say so. **The platform's indicator is kept, and no button of ours is added beside
   it** — on Firefox both would show, and a duplicate affordance is exactly the element
   [ADR-0016](./0016-minimal-semantic-markup.md) refuses. `showPicker()` stays available to a
   consumer who wants their own trigger. Same recipe for `type="time"` when asked.
2. **Memorable date is a recipe, not a component.** `Fieldset` + three `Input`s already composes it;
   the docs show it, with field order from `Intl.DateTimeFormat.formatToParts`, and stop there. A
   wrapper would be an app-content decision — which fields, which validation copy — in DS costume.
3. **`Calendar` is built**, and the reason is the ceiling above rather than dissatisfaction with the
   field: per-date disabling is the thing the platform does not offer and will not. It ships
   standalone (a booking UI wants a bare calendar), composes with `Popover` for the picker form, and
   **sets the `DateInput` rather than replacing it** — the field remains the field.
4. **Option 4 stays rejected**, and not on cost: a segments model re-homes the value into React by
   construction, which contradicts the measured decision that the browser holds control state.

### What `Calendar` v1 is, and is not

Non-goals are as binding as goals, so they are written here rather than discovered later:

- **Gregorian only.** Formatting is `Intl`'s; the grid arithmetic is ours and is Gregorian.
- **A civil date.** `{y, m, d}`. No time, no timezone, no `Date` object in the arithmetic.
- **One date.** Range selection is a later step with its own justification — it is where the cost
  curve turns, and it is what MUI charges for.
- **`firstDayOfWeek` is a prop**, defaulting to what `getWeekInfo()` reports where it exists, and to
  a stated fallback where it does not.
- **`isDateDisabled` is the point.** A predicate per date is the capability the native field lacks;
  without it this component has no reason to exist.

## Consequences

- **Positive.** A date answer exists immediately (`DateInput` is an afternoon on an existing
  archetype), and the expensive component is scoped to the one thing the platform refuses. Range
  selection stays reachable later without being paid for now.
- **Negative, and real.** We now own an APG grid: roving focus over a re-rendering surface, month
  announcements, and the tests to keep them honest. At this package's standard — a11y first, axe in
  both themes, an adversarial review before merge — this is days, not an afternoon, and the review
  will find defects the way it did on `InputGroup` and `Table`.
- **The popup's brand parity is traded away** for the native field, deliberately: the closed field is
  themable, the open panel is the engine's. Consumers who need one look everywhere use the
  `Calendar` in a `Popover`.
- The roadmap's date-picker line points here once this is accepted, and `Calendar` moves out of
  **Deferred** when it ships.

## What would change this

`::picker()` gaining a spec for date inputs would make the native popup themable and shrink what
`Calendar` is for — worth watching, and it does not block anything today. Temporal reaching Baseline
Widely would simplify the arithmetic we are about to write, but it no longer gates it. A consumer
needing a non-Gregorian grid reopens the scope boundary above, and that is the one that would need a
new ADR rather than an amendment.

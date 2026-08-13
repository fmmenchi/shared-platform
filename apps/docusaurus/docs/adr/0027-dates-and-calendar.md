# ADR 0027 — Dates: one field of ours, and a Calendar for what it cannot do

- **Status:** proposed
- **Date:** 2026-08-12 · amended 2026-08-13
- **Deciders:** Fabio Menchicchi

> **This replaces an earlier draft** (written 2026-08-11, never proposed, so never part of the
> record) which reached the same conclusion about the field and a stricter one about the calendar:
> it gated `Calendar` on **Temporal reaching Baseline Widely**. That gate does not survive
> measurement and is withdrawn below, with the reasoning, because a decision that defers on a false
> constraint is worse than no decision — it looks principled.

> **Amended 2026-08-13, while still `proposed`.** A third ceiling was found after the first version
> was written: the native field cannot follow the locale the design system was **given**, which is
> the locale every other formatted thing on the page follows. It does not add a component — it
> **changes what `DateInput` is**. The first version made `DateInput` a veneer over
> `<input type="date">`; this one gives the name to GOV.UK's "memorable date", three labelled native
> fields in the declared locale's order, promoted from a documented recipe to a component with the
> ordinary `FormDateInput` twin beside it. The platform's own control is neither wrapped nor blocked:
> it stays one line away as `<Input type="date" />`, with its trade written on `Input`'s page, because
> wrapping it would have meant recommending a field that is correct only while an external fact holds
> and silently wrong afterwards. `Calendar` is unchanged, and the segmented box is still rejected
> though for a reason the first version got wrong.

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
4. a fully custom **segmented field** — one box whose parts are spinbuttons, the react-aria shape —
   plus `Calendar` and `Popover`.

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
while the **display** follows the **browser's** locale — month names, field order, numbering system
— with no i18n dependency; on touch it opens the OS sheet, which beats any JS calendar; and the
browser holding the value is the same contract this package already measured and chose for `Input`,
`Checkbox` and `Switch`. Read that sentence twice, because the browser's locale is not necessarily
the design system's, and the third ceiling below is the whole of what follows from the difference.

## The ceiling, and it is a real one

- **No per-date disabling.** `min`/`max` are an interval, not a set. "Only these slots", "never on a
  Tuesday", "these three days are booked" are not expressible. This is the limit that decides.
- **The open popup belongs to the engine**, looks different in each, and cannot be themed.
  `::picker()` / `appearance: base-select` is Chromium-only, applies to `<select>`, and extending it
  to date inputs is an open Open UI discussion with no spec — under this workspace's Baseline Widely
  bar that door stays shut for years.
- **The field does not follow the design system's locale, and cannot be made to.** This is the third
  ceiling, found after the first draft and the most visible of the three, because it shows on every
  page rather than only in a booking flow.

  The design system's locale is **declared, mandatory, and never derived from the browser**. It
  arrives on the `i18n` adapter, and `UiProvider` throws when the outermost one omits it — there is
  no fallback to `navigator.language`, by design. That is the locale `useFormatter()` reads, and
  therefore the one `Time`, `Numeric` and every formatted `Table` column already agree on. The native
  field's segment order is the **browser's** — in practice the operating system's regional format —
  and nothing on the page reaches it. So the two are not merely allowed to diverge: nothing whatever
  holds them together.

  Measured: typing `1 2 0 8 2 0 2 6` into three fields wrapped in `lang="en-US"`, `lang="it-IT"` and
  `lang="ja-JP"` yields the same `2026-08-12` in all three, so `lang` moves nothing — and the
  provider does not write `lang` on the tree to begin with, since it carries only `dir` and
  `data-theme`. Worse for any repair short of replacement: the engine reported `en-US` through `Intl`
  while ordering the segments day-first. The order does not come from the locale JavaScript can
  _read_, so we cannot render a hint that matches the field, let alone impose one on it.

  Where the declared locale and the browser's happen to agree, everything lines up and the native
  field is right. When they diverge, one page shows `12/08/2026` in a cell and the other order in the
  field beside it, and there is no repair on the native side.

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

  This is not a double standard against the provider next door, which **refused** the neighbouring
  `Intl.Locale.prototype.getTextInfo` on the same Baseline grounds and derives direction from the
  locale's script instead. The difference is what failure costs. A wrong `dir` breaks the page and no
  prop rescues it, so direction needed an answer that always works. A week that starts on the wrong
  day is a preference, visibly wrong to exactly the person who can state the prop that fixes it.

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

**Option 2, promoted from a recipe to a component and its bound twin, is the design system's date
entry. Option 3's `Calendar` is built. The native input of option 1 keeps no component of ours.
Option 4 stays rejected — for a different reason than the first draft gave.** The third ceiling above
is what changed, and the measurement below is what makes the promotion affordable.

The pair is the ordinary one — `DateInput` and `FormDateInput`, the same shape as `Input`/`FormInput`
and `SegmentedControl`/`FormSegmentedControl`. **The name `DateInput` belongs to ours**, not to a
veneer over the platform's control, and the two points below say what each half holds.

1. **`DateInput` — the primitive, and it is bare.** Three labelled numeric fields in the order the
   declared locale gives, plus one carrier holding the ISO value. It owns **no legend**, exactly as
   `SegmentedControl` owns none: naming a group is the composition's job, and this package already
   draws that line for every group control it ships. It is GOV.UK's "memorable date", and the earlier
   draft left it a documented recipe on the
   grounds that "which fields, which validation copy" is app content. That was right about the copy
   and wrong about the order: **the field order is not app content, it is a locale question**, and it
   is the one the design system has to answer for a page to be consistent with itself. It is also the
   only date entry that can agree with `Time`, `Numeric` and a formatted `Table` column standing
   beside it.

   The order comes from `Intl.DateTimeFormat(locale).formatToParts()` — Baseline, and already used in
   this workspace by `toMachineDate` — so `it` gets day-month-year and `en-US` month-day-year, read
   from the locale the provider was **given** rather than the one the browser happens to have.

   **The anatomy stays native the whole way down.** Three ordinary `<input inputmode="numeric">`,
   each with its own `<label>`, placed in the locale's order. No roving focus, no `role="spinbutton"`,
   no keyboard of ours: Tab moves between them because they are three real fields,
   `autocomplete="bday-day"` and its siblings reach them, each is announced without being told how,
   and every one of them is a control the browser draws and owns. It composes `Input`, which already
   ships, and that is what makes the promotion affordable at all.

   The part labels — "Day", "Month", "Year" — belong to the primitive, because they are its anatomy
   and their **order** is the locale's. The name of the whole thing does not: that is a `<legend>`,
   and a legend belongs to whoever wraps the control, exactly as it does for a radio group or a
   segmented control. Unwrapped, `DateInput` is a group with no name, which is what a bare
   `SegmentedControl` is too.

   **`ref` has a home here, and that is one place this beats its group-shaped siblings.**
   `FormSegmentedControl` declines to forward `ref` on the grounds that "there is no 'the input' of a
   radio group", so an error summary cannot focus it. This has three real fields, and the answer is
   the **first visible part** — never the carrier, which is `hidden` and therefore not focusable, and
   a `ref` pointed at an unfocusable element is the same failure wearing a prop.

   **What the component adds over the recipe is one `name`.** The recipe posts three fields and
   leaves the app to recombine them; the component posts one ISO value, and the way it does that was
   measured rather than assumed:

   - the three visible fields are ordinary uncontrolled `<input>`s, each holding its own digits;
   - one **carrier** holds the ISO value under the field's `name`, written with the native value
     setter and a dispatched `input` event.

   The carrier is a text input hidden with the **`hidden` attribute**, not `type="hidden"`, and that
   difference is the whole design. Measured, in plain DOM as well as through React: `form.reset()`
   restores a text input and a date input and does **not** restore a `type="hidden"` one — so a
   `type="hidden"` carrier would survive a reset holding a stale value while the fields beside it
   went back, which is worse than either. React also declines to wire `onChange` on a `type="hidden"`
   input, so a `register()`-style binding would hear nothing from it. With the `hidden` attribute
   instead, all four properties hold: React hears the write, `FormData` carries one field under one
   name, `form.reset()` restores it, and it is neither focusable nor in the accessibility tree.

   So the browser still holds the value, `form.reset()` still works, and the form port still binds
   one name — the same contract [ADR-0013](./0013-form-controls-contract.md) draws for every other
   control here.

   **Overriding the language is a nested `UiProvider`, not a prop.** The mechanism already exists: a
   nested provider merges its adapters over the inherited ones, so declaring `i18n` again re-locales
   the subtree, and it costs no DOM — the wrapper element is elided when neither direction nor theme
   changes. A `locale` prop on `DateInput` alone would be worse in two ways that matter. It would let
   the field say `it` while the `Time` beside it says `en`, which is the exact mismatch this decision
   exists to remove; and it **cannot carry direction** — override to `ar` through a prop and the
   segments stay left-to-right, where the nested provider re-derives `dir` from the locale it was
   given. No component in this package takes a `locale` prop today, `Time` and `Numeric` included,
   and this is not the one to start with.

2. **`FormDateInput` — the bound twin, and it composes everything**, which is what the `Form*` layer
   is for in this package. `FormInput` wraps `Field` around `Input` with the description and the
   errors; `FormSegmentedControl` wraps `Fieldset` + `FieldsetLegend` + `FieldsetContent` around a
   bare `SegmentedControl` for the same reasons a group needs. This is the second shape, with nothing
   invented for it:

   ```tsx
   <Fieldset invalid={hasErrors}>
     <FieldsetLegend>{label}</FieldsetLegend>
     <FieldsetContent>
       <DateInput {...control} />
     </FieldsetContent>
     {hint}
     {errors}
   </Fieldset>
   ```

   The group is named **once**, by the legend, and `DateInput` is handed no label of its own — two
   names are announced twice, and the visible legend is the one worth keeping. The port's assumption
   of one control per field holds here rather than bending: the carrier gives `name` and `value` a
   single real home, its `input` event bubbles like any other, and `ref` reaches the first visible
   part. A consumer without a form library writes that same composition by hand, exactly as they do
   today for a radio group.

3. **The native `<input type="date">` keeps no component of ours.** `Input` is transparent, so it is
   one line away and it already looks right — measured: it lines up with a text field to the pixel,
   the tokens reach the closed control, `color-scheme` reaches the parts the browser paints, it wires
   into `Field`, `min`/`max` reach `ValidityState`, and the browser keeps the value across
   `form.reset()`. On touch it opens the operating system's date sheet, which beats anything we would
   draw. None of that is in question.

   What it cannot do is follow the declared locale, and a component of ours wrapping it would be one
   this package **recommends while knowing it contradicts the package's own locale contract**,
   guarded by a rule no component can check: _use it where the browser's locale is the user's_. That
   is a promise an app makes at one moment and stops keeping without anything breaking — a product
   ships in one language, adds a second a year later, and every such field already written turns
   silently wrong while every page keeps working and every test stays green. Nobody goes back to swap
   them, because nothing failed.

   So the trade is documented on `Input`'s page instead, where reaching for it is an explicit
   decision rather than a default the design system nudged a consumer into. The same goes for
   `type="time"`.

4. **`Calendar` is built**, and the reason is the first ceiling rather than dissatisfaction with the
   field: per-date disabling is the thing the platform does not offer and will not. It ships
   standalone (a booking UI wants a bare calendar), composes with `Popover` for the picker form, and
   **sets a field rather than replacing it** — the field remains the field. Its month and weekday
   names come from the same declared locale as everything else, through `useFormatter()`.
5. **Option 4 — the segmented box — stays rejected, and the first draft's reason for rejecting it was
   wrong.** That reason was "a segments model re-homes the value into React by construction"; the
   carrier above measures it false, and it is withdrawn along with the Temporal gate. What stands is
   the cost, and it is a different cost than it looks. Option 4 is not "three inputs in one border":
   it is one box whose parts are `role="spinbutton"`, with arrow keys that increment a value, typing
   that auto-advances, backspace that walks back, `aria-valuetext` per segment so a screen reader
   says "August" and not "08", and a focus ring drawn around parts that are not focus rings. That is
   a keyboard and ARIA contract we would own outright, for a compact single-box look **the platform
   already draws for free** through `<Input type="date" />`. It is not grid work — spinbuttons are
   cheaper than a calendar — but it is a **second** hand-written keyboard contract to carry beside
   the grid's, bought to reproduce a native control, and that is what
   [ADR-0016](./0016-minimal-semantic-markup.md) refuses. If a consumer arrives who
   needs the compact look _and_ the declared locale in the same field, that is a new decision with a
   real name attached, and this is the paragraph it reopens.

### Why the platform's control gets no component of ours

An earlier version of this amendment shipped two date fields: a component wrapping
`<input type="date">` and, beside it, the three-part one. Both were named, both were recommended, and
a rule told a consumer which to reach for. The rule is what killed it, and the reason is worth
recording, because the shape recurs.

A design system may ship a component with a **stated trade** (the `Select` list is the browser's; the
`Calendar` popup is ours). It may not ship a component with a **conditional defect**: correct while
one external fact holds, silently wrong after it changes, and impossible for the component to detect
either way. "Use it where the browser's locale is the user's" is that second thing. The condition
lives outside the component, outside the page, and outside the test suite, and it fails by staying
green.

So there is one field, and it is right on every page it appears on. The compact native control is
still there for anyone who wants it, under `Input`, where using it is an explicit decision instead of
a default the design system nudged them into.

`Calendar` is not a second field: it is the answer to per-date rules, and it sets whatever field it
is composed with.

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

### What `DateInput` v1 is, and is not

- **A civil date, same as `Calendar`.** `{ year, month, day }`, months 1–12 as a human and ISO 8601
  write them rather than `Date`'s 0-based ones, through the **one** parse/format pair `DateInput` and
  `Calendar` share. Two components, one vocabulary for a day — and that pair is the first thing
  built, because a date read back as `new Date('2026-08-12')` is the 11th of August in every timezone
  west of Greenwich, which is the defect this whole family exists to stop repeating.
- **Three numeric parts.** Day, month, year — the month as digits, not a name and not a `<select>`.
  The locale decides their **order** and their labels; it does not decide how many boxes there are.
- **Four-digit years.** No two-digit expansion: `26` is the year 26, or it is nothing. Guessing a
  century is app content, and a wrong guess is silent.
- **Constraint validation stays on the visible parts, never on the carrier.** A carrier that is
  `required` and empty would be an invalid control that cannot be focused, and a browser asked to
  report on one refuses the submit without showing the user anything — a form that does nothing when
  clicked. This is stated from the platform rather than measured here, and it is the first thing to
  measure when the component is built.
- **An incomplete or impossible date empties the carrier.** The parse refuses `2026-02-30` rather
  than sliding it to 2 March the way `new Date` does; the field inherits that refusal instead of
  inventing a value to carry.
- **Not a time field, and not a range.** Both are separate decisions with their own justification.

## Consequences

- **Positive: the catalogue gains one date field, and it is right everywhere it appears.** No rule to
  learn, no page that has to warn a reader about the page next door. The expensive component stays
  scoped to the one thing the platform refuses, and range selection stays reachable later without
  being paid for now.
- **Negative, and the sharp end of this amendment: there is no date answer until `DateInput` ships.**
  The native control is one line away and the docs point at it, but the design system's own answer is
  now days of work rather than the afternoon a veneer over `<input type="date">` would have cost.
  That is the price of refusing a conditional defect, and it is paid up front.
- **`DateInput` is cheap but not free.** No keyboard of ours and no ARIA of ours, but there is real
  work in the carrier: writing it through the native value setter, keeping it empty when the parts do
  not name a day, and proving under test that `FormData`, `form.reset()` and a `register()`-style
  binding all still see exactly one field. Days rather than an afternoon, and most of it in tests.
- **We now own an APG grid** for `Calendar`: roving focus over a re-rendering surface, month
  announcements, and the tests to keep them honest. At this package's standard — a11y first, axe in
  both themes, an adversarial review before merge — this is days, and the review will find defects
  the way it did on `InputGroup` and `Table`.
- **`Input`'s page takes on a caveat it did not have**: what `type="date"` gives, and what it costs
  on a page whose language the app declares. A component page that documents a trade is the honest
  place for it — a component that hides the trade behind a name is not.
- The roadmap's date-picker line points here once this is accepted, and `DateInput` and `Calendar`
  move out of **Deferred** when they ship.

## What would change this

`::picker()` gaining a spec for date inputs would make the native popup themable and shrink what
`Calendar` is for — worth watching, and it does not block anything today. Temporal reaching Baseline
Widely would simplify the arithmetic we are about to write, but it no longer gates it.

A way for the page to tell the native field which locale to lay its segments out in would collapse
the third ceiling, and with it both halves of this amendment: the reason `DateInput` has three parts
instead of one, and the reason the platform's control is documented rather than wrapped. It would
make a one-tag date field correct unconditionally, which is what it was always wanted for. That is
the change to watch for, and there is no proposal for it.

A consumer who needs the compact single-box look **and** the declared locale in one field reopens the
segmented box, on the cost argument rather than the withdrawn one. A consumer who needs one date in a
different language from the page around it reopens the `locale` prop — a nested provider is the
answer until someone shows a case it cannot express. A consumer needing a non-Gregorian grid reopens
the scope boundary above, and that is the one that would need a new ADR rather than an amendment.

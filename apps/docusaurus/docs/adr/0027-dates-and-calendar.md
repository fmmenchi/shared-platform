# ADR 0027 — Dates and times: fields of ours, and a Calendar for what they cannot do

- **Status:** proposed
- **Date:** 2026-08-12 · amended 2026-08-13, 2026-08-15
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
> `<input type="date">`; this one gives the name to a field of ours — one masked text input that
> shows a date in the declared locale's order and stores ISO — promoted from a documented recipe to a
> component with the ordinary `FormDateInput` twin beside it. The platform's own control is not wrapped **and no longer
> reachable through `Input`**: `type="date"` is refused, because a field that is correct only while an
> external fact holds and silently wrong afterwards is not something to recommend _or_ to leave lying
> in reach. That refusal is the first exception to [ADR-0013](./0013-form-controls-contract.md)'s
> transparency, and it ships together with `DateInput` rather than before it. `Calendar` is unchanged,
> and the segmented box is still rejected though for a reason the first version got wrong.

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

1. **`DateInput` — one text field, masked, in the order the declared locale writes a date.** Plus one
   carrier holding the ISO value. GOV.UK's "memorable date" is where this started and it is not where
   it landed: **three boxes became one**, on the plain ground that a date field should look like a
   field. What survived the change is the part that mattered — the earlier draft left this a
   documented recipe on the grounds that "which fields, which validation copy" is app content, and
   that was right about the copy and wrong about the order. **The field order is not app content, it
   is a locale question**, and it is the one the design system has to answer for a page to be
   consistent with itself.

   The order, the separator and the numerals all come from
   `Intl.DateTimeFormat(locale).formatToParts()` — Baseline, and already used in this workspace by
   `toMachineDate` — read from the locale the provider was **given** rather than the one the browser
   happens to have. So `it` writes `12/08/2026`, `en-US` `08/12/2026`, `de` `12.08.2026` and `ar-EG`
   `١٢/٠٨/٢٠٢٦`, and every one of them stores `2026-08-12`.

   **The calendar is pinned to Gregorian, and that pin does less than it first appears** — which is
   worth stating precisely, because an earlier draft of this paragraph claimed more. Measured: for
   `th-TH` and `fa-IR` the pinned and unpinned patterns have the same parts, the same order and the
   same literals, and differ only in the year VALUE — which this component discards, since it fills
   the frame from its own ISO parse. What the pin actually removes is the **era**: unpinned,
   `ja-JP-u-ca-japanese` yields an `era` part and `zh-TW-u-ca-roc` a `民國`, so the field would have
   shown `R2026/08/12` — a Gregorian year stamped with an era that contradicts it.

   What the pin cannot do is reconcile the YEAR, and that gap is the scope boundary showing through:
   on a `th-TH` page a `Time` renders 2569 and this field renders 2026 for the same day, so a user who
   types the year they just read stores a date 543 years out. There is no repair inside a Gregorian
   component — the honest answer is to **say so**, and the component warns in development when the
   locale in scope resolves to a calendar it does not implement.

   The numerals are deliberately **not** pinned, for the same reason the order is not: an `ar-EG` page
   renders `١٢` in every cell, and a field beside them showing `12` would be this ceiling one layer
   down. The bidi marks in the separators are kept for the same reason — they are what put the three
   groups in the right visual order, and `Time` has them.

   **A mask, because a date field should not accept what is not a date.** Only digits survive — the
   locale's or ASCII — and the separators are put back from the pattern, so `12082026` becomes
   `12/08/2026` on its own and a letter cannot be typed at all. A digit that would make a part
   impossible is refused and **not consumed**, so it starts the next part instead: `5` then `9` is the
   5th, then September. Both ends are enforced, because a ceiling alone let `00/00/2026` be typed in
   full — complete-looking, storing nothing. What the mask does not decide is whether the whole date
   exists: 30 February can be typed and is simply not stored, since blocking it mid-edit would mean
   refusing the `3` of a `30` on its way to March.

   **It is one field, so it composes like `Input`**: a `<label>` names it, a `Field` wires
   `aria-describedby` and `aria-invalid`, and there is no `<fieldset>` and no legend — those belong to
   controls that are a group, like a radio set or a `SegmentedControl`.

   **What the user sees is never what the form posts, and the carrier is how.** The visible field
   holds the localised text; one **carrier** beside it holds the ISO value under the field's `name`,
   written with the native value setter and a dispatched `input` event. A server therefore never
   receives `12/08/2026` and has to guess which number is the month.

   The carrier is a text input and never `type="hidden"`, and that part was measured, in plain DOM as
   well as through React: `form.reset()` restores a text input and does **not** restore a
   `type="hidden"` one — so a `type="hidden"` carrier would survive a reset holding a stale value
   while the field beside it went back. React also declines to wire `onChange` on `type="hidden"`, so
   a `register()`-style binding would hear nothing from it.

   It is hidden by **CSS** rather than by the `hidden` attribute, and taken out of the accessibility
   tree by `aria-hidden`, because it has to stay **focusable**. An earlier version used `hidden` and
   that cost it two things that only showed up under a real form library: react-hook-form's
   `register()` reads the value off the element its ref was handed, and `FormErrorSummary` finds a
   field by `name` — which is here — and calls `focus()` on it. Focused, the carrier hands focus
   straight to the visible field, so it is never where the caret rests.

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
   is for in this package. It is `FormInput`'s shape with a different control inside, because
   `DateInput` is one text field:

   ```tsx
   <Field label={label} invalid={hasErrors}>
     <DateInput {...binding} />
     {hint}
     {errors}
   </Field>
   ```

   The port's assumption of one control per field holds here rather than bending, which is where the
   group-shaped adapters have to give something up: the carrier gives `name` and `value` a single real
   home and its `input` event bubbles like any other.

   **`ref` is the one place this needs two of something**, and pretending otherwise cost a whole
   afternoon. A binding's ref has to reach the element whose `value` IS the field's value, which is
   the carrier — react-hook-form reads `.value` straight off the element it was handed, so the visible
   field would give it `12/08/2026`. Focus wants the other node. Forwarding neither, which is what
   `FormSegmentedControl` does for its own reasons, turned out to be the worst of the three: measured
   against react-hook-form, `_formValues` held `undefined` for the field however much was typed, for
   ever, while `FormData` looked perfectly correct. So there are two — `carrierRef` for the binding,
   `ref` for the visible input — and the carrier is focusable precisely so `FormErrorSummary` can
   still reach the field by `name`.

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

   **So `Input` refuses it.** Documenting the trade was the weaker half-measure: it leaves the
   default reachable by anyone who did not read the page, which is everyone in a hurry. `type="date"`
   is removed from `Input`'s surface, and `FormInput` inherits the refusal because its props derive
   from `Input`'s.

   The mechanism is two things, because one is not enough and that was checked rather than assumed.
   React types `type` as `HTMLInputTypeAttribute`, whose union **ends in `(string & {})`** — so
   `Exclude<HTMLInputTypeAttribute, 'date'>` removes nothing and `type="date"` stays assignable. An
   `Omit` alone would be decoration. What refuses it is an **explicit allowlist** of the native types
   `Input` accepts, plus a **`useDevWarning`** for what no type can see: a spread, a JavaScript
   caller, a value widened to `string`. The warning names the replacement rather than only the
   refusal.

   This is an **exception to [ADR-0013](./0013-form-controls-contract.md)**, whose whole contract is
   that these controls spread arbitrary props, and it is the first one. It is recorded there as well
   as here, because a reader of that ADR must not learn about it from a type error. The exception is
   narrow on purpose: `Input` still accepts `type="checkbox"`, `type="range"` and `type="radio"`
   though `Checkbox`, `Slider` and `Radio` exist, because those are merely duplicative. `type="date"`
   is the only one that is **wrong on the page** rather than redundant.

   **It lands with `DateInput`, not before.** Refusing the platform's control while offering no
   replacement would take date entry away and give nothing back. `type="time"` is untouched for the
   same reason — there is no time field to send anyone to, and refusing it would be the same mistake.

4. **`Calendar` is built**, and the reason is the first ceiling rather than dissatisfaction with the
   field: per-date disabling is the thing the platform does not offer and will not. It ships
   standalone (a booking UI wants a bare calendar), composes with `Popover` for the picker form, and
   **sets a field rather than replacing it** — the field remains the field. Its month and weekday
   names come from the same declared locale as everything else, through `useFormatter()`.

   > **Amended.** This point said the picker "is not a new component" and left the composition to the
   > consumer. It is now `DatePicker` — see [the amendment below](#amendment-the-picker-is-a-component).
   > `Calendar` itself is unchanged, and still ships standalone.

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

So there is one field, and it is right on every page it appears on. The first version of this
amendment stopped there and left the native control reachable under `Input` with the trade
documented — which is the same answer one notch weaker: a caveat on a page only protects the people
who read the page, and the default stays one keystroke away for everyone in a hurry. `Input` refuses
`type="date"` instead, and the refusal ships with the replacement so that nothing is taken away
empty-handed.

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
- **One field, three parts inside it.** Day, month and year, the month as digits — not a name and
  not a `<select>`. The locale decides their **order**, their **separator** and their **numerals**;
  it does not decide how many boxes there are, and the answer is one.
- **Gregorian, pinned.** The pattern is asked for with `calendar: 'gregory'` rather than taken as the
  locale leaves it, because unpinned it is not a missing feature but a wrong answer: a Buddhist frame
  filled with Gregorian numbers stores a date 543 years out and says nothing.
- **Four-digit years.** No two-digit expansion: `26` is the year 26, or it is nothing. Guessing a
  century is app content, and a wrong guess is silent.
- **Constraint validation stays on the visible field, never on the carrier.** A carrier that is
  `required` and empty would be an invalid control that cannot be focused, and a browser asked to
  report on one refuses the submit without showing the user anything — a form that does nothing when
  clicked. The consequence is worth stating too: `required` therefore checks the TEXT and not the
  value, so a half-typed date satisfies it. A field that looks filled and posts nothing is the app's
  to catch, as ADR-0013 has every other validation question be.
- **The seed is ISO or it is refused.** `defaultValue` takes `YYYY-MM-DD` — the shape it stores, not
  the shape it shows — and anything else leaves the field empty with a warning in development, rather
  than being carried to the server verbatim.
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
- **`Input` stops being fully transparent**, and that is a real cost paid to a real defect. One
  `type` value is refused, `ADR-0013` carries the exception beside its own contract so nobody meets
  it as a type error first, and the allowlist has to be extended by hand the day the platform adds an
  input type. Narrow, stated, and the first of its kind — which is exactly why the next one must
  argue for itself rather than cite this.
- The roadmap's date-picker line points here once this is accepted, and `DateInput` and `Calendar`
  move out of **Deferred** when they ship.
- **Two more components in the catalogue** than this amendment first planned, and their cost is
  ongoing rather than one-off: `DatePicker` and `FormDatePicker` have to keep up with every prop
  `DateInput` and `Calendar` grow. The alternative was a five-step recipe that its own authors got
  wrong twice, so the trade is a maintenance cost bought with a correctness one — but it is a real
  cost, and a third preset would have to argue for itself rather than cite these.

## Amendment: the picker IS a component

Decision point 4 said the picker form was a composition and not a new component: `Popover` +
`Calendar` + `DateInput`, wired by `carrierRef` and `writeDateInput`, both already exported. That was
written before the three of them had ever been assembled. They have been now, and the claim did not
survive contact.

**The recipe has five steps, and each one fails silently when it is missed.**

1. Write the field with `writeDateInput`, never `carrier.value = …` — a plain assignment updates the
   DOM and tells nobody, because React's value tracker absorbs it.
2. Pass `onDateChange` back, or a date TYPED into the field never reaches the grid and the popover
   reopens highlighting a day the field no longer holds.
3. Move `month` with the value, or that highlight lands on a day the grid does not draw and the
   popover opens showing nothing selected at all.
4. Do not nest a `Button` inside `PopoverTrigger`, which is one — two tab stops for one affordance,
   and `nested-interactive` from axe.
5. In a form, `carrierRef` is the binding's and cannot be redirected, so the write goes through the
   library's own lever instead.

Three of those were found in one afternoon **by the people who wrote the parts**, two of them by
watching the thing misbehave on screen rather than by reading the code. A recipe whose authors get
three steps out of five wrong on first assembly is not documentation, it is a trap with a nice page.

An adversarial review of the components that replaced it then found the SAME class of failure one
storey up: the picker held the selected day in React state and never re-read the carrier, so a
`setValue`, a `reset` or a `writeDateInput` left the grid on a date the field no longer held. The
repair belonged in `DateInput` — an external write now reports through `onDateChange` like any
other — which fixes the hand-composed recipe as well. That is the argument for the component
restated by evidence: the failure recurs at every level where the knowledge is held by hand.

**Step 3 is the one that settles it.** The obvious repair was to make `Calendar` follow its own
`value` into the right month. It cannot: writing that state in an effect fights the navigation the
user just made, and the tab stop has to move with the month — a plain `useState` setter, which the
`react-hooks` lint refuses in an effect body. (An earlier version of this paragraph also said
`useControlled` forbids it by contract. That was wrong and is withdrawn: a later review measured a
`useControlled` setter called from an effect producing zero lint errors, and the primitive documents
only that its internal ref is never written during render.) The knowledge has no home in any
single part. It belongs to whatever holds the field and the grid together, and until now that was
the consumer, every time, from scratch.

So: **`DatePicker`** and its bound twin **`FormDatePicker`**, symmetric with `Input`/`FormInput` and
`DateInput`/`FormDateInput`.

- **A preset, not a variant.** This is the `DialogSimple` case rather than the `TabsSimple` one: it
  exists because it wires behaviour a consumer gets wrong, not because it saves typing.
- **Not a boolean on `DateInput`.** `<DateInput picker />` would make the primitive field import
  `Popover` and `Calendar` — the field depending on the overlay layer, and everyone wanting a plain
  masked input shipping a calendar they never render. A flag would also not stay one: `isDateDisabled`,
  `placement`, the trigger's icon and `firstDayOfWeek` all have to arrive somehow, and that is a
  second API growing inside the first.
- **Named `DatePicker`.** It is what MUI, React Aria, Ant and shadcn all call it, so it is what a
  consumer will search for. `DateInputPicker` names two of our implementation parts instead of the
  thing itself.
- **The parts stay exported and stay documented.** Anyone needing a shape the preset does not offer
  composes it, exactly as before; the preset removes no door.
- **The bound case gets simpler, not harder.** `FormDatePicker` renders the field itself, so it holds
  the carrier alongside the binding's ref through `mergeRefs`, and writes with `writeDateInput` —
  a real `input` event the library hears. No `setValue`, no library-specific lever, which the
  hand-composed version cannot avoid. So the components perform four of the five steps and
  **abolish the fifth**, rather than performing all five.

  That was written for REF-BASED libraries, and a later review measured what it missed. A
  CONTROLLED one — Formik, TanStack Form — hands over `value` and no ref at all, because it expects
  the value it holds to be rendered back; this family cannot render it back, since an ISO string in
  the box reads `2026-08-12` in every locale. So the value was folded into a one-shot seed and
  never followed: `setFieldValue` moved a `FormInput` beside it and left the date field and its
  carrier on the old date, and `FormData` posted one date while the library's state held another.
  `useBoundCarrier` now follows it onto the carrier, where the field is already watching, and
  `apps/ui-ports-validation` covers the date family against Formik as well as react-hook-form —
  the gap that let this ship, and the same gap the first date defect came through.

**`DateRangePicker` will be a sibling, not a flag on this one.** A range wants a different selection
model inside `Calendar` (two ends, a hover preview between them), two carriers, and constraints that
run between the fields rather than within one. Which is the last argument for this amendment:
`DatePicker` and `DateRangePicker` side by side is a coherent surface, while "a recipe" beside "a
component" is not.

## Amendment: the range, and what it costs the parts

The previous amendment ended by saying `DateRangePicker` would be a sibling rather than a flag. That
sentence named the conclusion and left the four decisions underneath it open. They are taken here,
before any code, because two of them change contracts that are already written.

### 1. `Calendar` learns a range. There is no second grid

`value` becomes `CivilDate | CivilRange | null`, where a range is `{ start, end }` and either end may
be `null` while a selection is half made.

The alternative — a `RangeCalendar` beside it, sharing `civil-math` — reads cleaner on the surface
and is the wrong trade. What a calendar costs is not the month arithmetic, it is the **APG grid
contract**: arrows across and down, Home/End, PageUp/PageDown with their year variants, a roving
focus that is a DATE rather than a cell so it survives the grid being replaced underneath it, the
month announced when it changes, and a focus effect that has to put the tab stop back on a node that
did not exist a render ago. That is the expensive part, and a second copy of it is a second thing to
keep correct.

**This is not a preference, it is the week we just had.** `DateInput` and `Calendar` were reviewed,
then changed, then reviewed again — and the second round found that a rule moved out of one of them
had left the other stealing the keyboard, and that three write paths reported to nobody. Two
components that must agree drift the moment one is edited alone. Two grids would be that, permanently.

The cost is stated rather than hidden: every prop whose meaning depends on the shape of the value —
`onValueChange`, `isDateDisabled`, `aria-selected` per cell — grows a conditional, and the types have
to make the wrong combination unrepresentable rather than merely unlikely.

### 2. Two carriers, two names. A range is two values and posts as two

`FormDateRangePicker` binds **two fields**, not one: `startName` and `endName`, each with its own
carrier holding its own ISO string, each submitted as one ordinary entry.

The alternative — one name carrying two values — breaks the promise the whole family is built on:
one field, one name, one value a server never has to parse. A `FormData` with two entries under
`stay` is a shape every backend reads differently.

**And this needs nothing from the form port**, which was not obvious and is worth recording: the
contract is `(name) => BoundField`, a hook called once per field, so two fields are two calls. An
earlier draft of this amendment claimed the port would have to change. It does not.

### 3. Which end is moving is said out loud

After the first click the grid is choosing an END, and a reader who cannot see the highlight has no
way to know that. So: the state is announced in the same polite region the month uses, the two ends
carry `aria-selected` while the days between them do not (they are `data-in-range`, a fill and not a
selection), and each cell's accessible name says which of the three it is.

This is the half a range adds that costs real work, and the half that is easiest to skip because
sighted testing never notices it missing.

### 4. A click before the start REWINDS, it does not refuse

Choosing a day earlier than the current start makes it the new start and clears the end, rather than
being rejected. Refusing is defensible and worse: the user's intent is unambiguous — they want a
range beginning there — and a control that answers a clear intent with nothing teaches people to
distrust it. Rewinding is also what the travel products people arrive from already do.

The end is then chosen by the next click. A single day chosen twice is a one-day range, not an error.

### What stays out

`min`/`max` nights, blackout ranges as opposed to blackout days, and two months side by side are all
NOT part of this. Each is a real product requirement somewhere and none of them is cross-app enough
to earn a place yet (ADR-0008). `isDateDisabled` already refuses days one at a time, which is the
primitive the rest would be built on.

## Amendment: time has the same ceiling, and the roadmap said it did not

This ADR left `type="time"` alone twice, and the roadmap wrote down why: _"it is **not** blocked the
way `type="date"` is: that refusal exists because a date's segment ORDER contradicts the declared
locale, and because there is a replacement to send people to. Neither is true of time yet."_

**The first half of that is false, and it was never measured.** Both halves are now.

### What the native time control does — measured

The same question this ADR asked of `type="date"`, asked of `type="time"`, in the suite's real
Chromium. Four `<input type="time" value="14:30">`, each wrapped in a `lang`, beside what `Intl`
writes for that same declared locale:

| declared locale | the native field draws | `Intl` writes |
| --------------- | ---------------------- | ------------- |
| `en-US`         | `14:30`                | `02:30 PM`    |
| `it-IT`         | `14:30`                | `14:30`       |
| `ja-JP`         | `14:30`                | `14:30`       |
| `ar-EG`         | `14:30`                | `٠٢:٣٠ م`     |

So on an `en-US` page a `Time` and a formatted `Table` cell say `02:30 PM` and the field beside them
says `14:30`; on an `ar-EG` page everything else is in Arabic numerals and the field is in Latin.
That is this ADR's founding complaint, reproduced for time.

Three further measurements, because the shape of the ceiling matters more than the fact of it:

- **`lang` moves nothing.** All four fields render identically and measure the same width — the same
  result the date section recorded, by the same method.
- **The hour cycle is not addressable.** There is no HTML attribute that asks for 12 or 24 hours,
  and `shadowRoot` is `null`, so there is nothing to write CSS on and nothing to set.
- **It does not even follow the locale the ENGINE reports.** `navigator.language` and
  `Intl.DateTimeFormat().resolvedOptions()` both say `en-US`, whose resolved `hourCycle` is `h12` —
  and the control still draws 24 hours. It follows the operating system's regional format.

That last one makes it **worse than the date case**, not equal to it. A developer whose OS matches
their page sees nothing wrong; the mismatch appears only for users whose settings differ from
theirs, which is the definition of a defect that ships.

### The decision, which is this ADR's own, applied again

1. **`TimeInput` is built**, and it is the same shape as `DateInput`: one masked text field that
   shows a time the way the declared locale writes it and stores `HH:mm` — the format the DOM, a
   database and `Temporal.PlainTime.from()` all want. The carrier machinery, the mask, the caret
   arithmetic and the external-write doors are the ones `DateInput` already has and paid for.
2. **`FormTimeInput` is its bound twin**, symmetric with every other pair here.
3. **`Input` refuses `type="time"`.** This is the SECOND exception to
   [ADR-0013](./0013-form-controls-contract.md)'s transparency, and it is granted on the same two
   conditions the first one was: the control is **wrong on the page** rather than merely duplicative,
   and there is a replacement to send people to. The second condition is what was missing when this
   ADR said _"there is no time field to send anyone to, and refusing it would be the same mistake"_.
   It is not missing now.

   The first exception's closing line stands and is honoured rather than cited: _"the next one must
   argue for itself rather than cite this."_ The argument above is a measurement, not a precedent.

### THE HOUR CYCLE comes from the locale, and can be overridden

`Intl.DateTimeFormat(locale).resolvedOptions().hourCycle` is the answer, read the same way
`DateInput` reads its segment order — so a page gets 12 or 24 hours because of what it declared, not
because of what the reader's laptop is set to.

A prop overrides it. An operations dashboard on an `en-US` page that wants 24 hours is a real
consumer, the choice is a design decision rather than a locale one, and forcing them to change the
page's locale to get it would be the tail wagging the dog.

**AM/PM is COPY, not formatting**, and goes in the catalogues beside the date field's `gg`/`mm`/`aaaa`
letters. `Intl` will tell you the day period for a locale, but what a 12-hour field shows in its
third segment while it is being typed into is a word in a language.

### SECONDS are opt-in, and precision is a prop rather than `step`

`step` on the native control is doing two jobs at once — it sets the granularity of the spinner AND
it decides whether a seconds segment exists — and it says both in seconds-as-a-number, so `step={1}`
meaning "show seconds" is a fact you have to know rather than read. A `precision` of `'minute'` or
`'second'` says the one thing this field needs to be told, and the stored value follows it: `HH:mm`
or `HH:mm:ss`.

### What is NOT built, and this is the part that differs from dates

**There is no `Clock`, and no time equivalent of `Calendar`.** The whole reason `Calendar` exists is
the first ceiling — `min`/`max` are an interval and not a set, so "these three days are booked"
cannot be said to the platform at all. For time that argument does not hold in the same way:

- the REGULAR case is expressible without a widget. "Every fifteen minutes from 09:00 to 17:00" is
  an arithmetic progression, and a consumer who wants to offer exactly those slots renders them —
  from their own data, which is where availability lives — as a `Select` or a list of buttons;
- the IRREGULAR case is not a grid. A calendar is a fixed structure the design system must draw
  because a month has a shape; a set of available times has no shape but its own list, and a list of
  a consumer's data is a consumer's component.

So a slot picker is composition, not a component here, and it stays that way until someone arrives
with a case that is neither of those two. **`min`/`max`/`step` remain available on `TimeInput`** for
validation, where they are honest, unlike on `DateInput` — a text field cannot enforce them, so the
range check belongs to the consumer's schema either way, and the ADR says so rather than pretending.

### `datetime-local`, `month` and `week` stay reachable, and that is a choice

They present locale-dependent segments too, so the ceiling is theirs as much as it is `date`'s and
`time`'s. They are not refused, and the reason is the condition this ADR set for the first
exception and honoured for the second: **there has to be a replacement to send people to.** There is
none for any of the three, and refusing a control while offering nothing takes the capability away.

What that costs is stated rather than left implicit: a page can still put a `month` field beside a
`Time` and get the same disagreement this amendment measured. If a consumer arrives with one, the
answer is another field of ours or nothing — not a fourth exception on its own.

### Consequences of this amendment

- **A second `Input` exception**, and the allowlist grows by one more hand-maintained entry. Stated
  again because it is the cost that compounds: the day the platform adds an input type, this list
  has to be extended by hand or the type is silently unavailable.
- **`Time` (the display component) and `TimeInput` must agree**, and now can — both read
  `useFormatter()`. Before this they could not, which was the defect.
- **The date family's machinery is reused rather than copied.** If the mask, the carrier or the
  external-write doors turn out not to generalise, that is a finding to record here rather than a
  reason to fork them — two copies of that code is the failure this repository has already measured
  twice, on `DateInput` and `Calendar`.

## Addendum: what building it actually found

Written **after** the amendment above, because four things came out of the build that the decision
could not have known, and one of them changes what the amendment claimed.

**The machinery generalised, and the extraction proved it.** `DateInput` went from 936 lines to 440:
`segments.ts` now holds the mask arithmetic — the flow mask, the positional deletion, the
right-anchored caret — parameterised by a frame, and `use-carrier-field.ts` holds the carrier and its
three external-write doors. Behaviour is unchanged and that is the evidence: 3528 tests and 157
ports-validation tests green before and after, with no test touched. One generalisation was needed —
**a literal is what the frame draws between the digits, not what the pattern fixed**, because a
twelve-hour field draws `AM` or `PM` there and the value decides which.

**Two defects came out of that shared code, and `DateInput` had both since it shipped.** Neither was
reachable from a date frame, which is the reason they survived three adversarial reviews:

- A deletion **inside a literal that is not touching a digit** removed nothing and re-emitted the
  same text — the key did nothing at all, for ever. Invisible while every literal was one character
  wide; a twelve-hour time ends in a WORD.
- **Right-anchoring the caret slipped one place left whenever the frame was already full**, because
  the mask drops the overflow off the right. Typing `1`,`7`,`4`,`5` at the head of a full `09:00`
  put the caret back at 0 after every keystroke, so each digit landed in front of the last and the
  field walked through `10:09`, `07:10`, `04:07` to `05:04`. On dates, `01011999` typed at the head
  of `12/08/2026` did the same. Four wrong-but-valid values from four keystrokes spelling a real one.

**The ISO recogniser could not come over, and that is the one place the two frames genuinely
differ.** `2026-08-12` is a shape nobody's locale types by hand, so `DateInput` can recognise it at
any keystroke. `14:30` is exactly what half the world's locales **draw**, so the same rule fired on
the field's own half-typed contents — jumping a seconds field to `09:30:00` on the fourth keystroke,
and silently committing AM on an `en-US` one. It now fires only on a paste, which the browser reports
outright via `inputType`.

**`Intl` had three surprises**, all measured across twenty locales before any code was written, and
each would have been a defect visible in one language and nowhere else: `ko-KR` writes the day period
**first** (`오후 02:30`); `fi-FI` separates with `.`; and **`h11` is a real cycle** — Japanese's —
which writes midnight _and_ noon as `00`, told apart only by 午前/午後. All four cycles `Intl` reports
are handled. The day period's two words come from `Intl` rather than from the message catalogue,
which is the one place this component departs from `DateInput`'s split: the field shows the reader
the very strings it will accept, in the script it will accept them in.

**And the day period is never defaulted.** Until it is chosen the field names no time and
`onTimeChange` reports `null` — `02:30` with an unspoken AM is a wrong-but-valid value, and an
unchosen period is exactly as incomplete as a half-typed minute.

### And what four adversarial reviews found after that

Twenty findings, on four separate fronts. Three are decisions rather than repairs and belong in this
record:

**An incomplete masked field is now an INVALID control, not an empty one.** `08/12/` reads as
unfinished; `02:30 AM/PM` does not — and the platform could not tell them apart, because the visible
input holds text while the carrier holds `''` and is deliberately not `required` (a required carrier
is a control the browser cannot focus, so the submit is refused showing nothing). Measured:
`<TimeInput required />`, four digits typed, `checkValidity()` **true** and the form posting an empty
string with no signal of any kind. The visible field now carries `setCustomValidity` while its text
names nothing, **which is what `input[type=date]` does with the same keystrokes** — a partially
filled native date input reports `badInput` and the browser stops the submit. It applies to the date
family too, and two `apps/ui-ports-validation` tests changed to match. A form whose library owns
validation sets `noValidate` and is untouched, which is the right split: the platform speaks only
where nothing else does.

**The day period is typed by three rules, not one, and the third is a toggle.** Swept across all 3846
locale tags `Intl` knows, a "characters one word has and the other has not" rule leaves the sets
EMPTY for `ak` (`AN`/`ANW`) and near-empty for `cs`, `sl`, `hsb`, `sr-ME` (`dop.`/`odp.`) — an Akan
user could not enter a morning time at all, and a Czech user no afternoon. So any other letter of
either word toggles. Toggling is worse than naming and infinitely better than refusing, and it is the
rule that makes the field complete rather than clever.

**`resolvedOptions().hourCycle` is not enough to know there is a day period.** `fr-CM` resolves `h12`
and draws none, which made `09:30` and `21:30` the same three characters. The cycle now follows the
PATTERN as well as the engine's answer.

The rest were defects, and the two worst were in the shared engine and therefore in `DateInput` since
it shipped — neither reachable from a date frame, which is why three reviews of it never saw them.
One inserted `0` in front of a part that already began with one discarded every part behind it (`09:00
AM` became the single character `0`); and the caret correction added above was itself one place short
wherever padding fires. Both are recorded where they live, with the measurement, and pinned by a
mutant in each field.

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

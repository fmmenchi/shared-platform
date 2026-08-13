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

   **The calendar is pinned to Gregorian**, and that is what the scope boundary below has to look
   like in code rather than only in prose. Left unpinned it was not a missing feature but a silent
   wrong answer: `th-TH` is Buddhist by default, so the field took a Buddhist frame and filled it with
   our Gregorian numbers — a user read `2569` off the `Time` beside the field, typed `2569`, and the
   carrier stored `2569-08-12`. The numerals are deliberately **not** pinned, for the same reason the
   order is not: an `ar-EG` page renders `١٢` in every cell, and a field beside them showing `12`
   would be this ceiling one layer down.

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

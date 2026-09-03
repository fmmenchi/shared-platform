---
title: 'Roadmap'
---

# Component roadmap

What `@fmmenchi/ui` ships today, what comes next, and what has been deliberately left out with the
reason. It lives with the code and a test keeps it honest — see [Keeping it true](#keeping-it-true)
at the bottom.

## Shipped

Grouped as Storybook groups them. A **part** (`FieldLabel`, `MenuItem`, `PopoverContent`) is a
sibling folder of its family and is documented on the family's page, not its own.

| Group             | Components                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Typography**    | `Heading`                                                                                                                                                                                                                                                                       |
| **Disclosure**    | `Accordion` (+ Item, Trigger, Content)                                                                                                                                                                                                                                          |
| **Buttons**       | `Button` · `Toggle` · `SegmentedControl` (+ Item) · `Toolbar` (+ Item, Separator)                                                                                                                                                                                               |
| **Inputs**        | `Input` · `ColorPicker` · `DateInput` · `DatePicker` · `DateRangePicker` · `Calendar` · `Textarea` · `Combobox` · `Select` · `Checkbox` · `Radio` · `Switch` · `Slider` · `ChoiceField` · `InputGroup` · `Field` (+ Label, Description, Error) · `Fieldset` (+ Legend, Content) |
| **Form adapters** | `FormInput` · `FormColorPicker` · `FormCombobox` · `FormDateInput` · `FormDatePicker` · `FormDateRangePicker` · `FormTextarea` · `FormSelect` · `FormChoice` · `FormSwitch` · `FormSegmentedControl` · `FormErrorSummary`                                                       |
| **Overlays**      | `Dialog` · `Popover` · `Tooltip` · `Menu` · `Menubar` (each with its parts)                                                                                                                                                                                                     |
| **Navigation**    | `Nav` (+ Group, Link) · `Tabs` (+ `Tab`, `TabList`, `TabPanel`) · `Pagination` · `Breadcrumb` (+ Link) · `Stepper` (+ Item)                                                                                                                                                     |
| **Layout**        | `AppLayout` (+ Main, Nav, NavColumn, NavDrawer) · `Card` (+ Title, Cover, Actions) · `SidePanel`                                                                                                                                                                                |
| **Feedback**      | `Alert` · `Toast` (+ Region) · `Progress` · `Skeleton`                                                                                                                                                                                                                          |
| **Data display**  | `Avatar` · `Badge` · `Tag` (+ `TagList`) · `Numeric` · `Time` · `Table` (+ Head, Body, Foot, Row, Cell, HeaderCell, Toolbar)                                                                                                                                                    |
| **Utilities**     | `VisuallyHidden` · `Separator`                                                                                                                                                                                                                                                  |

Several groups are one component wide, and thinness alone is not the signal — `Utilities` is
complete at one. **No group is now thin enough for the third question below to pick the next item
on its own**, which is why the section after it is a question rather than a queue.

## How the order is decided

Not by popularity. Three questions, in this order:

1. **Is there a native shell?** A component built on a platform element inherits behaviour we would
   otherwise write, test and get wrong — `<dialog>` gave us the focus trap, the inert background and
   `Escape` for free (ADR-0021). Those come first because they are cheap _and_ more correct.
2. **Is something already waiting on it?** A written contract that defers a decision to a component
   is the strongest possible reason to build that component.
3. **How thin is its group?** A design system with one Feedback component sends people to write
   their own.

## Next

**Open.** `Combobox` shipped, single-select, and with it the strongest of the
three questions below stops choosing: the four refusals `Select` had written
into its own docs now point at something that exists.

What is left of it is not a new item but the rest of this one, and ADR-0028
already decided the order: several-of-many with chips (which needs the
one-name-to-many-controls port shape, now merged), option groups, and the states
of data arriving. Those are commits on a shipped component rather than a
decision this page has to make.

`Tag` then shipped on the strongest reason this page has, the same one that
moved `Combobox`: a written contract waiting, three times over. `Badge`'s own
page had said since it shipped that "a clickable or removable badge is a
Tag/Chip (a real `<button>` with its own focus and label), not this component",
`select.mdx`'s table sent people to "a combobox with chips", and ADR-0028 named
the chips as the next commit on the combobox. The first of those now points at a
component by name; the other two point at the multi-select, which is UNBLOCKED
rather than done — a commit on a shipped component rather than a decision for
this page. What `Tag` cost is
recorded in [ADR-0035](../../adr/0035-a-tag-is-a-value-you-can-take-back.md),
because the boundary it draws — against `Badge` on one side and `Toggle` on the
other — is the kind that is easy to cross by accident.

So the two remaining questions are back to what they were:

1. **A native shell nobody has claimed yet.** `<details>` is taken by
   `Accordion`, `<dialog>` by `Dialog`, `<progress>` by `Progress`. `<meter>` is
   the one still unbuilt — a different claim from `<progress>` (a measurement
   inside a range, not a task advancing), which is exactly why it would need its
   own reason rather than inheriting this one's.
2. **How thin is its group?** No remaining group is one component wide, so it
   chooses nothing.

## Deferred, with the reason

Names leave this section when something moves them, and those reasons are kept because they are the
shape of what a deferral is actually worth. `Card` went first: the page shell made a grid of cards
the obvious next thing to put in a layout, and the one piece of it that is not trivial — a link that
is visually the whole card and semantically only its title — is worth owning once rather than six
times. `Separator` followed, the general-purpose `<hr>` its family separators (`MenuSeparator`,
`ToolbarSeparator`) were already pointing at. `Breadcrumb` and `Avatar` came with the page shell and
the table around them. `Slider` stopped being a bet on engines: `::-webkit-slider-thumb` and
`::-moz-range-thumb` still need writing twice, but they are writable, and the track is a background
this package already paints from a token. `Combobox` left on the strongest reason
this page has — a written contract waiting on it, four times over in `Select`'s
own docs — once ADR-0028 had answered what it costs and `appearance: base-select`
had been checked rather than assumed. And `Skeleton` — the one bullet here whose only reason was
"behind the others" — went when **Next** ran out of deductions: with no group left thin and no
contract waiting, the cheapest unblocked thing is the honest pick, and a reason that was never about
the component itself expires the moment the queue in front of it does.

- **`Text`.** Rejected rather than postponed. `Heading` states the admission test in its own source
  — _"splitting them is the only reason to wrap an element the platform already has"_ — and it earns
  its wrapper because `level` (the outline assistive tech navigates) and `size` (the visual step) are
  two decisions raw markup fuses into one, with the visual one winning. Body copy has no such
  fusion: a `<p>` carries no level and anchors no navigation, so making it larger or quieter
  corrupts nothing. "The other half of the pairing" is an argument from symmetry with other design
  systems, which ADR-0016 does not accept as a reason for an element. The two gaps it claimed are
  already closed — `baseline.css` gives the page `--fm-font-sans` and the foreground role, and
  `muted-foreground` is a contract role whose Tailwind bridge coverage `tokens.test.ts` enforces, so
  `text-muted-foreground` compiles. A `Text` would also reintroduce polymorphic `as`, which
  `Heading` refuses on purpose.
- **A time field.** The date line is finished: `DateInput`, `FormDateInput`, `Calendar`, `DatePicker`
  and `FormDatePicker` are all in the table above, and ADR-0027 records why each of them looks the
  way it does — including why the picker, first written as a composition, became a component. A time field is the
  same consideration on `type="time"` and waits for someone to ask. Note it is **not** blocked the way
  `type="date"` is: that refusal exists because a date's segment ORDER contradicts the declared
  locale, and because there is a replacement to send people to. Neither is true of time yet.
- **Date ranges.** `Calendar` picks one day, deliberately: a range is where the cost curve turns —
  two ends, a hovered preview between them, and a keyboard contract that has to say which end is
  moving — and it is the piece MUI charges for. It needs its own justification and its own ADR
  amendment, not a prop. When it comes it will be `DateRangePicker`, a **sibling** of `DatePicker`
  rather than a flag on it, for the same reason: two carriers, constraints that run between the
  fields rather than within one, and a selection model the single-day grid does not have.

## Keeping it true

A roadmap that drifts is worse than none, so this one is not maintained by discipline:
`src/test/roadmap.test.ts` fails when a component ships without appearing in **Shipped**, and when
something listed under **Next** or **Deferred** already exists in the tree. The same mechanism that
guards component docs guards this page.

When you build one of these, move its name into the table in the same commit — the test will tell
you if you forget.

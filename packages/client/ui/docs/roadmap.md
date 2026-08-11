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

| Group             | Components                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Typography**    | `Heading`                                                                                                                                                                            |
| **Disclosure**    | `Accordion` (+ Item, Trigger, Content)                                                                                                                                               |
| **Buttons**       | `Button` · `Toggle` · `SegmentedControl` (+ Item) · `Toolbar` (+ Item, Separator)                                                                                                    |
| **Inputs**        | `Input` · `Textarea` · `Select` · `Checkbox` · `Radio` · `Switch` · `Slider` · `ChoiceField` · `InputGroup` · `Field` (+ Label, Description, Error) · `Fieldset` (+ Legend, Content) |
| **Form adapters** | `FormInput` · `FormTextarea` · `FormSelect` · `FormChoice` · `FormSwitch` · `FormSegmentedControl` · `FormErrorSummary`                                                              |
| **Overlays**      | `Dialog` · `Popover` · `Tooltip` · `Menu` · `Menubar` (each with its parts)                                                                                                          |
| **Navigation**    | `Nav` (+ Group, Link) · `Tabs` (+ `Tab`, `TabList`, `TabPanel`) · `Breadcrumb` (+ Link)                                                                                              |
| **Layout**        | `AppLayout` (+ Main, Nav, NavColumn, NavDrawer) · `Card` (+ Title, Cover, Actions)                                                                                                   |
| **Feedback**      | `Alert` · `Toast` (+ Region) · `Progress`                                                                                                                                            |
| **Data display**  | `Badge` · `Avatar` · `Table` (+ Head, Body, Foot, Row, Cell, HeaderCell, Toolbar, ColumnResizer, FilterTrigger)                                                                      |
| **Utilities**     | `VisuallyHidden` · `Separator`                                                                                                                                                       |

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

**Open.** The two items this section named — `Table` and `Progress` — have both shipped, and with
them the third question above stops choosing: no remaining group is one component wide.

That leaves the first two questions to decide it, and neither has an obvious answer waiting:

1. **A native shell nobody has claimed yet.** `<details>` is taken by `Accordion`, `<dialog>` by
   `Dialog`, `<progress>` by `Progress`. `<meter>` is the one still unbuilt — a different claim from
   `<progress>` (a measurement inside a range, not a task advancing), which is exactly why it would
   need its own reason rather than inheriting this one's.
2. **A written contract waiting on a component.** Nothing in the tree currently defers a decision to
   a component that does not exist; the deferrals below are all deliberate refusals rather than
   queued work.

So the next item is a decision, not a deduction — and this page will say which, once it is one.

## Deferred, with the reason

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
- **`Combobox`.** Not an oversight — the trade is written into `Select`: the box is ours and the
  list is the browser's, because _"a themed list is what a combobox costs weeks for"_. Building one
  reverses that trade, so it needs an ADR before it needs code, and `appearance: base-select` may
  make part of it unnecessary.
- **`Skeleton`, `Pagination`.** Each is small and
  none is blocked — they are simply behind the items above, which either unblock a contract or fill
  an empty group. `Card` left this list ahead of its turn: the page shell made a grid of cards the
  obvious next thing to put in a layout, and the one piece of it that is not trivial — a link that
  is visually the whole card and semantically only its title — is worth owning once rather than
  six times. `Separator` left it too, the general-purpose `<hr>` its family separators
  (`MenuSeparator`, `ToolbarSeparator`) were already pointing at.
- **Date and time pickers.** The native inputs are inconsistent across engines and the hand-rolled
  ones are a calendar widget with a locale problem. Not before there is a real consumer.

## Keeping it true

A roadmap that drifts is worse than none, so this one is not maintained by discipline:
`src/test/roadmap.test.ts` fails when a component ships without appearing in **Shipped**, and when
something listed under **Next** or **Deferred** already exists in the tree. The same mechanism that
guards component docs guards this page.

When you build one of these, move its name into the table in the same commit — the test will tell
you if you forget.

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

| Group             | Components                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Typography**    | `Heading`                                                                                                                                                      |
| **Buttons**       | `Button`                                                                                                                                                       |
| **Inputs**        | `Input` · `Textarea` · `Select` · `Checkbox` · `Radio` · `ChoiceField` · `InputGroup` · `Field` (+ Label, Description, Error) · `Fieldset` (+ Legend, Content) |
| **Form adapters** | `FormInput` · `FormTextarea` · `FormSelect` · `FormChoice` · `FormErrorSummary`                                                                                |
| **Overlays**      | `Dialog` · `Popover` · `Tooltip` · `Menu` · `Menubar` (each with its parts)                                                                                    |
| **Navigation**    | `Nav` (+ Group, Link)                                                                                                                                          |
| **Layout**        | `AppLayout` (+ Main, Nav, NavColumn, NavDrawer) · `Card` (+ Title, Cover, Actions)                                                                             |
| **Feedback**      | `Alert`                                                                                                                                                        |
| **Data display**  | `Badge`                                                                                                                                                        |

Two groups are one component wide. That is where the gaps are, and the order below follows from it.

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

### 1. `Text` — the other half of the pairing

`Heading` shipped and brought the type scale with it: `--fm-text-*` and its
paired leading now exist, so the contract that was blocked is unblocked. What is
still missing is body copy — a `Text` for paragraphs and inline spans over the
same steps, with the tone roles (`muted-foreground`) a caller reaches for by hand
today.

### 2. `Switch` — native shell, real affordance gap

`<input type="checkbox" role="switch">`. Checkbox answers "is this included"; a switch answers "is
this on", and today a consumer building settings has to fake one. Native-first, so the state stays
in the DOM (see [Controlled and uncontrolled](./index.md)).

### 3. `Accordion` / `Disclosure` — native shell

`<details>` / `<summary>` gives open/close, keyboard operation and find-in-page for free. The
compound doctrine names it explicitly as a native-shell case rather than a hand-rolled one.

### 4. `Progress` — the Feedback group is one wide

`<progress>`, determinate and indeterminate. Cheap, and it stops Alert from being the whole of
Feedback.

### 5. `Table` — the Data display group is one wide

Semantic `<table>` with the parts (caption, header, body, sortable column headers). The largest of
the "next" items and the one most often re-implemented per app.

### 6. `Tabs` — hand-rolled, and knowingly so

No native shell exists: Context + a descendants registry + roving `tabindex`. It is the first
component that needs the descendants primitive, so it also settles that primitive's shape.

### 7. `Toast` — needs a queue and a live region

Transient feedback. Distinct from `Alert`, which is inline and permanent. Wants a decision about
where the queue lives before any code.

## Deferred, with the reason

- **`Combobox`.** Not an oversight — the trade is written into `Select`: the box is ours and the
  list is the browser's, because _"a themed list is what a combobox costs weeks for"_. Building one
  reverses that trade, so it needs an ADR before it needs code, and `appearance: base-select` may
  make part of it unnecessary.
- **`Slider`.** `<input type="range">` is native but its track and thumb are still barely stylable
  across engines. Revisit when that changes.
- **`Avatar`, `Separator`, `Skeleton`, `Breadcrumb`, `Pagination`.** Each is small and
  none is blocked — they are simply behind the items above, which either unblock a contract or fill
  an empty group. `Card` left this list ahead of its turn: the page shell made a grid of cards the
  obvious next thing to put in a layout, and the one piece of it that is not trivial — a link that
  is visually the whole card and semantically only its title — is worth owning once rather than
  six times.
- **Date and time pickers.** The native inputs are inconsistent across engines and the hand-rolled
  ones are a calendar widget with a locale problem. Not before there is a real consumer.

## Keeping it true

A roadmap that drifts is worse than none, so this one is not maintained by discipline:
`src/test/roadmap.test.ts` fails when a component ships without appearing in **Shipped**, and when
something listed under **Next** or **Deferred** already exists in the tree. The same mechanism that
guards component docs guards this page.

When you build one of these, move its name into the table in the same commit — the test will tell
you if you forget.

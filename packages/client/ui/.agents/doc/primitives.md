# Primitives (agent)

Internal component-building blocks in `src/primitives/` (NOT exported from the package). Hand-rolled,
no headless-behavior lib.

- **`PolymorphicProps<As, Own>`** (type) — props for an `as`-polymorphic component. Use it for the
  `as` prop everywhere: `type XProps<As extends ElementType = 'tag'> = PolymorphicProps<As, XOwn>`.
  Element props of `as` are typed (so `as="a"` allows `href`); don't apply tag-only attrs to the
  wrong element.
- **`mergeRefs(...refs)`** (util) — one callback ref that assigns several.
- **`useControlled({ value, defaultValue, onChange, name })`** (hook) — controlled/uncontrolled
  value + stable setter; dev-warns on controlled↔uncontrolled switch. **Only for a control WE draw**
  — see the rule below.
- **`useNativeProperty(ref, property, { value, initial })`** (hook) — writes a DOM PROPERTY React
  cannot set from props (`indeterminate`). `value` drives (written whenever it changes), `initial`
  seeds once. Nothing is written when neither is given, so a caller driving the element through its
  own ref is not stomped on.
- **`useDevWarning(active, message)`** (hook) — dev-only `console.warn` when `active`; no-op in
  prod. Put dev guards here, not in the component body (compute the condition at the call site).

## Controlled and uncontrolled: same API everywhere, two implementations

**Outwards, the API is always the pair** — `value`/`defaultValue`, `checked`/`defaultChecked`,
`open`/`defaultOpen`. The first drives, the second seeds; the call site chooses. No third value
prop, no invented name, no mode inferred from whether `onChange` was passed (an `onChange` is often
a pure side effect — analytics, a dependent field — and must not change what the value prop means).

**Inwards, who implements the pair depends on ONE question: do we draw the control?**

|                      | example                                                | who holds the state                       |
| -------------------- | ------------------------------------------------------ | ----------------------------------------- |
| the browser draws it | `Input`, `Checkbox`, `Radio` (native + `accent-color`) | the DOM. Pass the props to React and stop |
| we draw it           | a `Switch` with a custom knob, `Combobox`, `Tabs`      | React, via `useControlled`                |

If the browser paints the control, it paints from the DOM's own state, so a copy in the component
buys nothing — and costs two measured things: `form.reset()` becomes a **no-op** (React re-renders
its stale value straight back, breaking `<button type="reset">` and a form library's `reset(data)`),
and typing costs a render per keystroke instead of zero.

Note what this is NOT saying. React already GUARANTEES the binding between a `value` prop and the
DOM property — that sync is its contract, and a consumer driving a control from outside is already
fully served by `value` + `onChange`. What is unnecessary is the COMPONENT inserting itself as a
third holder between the consumer's state and the element.

Two things were tried here and reverted, both measured: **wrapping `onChange`** (a handler sits on
the element permanently, so React can never see that the consumer forgot theirs — its "controlled
without onChange" warning silently disappears), and **driving `value` from a ref** (silent unless it
dispatches a synthetic event, and no public library does it — checked against MUI `InputBase`,
Mantine `Input` and Base UI `FieldControl`, none of which hold a text value).

**Every component forwards a ref to its underlying element** — no exceptions. It must be as
reachable as the element it wraps: focus, measurement, anchoring an overlay, a form lib's `ref` all
need it. In React 19 the ref is a plain prop, so typing props with `ComponentPropsWithRef<'tag'>` (or
`PolymorphicProps`) and spreading `{...rest}` onto the element forwards it for free — never reach for
`forwardRef` or a wrapper HOC (that would hide the native element). The generator template ships a
ref-forwarding test, so the guarantee is enforced, not remembered. For a **composite** (wrapper +
inner control) the ref targets the primary interactive element (the control, not the wrapper).

Add a primitive only when a component actually needs it (YAGNI). Prefer native React (`useId`).

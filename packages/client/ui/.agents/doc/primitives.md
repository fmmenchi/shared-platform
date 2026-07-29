# Primitives (agent)

Internal component-building blocks in `src/primitives/` (NOT exported from the package). Hand-rolled,
no headless-behavior lib.

- **`PolymorphicProps<As, Own>`** (type) — props for an `as`-polymorphic component. Use it for the
  `as` prop everywhere: `type XProps<As extends ElementType = 'tag'> = PolymorphicProps<As, XOwn>`.
  Element props of `as` are typed (so `as="a"` allows `href`); don't apply tag-only attrs to the
  wrong element.
- **`mergeRefs(...refs)`** (util) — one callback ref that assigns several.
- **`useControlled({ value, defaultValue, onChange, name })`** (hook) — controlled/uncontrolled
  value + stable setter; dev-warns on controlled↔uncontrolled switch.
- **`useDevWarning(active, message)`** (hook) — dev-only `console.warn` when `active`; no-op in
  prod. Put dev guards here, not in the component body (compute the condition at the call site).

**Every component forwards a ref to its underlying element** — no exceptions. It must be as
reachable as the element it wraps: focus, measurement, anchoring an overlay, a form lib's `ref` all
need it. In React 19 the ref is a plain prop, so typing props with `ComponentPropsWithRef<'tag'>` (or
`PolymorphicProps`) and spreading `{...rest}` onto the element forwards it for free — never reach for
`forwardRef` or a wrapper HOC (that would hide the native element). The generator template ships a
ref-forwarding test, so the guarantee is enforced, not remembered. For a **composite** (wrapper +
inner control) the ref targets the primary interactive element (the control, not the wrapper).

Add a primitive only when a component actually needs it (YAGNI). Prefer native React (`useId`).

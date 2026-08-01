import type { ControlTag } from './form-adapter.types.js';

/**
 * Props that only an `<input>` accepts, and that an adapter emits anyway.
 *
 * This is not hypothetical. Conform's `getInputProps` is the only helper its
 * adapter can call for a field it was not told is a select — `FormFieldType`
 * had no member for one — and it emits `type`, `pattern`, `accept`, `min`,
 * `max`, `step` and `multiple` unconditionally, from the schema's constraints.
 * Measured: a `z.array(z.string())` field rendered
 * `<select multiple type="text" pattern="…" accept="…">`, and `multiple` flips
 * the element's role from `combobox` to `listbox` — so `getByRole('combobox')`,
 * the contract the docs and tests state, stopped holding.
 */
const INPUT_ONLY = [
  'type',
  'pattern',
  'accept',
  'min',
  'max',
  'step',
  'multiple',
  'checked',
  'defaultChecked',
  'capture',
  'alt',
  'src',
] as const;

/**
 * The adapter's bag, filtered for the control that will actually receive it.
 *
 * The port keys `control` by tag, but a TYPE cannot filter what an adapter
 * hands over at runtime — and the bag is built by code that does not know the
 * tag. So the component that renders the element drops what its element cannot
 * carry, which is the same shape as `withoutBindingOwned`: the type states the
 * rule, this keeps it where types do not reach.
 *
 * `input` is returned untouched — nothing is input-only for an `<input>`.
 */
export function forTag<T extends object>(tag: ControlTag, props: T): T {
  if (tag === 'input') return props;
  const kept = { ...props } as Record<string, unknown>;
  for (const key of INPUT_ONLY) delete kept[key];
  return kept as T;
}

import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * The two natives `Select` refuses, and why refusing them in the TYPE was not
 * enough.
 *
 * A JSX spread of a non-fresh object is not excess-property-checked, so
 * `<Select {...bag} />` compiles with `multiple` or `size` inside it — and that
 * spread is exactly the path `FormSelect` takes with the adapter's bag.
 * Measured: `multiple` reached the DOM and flipped the element's role from
 * `combobox` to `listbox`, and a numeric `size` was worse than ignored — cva's
 * default only fires on `undefined`, so it removed the height class and left
 * the control unsized.
 */
const REFUSED = ['multiple', 'size'] as const;

/** The consumer's props, minus the two this component does not implement. */
export function withoutRefused<T extends object>(props: T): T {
  const kept = { ...props } as Record<string, unknown>;
  for (const key of REFUSED) delete kept[key];
  return kept as T;
}

/** Dev-only: name what was dropped, and what to reach for instead. */
export function useRefusedWarning(props: object, numericSize: boolean): void {
  const record = props as Record<string, unknown>;
  const passed = [
    record['multiple'] === undefined ? '' : 'multiple',
    numericSize ? 'size' : '',
  ].filter(Boolean);

  useDevWarning(
    passed.length > 0,
    `Select: \`${passed.join('`, `')}\` ${passed.length > 1 ? 'are' : 'is'} not supported and was ignored. ` +
      'For several options use a Fieldset of Checkbox (a few) or a combobox (many); ' +
      '`size` here is the design system axis — `sm` | `md` | `lg`, not a row count.',
  );
}

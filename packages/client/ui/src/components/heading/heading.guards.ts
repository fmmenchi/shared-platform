import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * The two attributes that would overrule `level`, and why refusing them in the
 * TYPE is not enough.
 *
 * A JSX spread of a non-fresh object is not excess-property-checked, so
 * `<Heading level={2} {...bag} />` compiles with `role` or `aria-level` inside
 * it — the same hole `Select` documents. And these two do not merely arrive,
 * they WIN: measured, `role="presentation"` removed the heading from every role
 * query, and `aria-level={6}` had an `<h3>` announced as level 6. Both silently.
 *
 * `aria-level` is precisely a second way to choose the level, which is the same
 * reason this component has no `as`.
 */
const OVERRULING = ['role', 'aria-level'] as const;

/** The consumer's props, minus the two that would overrule `level`. */
export function withoutOverruling<T extends object>(props: T): T {
  const kept = { ...props } as Record<string, unknown>;
  for (const key of OVERRULING) delete kept[key];
  return kept as T;
}

/** Dev-only: name what was dropped, and why it could not be honoured. */
export function useOverrulingWarning(props: object): void {
  const record = props as Record<string, unknown>;
  const passed = OVERRULING.filter((key) => record[key] !== undefined);

  useDevWarning(
    passed.length > 0,
    `Heading: \`${passed.join('`, `')}\` ${passed.length > 1 ? 'were' : 'was'} ignored. ` +
      'Both overrule `level` — `role` removes the heading from the outline and ' +
      '`aria-level` renames its level — so the element would stop matching the ' +
      'document structure `level` exists to state. Change `level` instead.',
  );
}

import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * The two attributes that would overrule `level`, and why refusing them in the
 * TYPE is not enough.
 *
 * The type refuses `role`. It CANNOT refuse `aria-level`, ever: TypeScript does
 * not excess-property-check a JSX attribute whose name is not a valid JS
 * identifier, so `Omit<…, 'aria-level'>` is silently powerless — verified, the
 * `@ts-expect-error` over it is reported unused. This strip is therefore the
 * only guarantee for that one, not a belt to the type's braces.
 *
 * It also has to survive a spread, which is not excess-property-checked either,
 * and CASING: React normalises attribute names on the way to the DOM, so a bag
 * carrying `Role` or `ARIA-LEVEL` lands as `role`/`aria-level` — measured, both
 * reached the element and `role="presentation"` removed the heading from every
 * role query, through a guard that deleted only the exact lowercase keys.
 *
 * `aria-level` is precisely a second way to choose the level, which is the same
 * reason this component has no `as`.
 */
const OVERRULING = ['role', 'aria-level'] as const;

/** The consumer's props, minus the two that would overrule `level`. */
export function withoutOverruling<T extends object>(props: T): T {
  const kept = { ...props } as Record<string, unknown>;
  for (const key of Object.keys(kept)) {
    if (OVERRULING.includes(key.toLowerCase() as (typeof OVERRULING)[number])) {
      delete kept[key];
    }
  }
  return kept as T;
}

/** Dev-only: name what was dropped, and why it could not be honoured. */
export function useOverrulingWarning(props: object): void {
  const record = props as Record<string, unknown>;
  const passed = Object.keys(record).filter(
    (key) =>
      OVERRULING.includes(key.toLowerCase() as (typeof OVERRULING)[number]) &&
      record[key] !== undefined,
  );

  useDevWarning(
    passed.length > 0,
    `Heading: \`${passed.join('`, `')}\` ${passed.length > 1 ? 'were' : 'was'} ignored. ` +
      'Both overrule `level` — `role` removes the heading from the outline and ' +
      '`aria-level` renames its level — so the element would stop matching the ' +
      'document structure `level` exists to state. Change `level` instead.',
  );
}

import { useDevWarning } from '../primitives/use-dev-warning.js';
import type { BindingOwned } from './binding-owned.types.js';

/**
 * The runtime half of {@link BindingOwned} — the same list, so a bound component
 * is safe even where types are not: a JavaScript consumer, an `as any`, a prop
 * bag spread from an untyped source.
 */
const OWNED: Record<keyof BindingOwned, true> = {
  onChange: true,
  onBlur: true,
  value: true,
  defaultValue: true,
  checked: true,
  defaultChecked: true,
};

/**
 * Written as a `Record` over the type's own keys rather than as a list,
 * because a `Record` cannot omit one: the compiler is what keeps the two halves
 * from drifting apart, and drifting apart is precisely the silent failure this
 * pair exists to prevent.
 */
const BINDING_OWNED = Object.keys(OWNED) as Array<keyof BindingOwned>;

/** The call site's props, minus the ones the binding owns. */
export function withoutBindingOwned<T extends object>(props: T): T {
  const kept = { ...props } as Record<string, unknown>;
  for (const key of BINDING_OWNED) delete kept[key];
  return kept as T;
}

/**
 * Dev-only: name the props that were dropped, and why. The type already refuses
 * them, so this fires only where the type was bypassed — and it says so out
 * loud rather than letting the field go quietly unbound.
 */
export function useBindingOwnedWarning(props: object, component: string): void {
  const passed = BINDING_OWNED.filter(
    (key) => (props as Record<string, unknown>)[key] !== undefined,
  );
  useDevWarning(
    passed.length > 0,
    `${component}: \`${passed.join('`, `')}\` ${
      passed.length > 1 ? 'are' : 'is'
    } owned by the form binding and was ignored. ` +
      'Read the value through your form library, or compose `Field` + the control to own it yourself.',
  );
}

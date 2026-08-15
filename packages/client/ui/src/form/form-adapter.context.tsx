import { useUiAdapters } from '../i18n/provider.js';
import { forTag } from './control-props.js';
import type {
  BoundField,
  BoundOptionField,
  ControlTag,
} from './form-adapter.types.js';

/**
 * The form binding in scope — the one given to `UiProvider` when the design
 * system was set up.
 *
 * There is exactly ONE way to bind, deliberately. An earlier version also
 * offered a per-form context, and it was removed: nesting `UiProvider` already
 * overrides the binding for a subtree (verified), so the second mechanism paid
 * for a case that was already covered, and was read by everyone.
 */
function useFormBinding() {
  return useUiAdapters()?.form;
}

/**
 * Bind one field through the binding in scope.
 *
 * The binding is CALLED AS A HOOK here, inside the component that renders the
 * field, which is what makes it live: the subscription belongs to that
 * component, so it re-renders when its own field changes. A closure would be
 * cached — the React Compiler sees stable dependencies, because a form library
 * typically MUTATES its error object in place — and the error would never
 * arrive, silently. Measured.
 *
 * Throws rather than degrading: an unbound control still renders, still accepts
 * typing, and submits nothing — a failure that surfaces in production data
 * rather than in development.
 */
export function useBoundField<Tag extends ControlTag = 'input'>(
  name: string,
  component: string,
  tag: Tag = 'input' as Tag,
): BoundField<Tag> {
  /*
   * OPT OUT of the React Compiler, declared where it happens rather than
   * skipped in silence: the hook this calls comes from the INJECTED form
   * adapter, so it is a different function in a different app. The compiler
   * rightly refuses to reason about a hook it cannot name — "hooks must be the
   * same function on every render" — and it is stable by the port's own
   * contract, which is a promise the app makes and no analysis can see.
   *
   * The build treats every other bailout as an error (`panicThreshold`), so
   * these two are the only unmemoized functions in the package.
   */
  'use no memo';

  const binding = useFormBinding();
  const useFormField = binding?.field;
  if (useFormField == null) {
    throw new Error(
      `${component}: no form binding in scope — give one to <UiProvider adapters={{ form }}>.`,
    );
  }
  /*
   * An adapter builds its bag WITHOUT knowing the tag, which is what makes the
   * port small: `name`, `onChange` and `ref` mean the same thing on all three
   * controls, and every adapter's handler reads `event.target.value`, which
   * all three have.
   *
   * The cast alone was NOT sound, and an adversarial review proved it with
   * Conform: `getInputProps` also emits `type`, `pattern`, `accept`, `min`,
   * `max`, `step` and `multiple`, which reached a `<select>` verbatim — and
   * `multiple` turns it into a listbox, breaking the role the docs and tests
   * state. So the bag is FILTERED for the tag here, not merely re-typed:
   * `forTag` drops what the element cannot carry, the same way
   * `withoutBindingOwned` keeps the call site honest where types do not reach.
   *
   * The alternative was threading the tag through `UseFormField` itself, which
   * would make every adapter declare a parameter it has no use for — a generic
   * in four packages to spare one filter in this file.
   */
  const bound = useFormField(name) as BoundField<Tag>;
  return { ...bound, control: forTag(tag, bound.control) };
}

/**
 * Bind one field that is drawn as MANY controls — a radio group, checkboxes
 * under one name, a multi-select's carriers.
 *
 * Same hook discipline as `useBoundField`: the adapter's hook is called here,
 * once, inside the component that renders the group. What comes back is a plain
 * `option(value)` function, so the per-option props are produced during render
 * without a hook per option — the number of options is data, and data must not
 * decide how many hooks run.
 *
 * Throws when the binding has no `optionField`, naming the component, rather
 * than falling back to `field`: bound through the per-field shape a group draws
 * controls that share a name and can never report which one is checked, so the
 * failure would be a form that submits nothing while looking complete.
 */
export function useBoundOptionField(
  name: string,
  component: string,
): BoundOptionField {
  /* Same reason as `useBoundField` above: the hook belongs to the app. */
  'use no memo';

  const binding = useFormBinding();
  if (binding == null) {
    throw new Error(
      `${component}: no form binding in scope — give one to <UiProvider adapters={{ form }}>.`,
    );
  }
  const useOptionField = binding.optionField;
  if (useOptionField == null) {
    throw new Error(
      `${component}: the form binding provides no \`optionField\` — a group of controls sharing one name needs it. Add it to the adapter (every binding in @fmmenchi/ui-form-ports ships one).`,
    );
  }
  // Called through a `use`-prefixed BINDING, never `binding.optionField()` — a
  // member call is not recognised as a hook by the tooling, and the React
  // Compiler then memoises around it.
  const bound = useOptionField(name);
  return {
    ...bound,
    // Filtered per option for the same reason `useBoundField` filters: an
    // adapter may emit props the element cannot carry (Conform emits `multiple`,
    // which was measured turning a `<select>` into a listbox). Every control
    // this shape serves is an `<input>`, so the tag is not a parameter.
    option: (value: string) => forTag('input', bound.option(value)),
  };
}

/**
 * Every field in error, by name — what `FormErrorSummary` renders.
 *
 * Optional in the binding, because a form without a summary never needs it, so
 * an app is not made to implement something it does not use.
 */
export function useFormErrors(
  component: string,
): Readonly<Record<string, readonly string[]>> {
  /* Same reason as `useBoundField` above: the hook belongs to the app. */
  'use no memo';

  const binding = useFormBinding();
  if (binding == null) {
    throw new Error(
      `${component}: no form binding in scope — give one to <UiProvider adapters={{ form }}>.`,
    );
  }
  const useErrors = binding.errors;
  if (useErrors == null) {
    throw new Error(
      `${component}: the form binding provides no \`errors\` — add one to use <FormErrorSummary>.`,
    );
  }
  // Called through a `use`-prefixed BINDING, not as `binding.errors()`. A member
  // call is not recognised as a hook by the tooling, and the React Compiler then
  // memoises around it — measured: "change in the order of Hooks", and the value
  // arrives undefined.
  return useErrors();
}

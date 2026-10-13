import type { RefCallback } from 'react';
import { mergeRefs } from '../primitives/merge-refs.js';
import { useBoundField } from './form-adapter.context.js';
import { forCarrier } from './control-props.js';
import { useBoundCarrier } from './use-bound-carrier.js';
import type { BoundCarrierField } from './use-bound-carrier-field.types.js';

/** Narrowed to a string: `control` is typed for an `<input>`, where a value may
 *  also be a number or a list. An ISO date, an `HH:mm` or a key is neither. */
const asString = (candidate: unknown) =>
  typeof candidate === 'string' ? candidate : undefined;

/**
 * ONE FIELD, BOUND ONTO A CARRIER — the binding every date, time and combobox
 * field needs, written once.
 *
 * `useBoundField` answers for a control that IS the native input: spread the
 * bag and the library is wired. These fields are two nodes instead — a hidden
 * CARRIER with the name and the canonical value, and a visible input showing
 * that value the way the locale writes it — so the bag has to be routed rather
 * than spread, and the five components that did the routing each carried a
 * copy of the same forty lines. They had drifted (see `forCarrier`). This is
 * the one place now, and each decision below was paid for in a measured
 * defect on one of them:
 *
 * - **A routing table, not a blanket spread and not a hand-picked list.** The
 *   hand-picked list dropped Conform's `required`, `id` and `form`, and a field
 *   rendered outside its `<form>` posts nothing without the last of those. The
 *   blanket spread forwarded `type`, and the visible field became the native
 *   control the component replaces. `forCarrier` is the table: what describes
 *   the VALUE never reaches a field that does not hold it; everything else
 *   does, and the control routes `name`, `form`, `onChange` and `onBlur` to the
 *   carrier itself, because that is the node with the name.
 *
 * - **The name falls back to the call site's.** `name` is optional on the
 *   port's control, and without one the carrier is nameless: nothing is
 *   submitted, and `FormErrorSummary` — which finds a field by `name` — cannot
 *   reach it. Those are the two jobs the carrier exists for.
 *
 * - **The seed arrives under either of two names, and never leaves as
 *   `value`.** Conform's `getInputProps` emits `defaultValue`, react-hook-form's
 *   `register` emits neither and leaves the DOM to keep it, Formik and TanStack
 *   emit `value` on every render. Reading only one of the two was a defect:
 *   under Conform the seed was silently dropped and the field rendered empty
 *   beside `FormInput`s that had filled themselves in. It seeds an UNCONTROLLED
 *   field, because passing it through as `value` would control the visible
 *   input with an ISO string and show `2026-08-12` where the locale writes
 *   `12/08/2026`.
 *
 * - **Two refs, two jobs, two nodes.** THE BINDING'S goes to the CARRIER:
 *   react-hook-form reads `.value` off the element its ref was given, and
 *   given the visible field it would store `12/08/2026` — or, as measured
 *   before this existed, never receive the element at all and store
 *   `undefined` for every such field in the form. THE CALL SITE'S stays with
 *   the component, which hands it to the visible input, where focus belongs.
 *   Merged into the carrier's ref is {@link useBoundCarrier}, which follows a
 *   CONTROLLED adapter's value after the first render — a seed is a one-shot,
 *   and a library handing over `value` and no ref has no other way to reach
 *   the field.
 *
 * It is a hook because it calls one, and the rules of hooks hold for it as for
 * `useBoundField`: unconditional, at the top, once per field — twice, in a
 * fixed order, for a range that binds two.
 */
export function useBoundCarrierField(
  name: string,
  component: string,
): BoundCarrierField {
  const { control, errors } = useBoundField(name, component);
  const { value, defaultValue, ref: bindingRef, ...rest } = control;
  const held = asString(value);
  const carrier = useBoundCarrier(held);
  // `mergeRefs` is called INSIDE the callback rather than during render, which
  // is where the compiler allows a ref to reach a function.
  const carrierRef: RefCallback<HTMLInputElement> = (node) =>
    mergeRefs(carrier, bindingRef)(node);

  return {
    binding: forCarrier(rest),
    name: control.name ?? name,
    seed: asString(defaultValue) ?? held,
    carrierRef,
    errors,
  };
}

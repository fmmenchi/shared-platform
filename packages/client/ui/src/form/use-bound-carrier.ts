import { useEffect, useRef } from 'react';

/**
 * FOLLOW A CONTROLLED ADAPTER'S VALUE ONTO A DATE FIELD'S CARRIER.
 *
 * Form libraries come in two shapes and the date family only ever served one.
 * A REF-BASED library — react-hook-form's `register`, Conform's
 * `getInputProps` — hands over a `ref` and writes the DOM node itself, which
 * `DateInput` watches through three doors. A CONTROLLED one — Formik, TanStack
 * Form — hands over `value` and `onChange` and **no ref at all**, because it
 * expects the value it holds to be rendered back.
 *
 * `FormDateInput` and `FormDatePicker` cannot render it back: passing it through
 * as `value` would control the visible field with an ISO string and show
 * `2026-08-12` where the locale writes `12/08/2026`. So they fold it into a
 * one-shot `defaultValue` seed — and then it never moves again.
 *
 * Measured, Formik through this repo's own port: `setFieldValue('dob', …)`
 * updated a `FormInput` beside it and left the date field showing the old date,
 * with the carrier still holding the old ISO — so `FormData` posted one date
 * while the library's state held another. Clearing did nothing at all. The
 * same for `FormDatePicker`, whose whole claim is that the calendar needs no
 * library lever.
 *
 * THE WRITE IS A BARE ASSIGNMENT, deliberately, and not `setNativeValue`. The
 * assignment path goes through the `value` descriptor `DateInput` wraps, which
 * repaints the box and reports `onDateChange`; it dispatches no event, so the
 * binding is not told about a value that CAME from the binding. An event would
 * hand `onChange` straight back to the library that just set it.
 */
export function useBoundCarrier(
  iso: string | undefined,
): React.RefObject<HTMLInputElement | null> {
  // THE HOOK OWNS THE REF rather than taking one. Handed in, it is a hook
  // ARGUMENT, and the React Compiler refuses a write through one — "modifying
  // component props or hook arguments is not allowed" — which is a rule worth
  // obeying rather than working around: a caller has no way to know this hook
  // writes to what it passed. Owned here, the write is local and the caller
  // merges the ref it gets back with whatever else wants the node.
  const carrier = useRef<HTMLInputElement>(null);
  // What the adapter last said, so a re-render for any other reason does not
  // re-assert a value the user has since typed over.
  const last = useRef(iso);
  useEffect(() => {
    const element = carrier.current;
    // `undefined` is a ref-based adapter, which owns the node itself and must
    // not be second-guessed here.
    if (element === null || iso === undefined) return;
    if (iso === last.current && element.value === iso) return;
    last.current = iso;
    if (element.value !== iso) element.value = iso;
  }, [iso]);
  return carrier;
}

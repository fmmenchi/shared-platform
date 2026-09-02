import { act, render } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { BasesProvider, REFERENCE_BASES, useBases } from '../app/bases';
import type { BasesValues } from '../app/bases.schema';
import { BackToReference, LiveBases } from '../app/live-bases';

/**
 * THE LIGHT SEVEN REACH THE STORE AS THEY CHANGE, and only as a well-formed set.
 *
 * Step one was half committed and half live, and both consequences were watched: the
 * dark seven could not follow a light edit until "Check and continue", and the preview
 * rail could not show one at all. The fix is a subscription on the form that writes
 * the store on every change — and the thing worth asserting is the boundary: the
 * store moves on a valid edit, does NOT move on a malformed one, and "back to the
 * reference" leaves form and store agreeing.
 *
 * The form is react-hook-form's own `FormProvider`, driven through `setValue`, rather
 * than the step rendered whole: the defect was in the wiring between the form and the
 * store, so that is what is exercised — the fourteen pickers, the tabs and the
 * declarations loader are not part of the claim.
 */
function harness() {
  const seen: {
    store: ReturnType<typeof useBases> | null;
    form: UseFormReturn<BasesValues> | null;
  } = { store: null, form: null };

  function Probe() {
    seen.store = useBases();
    return null;
  }

  function Form() {
    const form = useForm<BasesValues>({ defaultValues: REFERENCE_BASES });
    seen.form = form;
    return (
      <FormProvider {...form}>
        <LiveBases />
        <BackToReference>
          {(onClick) => (
            <button type="button" onClick={onClick}>
              back
            </button>
          )}
        </BackToReference>
      </FormProvider>
    );
  }

  const view = render(
    <BasesProvider>
      <Probe />
      <Form />
    </BasesProvider>,
  );

  return {
    view,
    get store() {
      if (!seen.store) throw new Error('The probe never rendered.');
      return seen.store;
    },
    get form() {
      if (!seen.form) throw new Error('The form never rendered.');
      return seen.form;
    },
  };
}

describe('LiveBases', () => {
  it('writes a light edit into the store without a submit', () => {
    const h = harness();

    act(() => h.form.setValue('primary', '#1f5fa8'));

    expect(h.store.bases.primary).toBe('#1f5fa8');
    // and the six untouched ones travel with it: the store takes the SET
    expect(h.store.bases.secondary).toBe(REFERENCE_BASES.secondary);
  });

  it('so the dark seven follow a light edit while it is being made', () => {
    // The first of the two consequences the half-live step had. Before, this held
    // only after "Check and continue".
    const h = harness();
    const before = h.store.darkBases.primary;

    act(() => h.form.setValue('primary', '#1f5fa8'));

    expect(h.store.darkFollowsLight).toBe(true);
    expect(h.store.darkBases.primary).not.toBe(before);
  });

  it('refuses a value the picker could not have produced', () => {
    // The shape check is the whole of what "unchecked value" could have meant for a
    // per-change write; the set-level checks stay on submit.
    const h = harness();

    act(() => h.form.setValue('primary', 'not a colour'));

    expect(h.store.bases.primary).toBe(REFERENCE_BASES.primary);
  });
});

describe('BackToReference', () => {
  it('puts the form AND the store back, with dark following again', () => {
    const h = harness();

    act(() => h.form.setValue('primary', '#1f5fa8'));
    act(() =>
      h.store.setDarkBases({ ...h.store.darkBases, primary: '#66ccff' }),
    );
    expect(h.store.darkFollowsLight).toBe(false);

    act(() => h.view.getByRole('button', { name: 'back' }).click());

    expect(h.form.getValues()).toEqual(REFERENCE_BASES);
    expect(h.store.bases).toEqual(REFERENCE_BASES);
    // the two-write version this replaced stopped the follow here — a hand edit as
    // far as the store could tell
    expect(h.store.darkFollowsLight).toBe(true);
  });
});

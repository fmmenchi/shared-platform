import { useEffect, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';

import { REFERENCE_BASES, useBases } from './bases';
import { parseBasesShape, type BasesValues } from './bases.schema';

/**
 * THE LIGHT SEVEN REACH THE STORE AS THEY CHANGE — the fix step one was half of.
 *
 * Step one was half committed and half live: the light seven were form fields written
 * to the store by "Check and continue", the dark seven were store-backed and moved as
 * you typed. Two things followed from that, both watched happening. The dark seven
 * could not follow a light edit until you continued, which made "Re-derive from the
 * light seven" look broken — it was disabled against a store the person was not
 * looking at. And the preview rail, whose whole purpose is showing a choice as you
 * make it, could not show a light edit at all until the step was submitted.
 *
 * So the form's values go into the store on every change, and the SET validation
 * keeps gating the advance: the resolver still runs on submit and still refuses to
 * move a person to step two on seven colours that cannot make a readable theme. The
 * objection on record — "a store that accepted one colour at a time would invite
 * writing an unchecked value into it" — was about those set-level checks, and they
 * are exactly where they were. What is checked here is the SHAPE, which is the one
 * thing a live write could get wrong and a colour input cannot produce wrong.
 *
 * A SUBSCRIPTION, NOT A RENDER-TIME `useWatch` FED INTO AN EFFECT. `watch(callback)`
 * is react-hook-form's own event stream — it fires on each change, with the whole
 * set — so the store is written from the event and no state is set in reaction to a
 * render. It also means the fourteen pickers cost no re-render of this component,
 * which renders nothing.
 *
 * A COMPONENT RATHER THAN A HOOK IN THE PAGE, for the reason `ShowTheFailingTab` is:
 * `useFormContext` reads the form's context, and the page renders the form — a
 * component cannot consume a context its own element declares.
 */
export function LiveBases() {
  const { watch } = useFormContext<BasesValues>();
  const { setBases } = useBases();

  useEffect(() => {
    const subscription = watch((values) => {
      const parsed = parseBasesShape(values);
      if (parsed.success) setBases(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [watch, setBases]);

  return null;
}

/**
 * BACK TO THE REFERENCE COLOURS, on the form and the store together.
 *
 * It was a button that wrote the reference seven into the store and left the form
 * where it was — so the page showed the colours a person had typed while the store
 * held the design system's, and nothing on screen said which was real. Now that the
 * store follows the form, the two would have disagreed until the next edit, so the
 * form is reset too, through the library's own `reset`.
 *
 * And it uses the STORE's reset rather than two writes. The two writes were
 * `setBases(REFERENCE_BASES)` and `setDarkBases(REFERENCE_DARK_BASES)`, and the second
 * is a hand edit as far as the store can tell: it stopped the dark seven from
 * following, so "back to the reference" left the wizard in the one state the reference
 * never has. `reset()` puts the follow back, which `bases-store.spec.tsx` asserts.
 *
 * A RENDER PROP rather than a button of its own, so the page keeps deciding what the
 * control looks like and where it sits; this only knows what clicking it means.
 */
export function BackToReference({
  children,
}: {
  readonly children: (onClick: () => void) => ReactNode;
}) {
  const form = useFormContext<BasesValues>();
  const { reset } = useBases();

  return children(() => {
    form.reset(REFERENCE_BASES);
    reset();
  });
}

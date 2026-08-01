import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFormErrors } from '../../form/form-adapter.context.js';
import type { FormErrorSummaryProps } from './form-error-summary.types.js';
import styles from './form-error-summary.module.css';

/**
 * After a failed submit, one place that says what went wrong and takes you to
 * each field:
 *
 *     <FormErrorSummary labelFor={(n) => LABELS[n]} />
 *
 * It renders NOTHING while the form is valid, so it can sit in the markup
 * unconditionally.
 *
 * This is why the adapter has a form level at all. A per-field message is
 * announced only once you reach that field — on a long form, a keyboard or
 * screen-reader user has no way to learn that three fields failed without
 * walking the whole thing. The summary is the fix, and it needs errors keyed by
 * NAME, which no single field can provide.
 *
 * It takes focus when it appears, so the failure is announced immediately
 * rather than waiting to be found; and each entry is a link that moves focus to
 * the control, so acting on it is one keystroke.
 */
function FormErrorSummary(props: FormErrorSummaryProps) {
  const {
    className,
    heading = 'There is a problem',
    labelFor,
    ref,
    ...rest
  } = props;
  const errors = useFormErrors('FormErrorSummary');
  const el = useRef<HTMLDivElement>(null);
  // Generated, not a literal: two forms on one page each get a summary, and a
  // hard-coded id made both groups resolve to the FIRST heading — so the payment
  // form announced the address form's heading. Measured, and axe does not flag
  // it. Every other part of a field mints its id the same way.
  const headingId = useId();

  const entries = Object.entries(errors).filter(
    ([, messages]) => messages.length > 0,
  );
  const count = entries.length;

  // Every failed submission counts the form's own `submit` event, in the
  // CAPTURE phase, so it is seen before the handler that will reject it — and
  // whether the form is an `onSubmit` one or a React 19 `action`.
  //
  // The summary is not in the DOM until there is something to summarise, so the
  // listener attaches when it appears. That is exactly right: the submission
  // that PUT it there is the 0 → n edge below, and every later one arrives here.
  const [submits, setSubmits] = useState(0);
  const shown = count > 0;
  useEffect(() => {
    if (!shown) return;
    const form = el.current?.closest('form');
    if (form == null) return;
    const count = () => setSubmits((n) => n + 1);
    form.addEventListener('submit', count, true);
    return () => form.removeEventListener('submit', count, true);
  }, [shown]);

  // Move focus here when the summary APPEARS, and on every failed submission
  // after that, so a screen reader announces the failure at once. Both edges are
  // required and neither is enough alone.
  //
  // Keying this on the error COUNT was wrong, and measured: a library that
  // revalidates as you type drops the count the moment a field becomes valid, so
  // fixing one error mid-word yanked focus out of the input and the rest of the
  // keystrokes went nowhere. Silent — the field simply ended up holding less
  // than was typed. Found by running one suite against four form libraries.
  //
  // Submitting again with the same errors leaves the count unchanged, though, and
  // a user who is told nothing cannot know the form was rejected again. So the
  // count is not the trigger at all: appearing is, and submitting is.
  const wasEmpty = useRef(true);
  const seenSubmits = useRef(0);
  useEffect(() => {
    if (count > 0 && (wasEmpty.current || submits !== seenSubmits.current)) {
      el.current?.focus();
    }
    wasEmpty.current = count === 0;
    seenSubmits.current = submits;
  }, [count, submits]);

  if (count === 0) return null;

  return (
    <div
      {...rest}
      ref={mergeRefs(el, ref)}
      // A labelled group rather than role="alert": the summary is a place you
      // come back to, and focusing it announces it — an alert would announce it
      // a second time, from wherever the user happened to be.
      //
      // Note `group` is NOT a landmark role, so this does not appear in a screen
      // reader's landmark rotor. Making it one means `role="region"`, which is a
      // deliberate change to the accessible surface and to every query that
      // finds this component — worth doing, on its own.
      role="group"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn(styles.summary, className)}
    >
      <h2 id={headingId} className={styles.heading}>
        {heading}
      </h2>
      <ul className={styles.list}>
        {entries.map(([name, messages]) =>
          messages.map((message) => (
            <li key={`${name}-${message}`}>
              <a
                href={`#${name}`}
                className={styles.link}
                onClick={(event) => {
                  // Fields carry generated ids, so the href cannot point at one.
                  // The NAME is the stable handle — it is what the form library
                  // and the DOM already agree on.
                  const control = el.current
                    ?.closest('form')
                    ?.querySelector<HTMLElement>(
                      `[name="${CSS.escape(name)}"]`,
                    );
                  // Prevented either way: the href is a handle, not a
                  // destination. No field carries `id="email"`, so letting the
                  // navigation through would push a history entry for a
                  // fragment that matches nothing.
                  event.preventDefault();
                  control?.focus();
                }}
              >
                {labelFor?.(name) ?? name}: {message}
              </a>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

export { FormErrorSummary };

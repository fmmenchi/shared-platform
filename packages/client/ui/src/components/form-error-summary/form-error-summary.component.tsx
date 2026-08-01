import { useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFormStatus } from '../../form/form-adapter.context.js';
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
  const { errors } = useFormStatus('FormErrorSummary');
  const el = useRef<HTMLDivElement>(null);

  const entries = Object.entries(errors).filter(
    ([, messages]) => messages.length > 0,
  );
  const count = entries.length;

  // Move focus here when the summary appears, so a screen reader announces the
  // failure at once. Keyed on the COUNT, so a second failed submit that changes
  // nothing does not steal focus back while the user is reading.
  useEffect(() => {
    if (count > 0) el.current?.focus();
  }, [count]);

  if (count === 0) return null;

  return (
    <div
      {...rest}
      ref={mergeRefs(el, ref)}
      // A labelled region rather than role="alert": the summary is a place you
      // return to, so it must be reachable by landmark, and focusing it already
      // announces it — an alert would announce it a second time.
      role="group"
      aria-labelledby="fm-error-summary-heading"
      tabIndex={-1}
      className={cn(styles.summary, className)}
    >
      <h2 id="fm-error-summary-heading" className={styles.heading}>
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
                  if (control == null) return;
                  event.preventDefault();
                  control.focus();
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

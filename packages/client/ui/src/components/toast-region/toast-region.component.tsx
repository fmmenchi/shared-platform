import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { Toast } from '../toast/toast.component.js';
import { toastMessages } from '../toast/toast.messages.js';
import { ToastContext } from './toast-region.context.js';
import type {
  ToastContextValue,
  ToastRegionProps,
} from './toast-region.types.js';
import type { ToastEntry, ToastOptions } from '../toast/toast.types.js';
import styles from './toast-region.module.css';

/**
 * The queue, and the live region it is announced through.
 *
 * THE QUEUE LIVES IN A PROVIDER, NOT IN A MODULE, and that is the decision this
 * component was waiting on. The other shape — an imported `toast()` backed by a
 * module-level store — reads better at the call site and is one object PER
 * PROCESS. On a server that process serves every request, so two people would
 * share a queue: one user's "Saved" appearing over another's page. Libraries
 * that ship the imported form are client-only by construction; this package
 * cannot assume that about its consumer, so the state goes where React already
 * scopes state.
 *
 * THE REGION IS RENDERED EMPTY AND STAYS. A live region and its content
 * appearing together is the classic way to announce nothing: assistive
 * technology has to be watching a region that already exists to notice an
 * insertion into it. So this renders whether or not anything is up, and the
 * toasts are inserted into it.
 *
 * `role="status"`, not `alert`: a toast is not an interruption. An error still
 * gets there — `Alert`'s severity word says which it is — but it says so
 * politely, at the next pause, which is what a message the reader did not ask
 * for deserves.
 *
 * IT HOLDS NO ACTIONS, by design rather than by omission. A message that
 * removes itself on a timer and contains a button is a button a keyboard user
 * may never reach: they would have to arrive before it goes. Something that
 * needs doing belongs in an `Alert`, which stays, or a `Dialog`, which asks.
 * The only control here is the way out, and the timer stops the moment the
 * focus or the pointer is inside — so reaching for it never races it.
 */
function ToastRegion(props: ToastRegionProps) {
  const {
    placement = 'block-end',
    className,
    children,
    'aria-label': label,
    ...rest
  } = props;
  const t = useMessages(toastMessages);

  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);
  const base = useId();

  const dismiss = useCallback((id?: string) => {
    setToasts((current) =>
      id === undefined ? [] : current.filter((entry) => entry.id !== id),
    );
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      // NOT `useId` per toast and not a random: the id has to be stable for the
      // life of the entry and unique within the page, and a counter under a
      // `useId` stem is both without needing a random source that would differ
      // between the server's render and the client's.
      seq.current += 1;
      const id = `${base}-${seq.current}`;
      setToasts((current) => [...current, { ...options, id }]);
      return id;
    },
    [base],
  );

  const value: ToastContextValue = { toast, dismiss, toasts };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        {...rest}
        // ALWAYS RENDERED, empty or not — see above.
        role="status"
        aria-label={label ?? t('region')}
        data-placement={placement}
        // The pause is the region's, not each toast's: a pointer resting on one
        // toast should not let the one under it vanish from beneath the cursor.
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setPaused(false);
          }
        }}
        className={cn(styles.region, className)}
      >
        {toasts.map((entry) => (
          <Toast
            key={entry.id}
            {...entry}
            onDismiss={dismiss}
            paused={paused}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastRegion };

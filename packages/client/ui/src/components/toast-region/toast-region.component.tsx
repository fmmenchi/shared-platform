import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { animateExit } from '../../primitives/animate-exit.js';
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
 * AND `aria-atomic="false"`, which is not a detail. `role="status"` carries an
 * implicit `aria-atomic="true"`, so with the whole queue living in the region
 * the atomic unit was the whole queue: every new message re-read every message
 * already up, severity words and button names included. Three errors stacked
 * meant a fourth message announced four. The one attribute makes an insertion
 * announce the insertion.
 *
 * NOTHING RACES THE READER TO A CONTROL. A timed toast carries no dismiss
 * button and a persistent one is under no clock — see `Toast` for why the
 * first version's reasoning here was circular.
 *
 * IN THE TOP LAYER, via `popover="manual"`, so a message raised while one of
 * this package's own modal dialogs is open is at least SEEN: `z-index` cannot
 * reach above a `showModal()` dialog, and the toast painted behind its
 * backdrop. Measured, and worth stating exactly: this fixes the painting and
 * NOT the interaction. Everything outside a modal dialog is inert, top layer or
 * not, so the toast cannot be focused or announced until the dialog closes. A
 * message that matters during a dialog belongs in the dialog.
 */
function ToastRegion(props: ToastRegionProps) {
  const {
    placement = 'block-end',
    max = 5,
    className,
    children,
    'aria-label': label,
    onPointerEnter,
    onPointerLeave,
    onFocusCapture,
    onBlurCapture,
    ...rest
  } = props;
  const t = useMessages(toastMessages);

  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);
  const base = useId();
  const region = useRef<HTMLDivElement | null>(null);

  /**
   * Take one back — and let it LEAVE, rather than blinking out.
   *
   * The exit is the package's one JS animation and this is a legitimate use of
   * it: `animateExit` exists because a closing `<dialog>` or popover hits
   * `display: none` before a CSS transition can run, and the doctrine's caveat
   * — that only the Dialog can have an exit — is about intercepting a
   * PLATFORM close event that is not cancelable elsewhere. Nothing is
   * intercepted here: the removal is this component's own state, so the delay
   * is ours to take.
   *
   * `fade`, not `scale`: a message that shrinks reads as being undone, and the
   * preset is opacity-only, so the primitive's reduced-motion handling has
   * nothing to strip.
   */
  const dismiss = useCallback(async (id?: string) => {
    const leaving = Array.from(
      region.current?.querySelectorAll<HTMLElement>('[data-toast]') ?? [],
    ).filter((node) => id === undefined || node.dataset.toast === id);

    // Awaited before the state changes, or React unmounts the node out from
    // under the animation. `animateExit` resolves on cancel too, so a toast
    // dismissed twice cannot leave this hanging.
    await Promise.all(
      leaving.map((node) =>
        animateExit(node, { preset: 'fade', duration: 's', ease: 'exit' }),
      ),
    );

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
      // NEWEST FIRST, in the DOM as well as on screen. The first version
      // appended and reversed the column in CSS, so the visual order ran
      // newest-to-oldest while Tab ran oldest-to-newest — the focus ring
      // entering at the bottom and travelling against the reading direction
      // (WCAG 1.3.2, 2.4.3). One array order, one visual order, no `reverse`.
      setToasts((current) => [{ ...options, id }, ...current].slice(0, max));
      return id;
    },
    [base, max],
  );

  /*
   * THE PAUSE IS RE-DERIVED after every change to the queue, and that is a
   * repair rather than a nicety. It used to be latched by events alone — and
   * when the element holding the focus is REMOVED, the browser dispatches no
   * `focusout`: it moves focus to `<body>` in silence. Which is exactly what
   * the dismiss button does to itself. So pressing Enter on it left `paused`
   * true for ever, and no toast auto-dismissed again for the rest of the
   * session. A keyboard user never recovers; a mouse user is healed by the
   * next hover, which is why this was invisible.
   */
  useEffect(() => {
    const element = region.current;
    if (!element || toasts.length === 0) {
      setPaused(false);
      return;
    }
    setPaused(
      element.contains(document.activeElement) || element.matches(':hover'),
    );
  }, [toasts]);

  // THE TOP LAYER, once. `popover="manual"` never light-dismisses, so this is
  // the only call it needs.
  useEffect(() => {
    region.current?.showPopover();
  }, []);

  const value: ToastContextValue = { toast, dismiss, toasts };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        {...rest}
        ref={region}
        // ALWAYS RENDERED, empty or not — see above.
        role="status"
        aria-atomic="false"
        aria-label={label ?? t('region')}
        popover="manual"
        data-placement={placement}
        // The pause is the region's, not each toast's: a pointer resting on one
        // toast should not let the one under it vanish from beneath the cursor.
        // A caller's own handler runs too, rather than being silently dropped
        // by the spread above.
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          setPaused(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setPaused(false);
        }}
        onFocusCapture={(event) => {
          onFocusCapture?.(event);
          setPaused(true);
        }}
        onBlurCapture={(event) => {
          onBlurCapture?.(event);
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

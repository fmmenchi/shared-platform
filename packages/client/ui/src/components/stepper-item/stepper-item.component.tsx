import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { stepperItemMessages } from './stepper-item.messages.js';
import type { StepperItemProps } from './stepper-item.types.js';
import styles from './stepper-item.module.css';

/**
 * One step of a `Stepper`.
 *
 *     <StepperItem status="complete">Cart</StepperItem>
 *     <StepperItem status="current">Shipping</StepperItem>
 *     <StepperItem status="error">Payment</StepperItem>
 *     <StepperItem>Review</StepperItem>
 *
 * THE STATUS HAS TO BE SAID, not only painted. A sighted reader gets it from
 * the fill; everyone else gets it from here — `aria-current="step"` for the
 * one they are on, and a visually hidden word for the ones behind them or the
 * one that failed. Colour alone is the failure this component exists to avoid,
 * and it is invisible to every automated check: axe cannot know that a filled
 * circle means "done", and it passes just as happily when two states are
 * swapped.
 *
 * The current step is `aria-current="step"` and nothing else. Screen readers
 * render that in their own words and the reader's own language, so a second
 * "current step" beside it would be the same fact twice, in a voice they did
 * not choose. Upcoming steps carry nothing at all: they are the unmarked
 * default, and "not started" repeated down a ten-step wizard is noise.
 *
 * KNOWN LIMIT, because the docs used to claim otherwise. When the step's child
 * is a link, `aria-current` sits on this `<li>` and the status word is the
 * link's SIBLING — so tabbing to it announces "Cart, link" and neither. Browse
 * mode reads both. `StepperItem` cannot fix this from here: the `<a>` is the
 * consumer's, and APG puts `aria-current` on the anchor (which is what
 * `BreadcrumbLink` does, owning its own). If focus-mode status matters for a
 * linked step, put it in the link's own text.
 */
function StepperItem(props: StepperItemProps) {
  const { status = 'upcoming', className, children, ...rest } = props;
  const t = useMessages(stepperItemMessages);

  const announced =
    status === 'complete'
      ? t('complete')
      : status === 'error'
        ? t('error')
        : null;

  return (
    <li
      className={cn(styles['item'], className)}
      data-status={status}
      // Only ever on the current step: `aria-current` on more than one element
      // in a set makes every one of them meaningless. `Stepper` warns in dev
      // when more than one child claims it.
      aria-current={status === 'current' ? 'step' : undefined}
      // AFTER the internal props, deliberately: it is what lets a consumer add
      // `aria-current="step"` to an `error` step that is also the current one.
      // The same reopened escape hatch `BreadcrumbLink` documents.
      {...rest}
    >
      {children}
      {/* AFTER the label, so it is heard as "Shipping, completed" and not as a
          word the reader has to hold until the label arrives. */}
      {announced === null ? null : <VisuallyHidden>{announced}</VisuallyHidden>}
    </li>
  );
}

export { StepperItem };

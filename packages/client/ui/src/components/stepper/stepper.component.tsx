import { Children, isValidElement } from 'react';
import { useMessages } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { stepperMessages } from './stepper.messages.js';
import type { StepperProps } from './stepper.types.js';
import styles from './stepper.module.css';

/**
 * How far through a sequence the reader is.
 *
 *     <Stepper>
 *       <StepperItem status="complete">Cart</StepperItem>
 *       <StepperItem status="current">Shipping</StepperItem>
 *       <StepperItem>Payment</StepperItem>
 *     </Stepper>
 *
 * A landmark holding a counted list — `<nav><ol>` — for the same reason
 * Breadcrumb is one: the sequence IS the meaning, so an ORDERED list is the
 * markup, and "list, 3 items" with each position announced comes free from the
 * element instead of from an `aria-label` somebody has to keep in sync.
 *
 * WHY THIS IS NOT A BREADCRUMB, since the DS already has one that accepts
 * `current="step"`. A breadcrumb is a trail through a HIERARCHY: every crumb is
 * a place that exists and that you may go to, and the only distinction it draws
 * is which one you are on. A stepper describes a PROCESS: its steps have a
 * status — done, here, not yet — and the ones ahead are usually not reachable
 * at all. Marking a wizard up as a breadcrumb claims the last step is a
 * descendant of the first, which is false, and leaves the reader no way to hear
 * that three of the five are already behind them.
 *
 * The marker and the connector are the stylesheet's business, not elements: a
 * number that repeats the list position and a line that draws the gap carry
 * nothing a reader should hear, so there is nothing for the accessibility tree
 * to hold. A CSS counter and a pseudo-element replace the two decorative nodes
 * per step that every other library ships and then has to hide with
 * `aria-hidden`.
 */
function Stepper(props: StepperProps) {
  const {
    'aria-label': ariaLabel,
    className,
    orientation = 'horizontal',
    children,
    ...rest
  } = props;
  const t = useMessages(stepperMessages);

  // The one invariant a step cannot check for itself: `aria-current` on more
  // than one element in a set makes every one of them meaningless, and the
  // only place that is visible is here, where the children are. Reads the prop
  // rather than the DOM, so it catches the mistake at the call site — and only
  // sees `StepperItem`s written inline, which is how they are written.
  const currentCount = Children.toArray(children).filter(
    (child) =>
      isValidElement<{ status?: string }>(child) &&
      child.props.status === 'current',
  ).length;
  useDevWarning(
    currentCount > 1,
    `Stepper: ${currentCount} steps are marked \`status="current"\`. Only one step is where the reader is — aria-current on more than one of them makes every one meaningless.`,
  );

  return (
    // DESTRUCTURED, not defaulted-before-the-spread — the same trap Breadcrumb
    // documents: a consumer's `aria-label={maybe}` that resolves to `undefined`
    // must fall back to the localized name, not delete it. A nameless
    // navigation landmark is indistinguishable from the page's main one.
    <nav aria-label={ariaLabel ?? t('label')} className={className} {...rest}>
      <ol className={styles['list']} data-orientation={orientation}>
        {children}
      </ol>
    </nav>
  );
}

export { Stepper };

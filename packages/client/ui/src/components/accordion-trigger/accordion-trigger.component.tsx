import { cn } from '../../util/cn.js';
import type { AccordionTriggerProps } from './accordion-trigger.types.js';
import styles from './accordion-trigger.module.css';

/**
 * The row you click: a native `<summary>`.
 *
 * It carries no `aria-expanded`, and that is the decision rather than an
 * omission. Measured in Chromium's accessibility tree: the element is already
 * `DisclosureTriangle` with `expanded: false` closed and `expanded: true` open.
 * Writing the attribute would restate what the platform says and give a second
 * thing to keep in step with it.
 *
 * Nor does it need a `tabindex` or a key handler — `<summary>` is focusable on
 * its own and answers `Enter` and `Space`, both measured.
 */
function AccordionTrigger(props: AccordionTriggerProps) {
  const { className, children, ...rest } = props;

  return (
    <summary {...rest} className={cn(styles.trigger, className)}>
      {children}
    </summary>
  );
}

export { AccordionTrigger };

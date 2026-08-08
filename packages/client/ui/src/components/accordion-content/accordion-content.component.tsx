import { cn } from '../../util/cn.js';
import type { AccordionContentProps } from './accordion-content.types.js';
import styles from './accordion-content.module.css';

/**
 * The panel. A plain element that earns its place by carrying the padding: put
 * that on `<details>` itself and the closed row inherits it, so the collapsed
 * accordion sits on a band of empty space it is not using (ADR-0016 — an
 * element earns its place or it goes).
 *
 * It takes no `region` role. A disclosure's panel is not a landmark, and a page
 * of them would fill the rotor with regions a reader did not ask for.
 */
function AccordionContent(props: AccordionContentProps) {
  const { className, children, ...rest } = props;

  return (
    <div {...rest} className={cn(styles.content, className)}>
      {children}
    </div>
  );
}

export { AccordionContent };

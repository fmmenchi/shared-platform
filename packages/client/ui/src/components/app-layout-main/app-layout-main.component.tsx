import { cn } from '../../util/cn.js';
import { useAppLayoutPart } from '../app-layout/app-layout.context.js';
import type { AppLayoutMainProps } from './app-layout-main.types.js';
import styles from './app-layout-main.module.css';

/**
 * The content region — the page's ONE `<main>`, and the skip link's target.
 *
 * `tabIndex={-1}` is what makes the skip link work rather than merely exist:
 * without it the browser scrolls to the element and leaves the focus where it
 * was, so the next Tab returns the reader to the navigation they just skipped.
 * Not tabbable — reachable, which is what `-1` means.
 */
function AppLayoutMain(props: AppLayoutMainProps) {
  const { className, children, ...rest } = props;
  const layout = useAppLayoutPart('AppLayoutMain');

  return (
    <main
      {...rest}
      // NOT overridable: the shell's skip link points here, and an id from
      // outside would cut that wire.
      id={layout?.mainId}
      tabIndex={-1}
      className={cn(styles.main, className)}
    >
      {children}
    </main>
  );
}

export { AppLayoutMain };

import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { appLayoutMessages } from '../app-layout/app-layout.messages.js';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import type { AppLayoutNavProps } from './app-layout-nav.types.js';
import styles from './app-layout-nav.module.css';

/**
 * The navigation region — a column on a wide screen, a drawer on a narrow one.
 *
 * THAT SWAP IS THE REASON THIS PART EXISTS. The pieces were already here — a
 * vertical `Nav`, and a `Dialog` with a `side` — but nothing decided WHEN each
 * one applies, so every product would decide it again, and the one that forgot
 * would ship a 16rem rail on a 360px phone.
 *
 * It renders NO `<nav>` of its own: the navigation inside brings its own
 * landmark, and a `<nav>` around a `<nav>` is a landmark a screen reader
 * announces twice.
 *
 * BOTH FORMS ARE RENDERED, and the stylesheet shows one. The alternative is a
 * media query in JavaScript, which has to guess on the first render and then
 * correct itself — a hydration mismatch on every page load. The cost is that
 * `children` is rendered twice; the guard is `display: none`, which takes the
 * hidden one out of the accessibility tree entirely, so exactly one navigation
 * landmark is ever exposed. There is a test for that, because "exactly one" is
 * the kind of claim that quietly becomes two.
 */
function AppLayoutNav(props: AppLayoutNavProps) {
  const { className, children, label, ...rest } = props;
  const t = useMessages(appLayoutMessages);

  return (
    <>
      <div
        {...rest}
        // The hook the shell's own stylesheet reads, on the element it owns —
        // a hashed class from this file could not be named from that one.
        data-region="nav"
        className={cn(styles.rail, className)}
      >
        {children}
      </div>

      <div data-region="nav-drawer" className={styles.drawer}>
        <Dialog>
          <DialogTrigger variant="ghost">{t('openNav')}</DialogTrigger>
          <DialogContent side="inline-start" aria-label={label}>
            <DialogClose variant="ghost">{t('close')}</DialogClose>
            {children}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export { AppLayoutNav };

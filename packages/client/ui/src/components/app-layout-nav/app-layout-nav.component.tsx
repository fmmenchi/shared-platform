import { useCallback, useState } from 'react';
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
 * ONE COPY OF THE NAVIGATION, in one place, moved between the two forms.
 *
 * The first version rendered BOTH and let the stylesheet hide one, to keep the
 * decision out of JavaScript. Three reviews measured what that cost, and it was
 * not the duplicated markup the doc admitted to:
 *
 *   - crossing the breakpoint with the drawer OPEN left a modal `<dialog>` with
 *     `display: none` on its wrapper — still `:modal`, still holding the scroll
 *     lock, still making the page inert, and with no box, so nothing could be
 *     clicked, focused or scrolled and the close button did not exist. A dead
 *     page, reachable by rotating a tablet;
 *   - every effect in the consumer's navigation ran TWICE, for ever — a badge
 *     count fetched twice on every page;
 *   - a consumer's own `id` inside it was duplicated, and `getElementById`
 *     resolved to the HIDDEN copy: clicking a visible `<label>` focused
 *     nothing. A navigation with a search box was broken by construction;
 *   - and state diverged between the copies, so nothing survived the swap.
 *
 * So JavaScript decides which form to render — but it is NOT told the
 * breakpoint. The stylesheet sets `--nav-form` inside the same container query
 * that lays the region out, and this reads it back. One source of truth, still
 * in CSS; the observer only asks which side of it we are on. Closing the drawer
 * on the way to a column then happens by construction, because the dialog
 * unmounts and `DialogContent` releases the scroll lock in its cleanup.
 *
 * It renders no `<nav>`: the navigation inside brings its own landmark, and a
 * `<nav>` around a `<nav>` is announced twice.
 */
function AppLayoutNav(props: AppLayoutNavProps) {
  const { className, children, label } = props;
  const t = useMessages(appLayoutMessages);

  // DRAWER until measured, which is this package's mobile-first order and the
  // safe guess on a server: a column rendered into a narrow screen is a 16rem
  // rail on a phone, while a drawer on a wide one is one frame of a button.
  const [form, setForm] = useState<'drawer' | 'column'>('drawer');

  // A REF CALLBACK, not an effect: it runs during the commit, so the reading
  // and its re-render land BEFORE the paint. An effect would have shown one
  // frame of the hamburger on every desktop load — which is the sort of thing
  // that is only ever noticed by the person it annoys.
  const region = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const read = () =>
      setForm(
        getComputedStyle(node).getPropertyValue('--nav-form').trim() ===
          'column'
          ? 'column'
          : 'drawer',
      );

    read();
    // WATCH THE GRID, not this region. In drawer form the region sits in an
    // `auto` column sized by its trigger, so widening the container does not
    // change ITS box — measured, the observer never fired and the form was
    // stuck at `drawer` for ever. A circle: the size only changes once the form
    // has changed. The grid's own width tracks the container, so it is the
    // thing that actually moves.
    const observer = new ResizeObserver(read);
    observer.observe(node.parentElement ?? node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={region}
      // The hook the shell's own stylesheet reads, on the element it owns — a
      // hashed class from this file could not be named from that one.
      data-region="nav"
      data-form={form}
      className={cn(styles.region, className)}
    >
      {form === 'column' ? (
        children
      ) : (
        <Dialog>
          <DialogTrigger variant="ghost">{t('openNav')}</DialogTrigger>
          <DialogContent side="inline-start" aria-label={label}>
            <DialogClose variant="ghost">{t('close')}</DialogClose>
            {children}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export { AppLayoutNav };

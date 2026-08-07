import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { appLayoutMessages } from '../app-layout/app-layout.messages.js';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';
import { AppLayoutNavContext } from './app-layout-nav.context.js';
import type { AppLayoutNavContextValue } from './app-layout-nav.context.js';
import type { AppLayoutNavProps } from './app-layout-nav.types.js';
import styles from './app-layout-nav.module.css';

/**
 * What a slot holds, or `undefined` when that slot was not given.
 *
 * By TYPE, not by a marker prop, so a slot cannot be faked and a typo cannot
 * silently become "no slot". The price is the usual compound-component one: a
 * slot has to be a DIRECT child, because an element this does not recognise is
 * an element whose type is somebody else's component.
 */
function slot(children: ReactNode, type: unknown): ReactNode | undefined {
  let held: ReactNode | undefined;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode }>;

    if (element.type === type) {
      held = element.props.children;
      return;
    }

    // THROUGH FRAGMENTS. `Children.forEach` does not flatten them — measured,
    // the first version of this saw `<><Column/><Drawer/></>` as one child of
    // an unknown type, found no slot, and rendered an EMPTY navigation without
    // complaining. A fragment is not a wrapper anyone means, so it is not one
    // that should hide a slot.
    if (element.type === Fragment) {
      const inner = slot(element.props.children, type);
      if (inner !== undefined) held = inner;
    }
  });

  return held;
}

/** The first of the two that was actually given — `undefined` means not given. */
const pick = (first: ReactNode | undefined, second: ReactNode | undefined) =>
  first !== undefined ? first : second;

/**
 * The navigation region — a column on a wide screen, a drawer on a narrow one.
 *
 * TWO SLOTS AND ONE SWAP. `AppLayoutNavColumn` and `AppLayoutNavDrawer` say what
 * the navigation IS in each form; this owns the swap between them. The split is
 * there because the forms genuinely differ — not in structure, but in order, in
 * emphasis, in what a phone's drawer absorbs from the header and what a rail
 * leaves out — while the swap itself is the one thing that must not be the
 * consumer's, for reasons the earlier version paid for in full.
 *
 * Only the form in play is mounted. The first version rendered BOTH and let the
 * stylesheet hide one, to keep the decision out of JavaScript. Three reviews
 * measured what that cost, and it was not the duplicated markup the doc admitted
 * to:
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
 * GIVE ONE SLOT AND IT SERVES BOTH FORMS; give none and the children do. The
 * container always follows the form, only the contents fall back — otherwise
 * the shorthand for "my two forms are the same" would put a 16rem rail on a
 * phone. Passing the same element to both slots is a consumer's business, and
 * costs nothing, because only one of them is ever mounted.
 *
 * Two things "mounted" does NOT mean here, both measured:
 *
 *   - a CLOSED `<dialog>` still holds its subtree, so on a narrow screen the
 *     drawer's slot is mounted from the first render even if nobody opens it.
 *     If what you put in it fetches, it fetches on load;
 *   - the form starts at `drawer` and is corrected once `--nav-form` has been
 *     read, so on a wide screen the drawer's slot lives for exactly one commit
 *     before the column replaces it.
 *
 * Neither is the old defect — nothing is duplicated and nothing is left behind
 * — but a slot is not free just because its form is not showing.
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

  const column = slot(children, AppLayoutNavColumn);
  const drawer = slot(children, AppLayoutNavDrawer);
  // No slot at all: the children are the navigation, in both forms. Which is
  // the same rule as a missing slot, applied to a consumer who never asked for
  // the distinction in the first place.
  const loose =
    column === undefined && drawer === undefined ? children : undefined;

  const value = useMemo<AppLayoutNavContextValue>(() => ({ form }), [form]);

  return (
    <AppLayoutNavContext.Provider value={value}>
      <div
        ref={region}
        // The hook the shell's own stylesheet reads, on the element it owns — a
        // hashed class from this file could not be named from that one.
        data-region="nav"
        data-form={form}
        className={cn(styles.region, className)}
      >
        {form === 'column' ? (
          pick(column, pick(drawer, loose))
        ) : (
          <Dialog>
            <DialogTrigger variant="ghost">{t('openNav')}</DialogTrigger>
            <DialogContent side="inline-start" aria-label={label}>
              <DialogClose variant="ghost">{t('close')}</DialogClose>
              {pick(drawer, pick(column, loose))}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayoutNavContext.Provider>
  );
}

export { AppLayoutNav };

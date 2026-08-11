import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { appLayoutMessages } from '../app-layout/app-layout.messages.js';
import { useAppLayoutPart } from '../app-layout/app-layout.context.js';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';
import { AppLayoutNavContext } from './app-layout-nav.context.js';
import type {
  AppLayoutNavContextValue,
  AppLayoutNavForm,
} from './app-layout-nav.context.js';
import type { AppLayoutNavProps } from './app-layout-nav.types.js';
import styles from './app-layout-nav.module.css';

/**
 * "This slot was not given" — a value no consumer can forge.
 *
 * It used to be `undefined`, and `undefined` is a member of `ReactNode`: the
 * ordinary `{user ? <Nav/> : undefined}` therefore read as NOT GIVEN, and a
 * logged-out phone was handed the desktop rail it had explicitly asked not to
 * have. Every other empty spelling — `null`, `false`, `[]`, `''` — meant
 * "given, and deliberately empty", so one of the five behaved differently from
 * the other four for a reason no one could see. A symbol cannot be typed into
 * a consumer's JSX, so now none of them can.
 */
const MISSING = Symbol('AppLayoutNav.slot.missing');

type Held = ReactNode | typeof MISSING;

interface Slots {
  column: Held;
  drawer: Held;
  /** A child that is neither slot: dropped, and worth saying so. */
  strays: boolean;
  /** Slots given more than once: the first wins, and that is worth saying too. */
  duplicated: string[];
}

/**
 * Find the slots among `children`, FIRST MATCH WINS.
 *
 * By type, not by a marker prop, so a slot cannot be faked and a typo cannot
 * silently become "no slot". Fragments are looked through — `Children.forEach`
 * does not flatten them, and the first version of this read
 * `<><Column/><Drawer/></>` as one child of an unknown type, found no slot and
 * rendered an EMPTY navigation without complaining.
 *
 * Anything else is a wall: a slot inside a component of your own, a `<Suspense>`
 * or a `React.lazy` is a slot this cannot see, and no amount of walking would
 * help, because those children do not exist until they are rendered. That case
 * is caught where it can be caught — in the markers themselves, which warn when
 * they are rendered at all.
 */
function readSlots(children: ReactNode, into: Slots): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      if (hasRenderableChildren(child)) into.strays = true;
      return;
    }

    const element = child as ReactElement<{ children?: ReactNode }>;

    if (
      element.type === AppLayoutNavColumn ||
      element.type === AppLayoutNavDrawer
    ) {
      const which = element.type === AppLayoutNavColumn ? 'column' : 'drawer';
      // FIRST wins, at both levels. The version before this assigned
      // unconditionally at the top level and conditionally inside a fragment,
      // so the same two slots resolved differently depending on whether a
      // fragment happened to wrap one of them.
      if (into[which] !== MISSING) {
        into.duplicated.push(which);
        return;
      }
      into[which] = element.props.children;
      return;
    }

    if (element.type === Fragment) {
      readSlots(element.props.children, into);
      return;
    }

    into.strays = true;
  });
}

/** The first candidate that was actually given. */
function pick(...candidates: Held[]): ReactNode {
  for (const candidate of candidates) {
    if (candidate !== MISSING) return candidate as ReactNode;
  }
  return null;
}

/** Where focus should land when the form it was standing in is destroyed. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 * Only the form in play is rendered. The first version rendered BOTH and let the
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
 * in CSS; the observer only asks which side of it we are on.
 *
 * NOTHING IS RENDERED UNTIL THAT READING HAPPENS, which is the whole of the
 * first render and costs nothing on screen, because the ref callback runs
 * during the commit and its re-render lands before the paint. The version
 * before this guessed `drawer` and corrected itself, and the guess was not
 * free: with a single slot — or with the loose children the docs recommend for
 * the simple case — the content that ends up on a wide screen was mounted
 * first inside the dialog and then again in the flow. Two mounts, so two of
 * every fetch in it, which is a halved copy of the very defect above. A
 * measurement that has not happened yet is not a form, so it is no longer
 * spelled like one.
 *
 * What that costs instead, and it is worth saying plainly: a server-rendered
 * page ships an EMPTY region. Little is actually lost — the version that
 * guessed shipped a wide page's navigation inside a closed `<dialog>`, which is
 * `display: none`, so a reader without JavaScript could not see it either.
 *
 * GIVE ONE SLOT AND IT SERVES BOTH FORMS; give none and the children do. The
 * container always follows the form, only the contents fall back — otherwise
 * the shorthand for "my two forms are the same" would put a 16rem rail on a
 * phone. Passing the same element to both slots is a consumer's business, and
 * mounts once, because only one of them is ever rendered.
 *
 * One thing "rendered" does NOT mean: a CLOSED `<dialog>` still holds its
 * subtree, so on a narrow screen the drawer's contents are mounted from the
 * first render even if nobody opens it. If what you put in it fetches, it
 * fetches on load. Nothing is duplicated and nothing is left behind — but a
 * form that is not showing is not a form that costs nothing.
 *
 * It renders no `<nav>`: the navigation inside brings its own landmark, and a
 * `<nav>` around a `<nav>` is announced twice.
 */
function AppLayoutNav(props: AppLayoutNavProps) {
  const { className, children, label } = props;
  // The warn-by-name discipline every sibling part already has, and the one
  // part whose orphanhood is the most expensive: outside the shell there is no
  // container-typed ancestor, so `@variant @xl` never matches, `--nav-form`
  // stays 'drawer', and a desktop at 1920px keeps its navigation behind a
  // "Menu" button forever — silently. The value is unused on purpose; the
  // registration is the warning.
  useAppLayoutPart('AppLayoutNav');
  const t = useMessages(appLayoutMessages);

  // NULL until measured — see above. Not a form, and not spelled like one.
  const [form, setForm] = useState<AppLayoutNavForm | null>(null);

  // The reading happens in a ref callback and has to compare against the form
  // WITHOUT re-subscribing, so the observer is installed once. State for
  // rendering, a ref for the comparison.
  const formRef = useRef<AppLayoutNavForm | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const rescueFocus = useRef(false);

  // A REF CALLBACK, not an effect: it runs during the commit, so the reading
  // and its re-render land BEFORE the paint. An effect would have shown one
  // frame of an empty region on every load — which is the sort of thing that
  // is only ever noticed by the person it annoys.
  const region = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    nodeRef.current = node;

    const read = () => {
      const next: AppLayoutNavForm =
        getComputedStyle(node).getPropertyValue('--nav-form').trim() ===
        'column'
          ? 'column'
          : 'drawer';
      if (next === formRef.current) return;

      // The container that holds the focus is about to be destroyed. A
      // `<dialog>` REMOVED rather than closed fires no `close` event, so
      // `DialogContent`'s own focus restoration never runs and the focus lands
      // on `<body>`: rotate a tablet with the drawer open and the next Tab
      // starts again from the skip link. Remembered here, acted on below,
      // because the new form does not exist yet.
      rescueFocus.current =
        formRef.current !== null && node.contains(document.activeElement);

      formRef.current = next;
      setForm(next);
    };

    read();
    // WATCH THE GRID, not this region. In drawer form the region sits in an
    // `auto` column sized by its trigger, so widening the container does not
    // change ITS box — measured, the observer never fired and the form was
    // stuck for ever. A circle: the size only changes once the form has
    // changed. The grid's own width tracks the container, so it is the thing
    // that actually moves.
    const observer = new ResizeObserver(read);
    observer.observe(node.parentElement ?? node);
    return () => {
      observer.disconnect();
      nodeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!rescueFocus.current) return;
    rescueFocus.current = false;

    const node = nodeRef.current;
    if (!node) return;

    // The first thing of the NEW form — the same navigation the reader was
    // already standing in, not the top of the page.
    const target = node.querySelector<HTMLElement>(FOCUSABLE);
    if (target) {
      target.focus();
      return;
    }
    node.tabIndex = -1;
    node.focus();
  }, [form]);

  const slots: Slots = {
    column: MISSING,
    drawer: MISSING,
    strays: false,
    duplicated: [],
  };
  readSlots(children, slots);

  // No slot at all: the children are the navigation, in both forms — the same
  // rule as a missing slot, applied to a consumer who never asked for the
  // distinction in the first place.
  const loose =
    slots.column === MISSING && slots.drawer === MISSING ? children : MISSING;

  useDevWarning(
    slots.strays && loose === MISSING,
    'AppLayoutNav: children beside a slot are dropped. Once `AppLayoutNavColumn` or `AppLayoutNavDrawer` is present, everything the navigation renders has to be inside one of them — put the stray children in the slot they belong to.',
  );
  useDevWarning(
    slots.duplicated.length > 0,
    `AppLayoutNav: ${[...new Set(slots.duplicated)].join(' and ')} given more than once. The first one wins and the rest are ignored.`,
  );

  const value = useMemo<AppLayoutNavContextValue | null>(
    () => (form === null ? null : { form }),
    [form],
  );

  return (
    <div
      ref={region}
      // The hook the shell's own stylesheet reads, on the element it owns — a
      // hashed class from this file could not be named from that one.
      data-region="nav"
      data-form={form ?? undefined}
      className={cn(styles.region, className)}
    >
      {value === null ? null : (
        <AppLayoutNavContext.Provider value={value}>
          {value.form === 'column' ? (
            pick(slots.column, slots.drawer, loose)
          ) : (
            <Dialog>
              <DialogTrigger variant="ghost">{t('openNav')}</DialogTrigger>
              <DialogContent side="inline-start" aria-label={label}>
                <DialogClose variant="ghost">{t('close')}</DialogClose>
                {pick(slots.drawer, slots.column, loose)}
              </DialogContent>
            </Dialog>
          )}
        </AppLayoutNavContext.Provider>
      )}
    </div>
  );
}

export { AppLayoutNav };

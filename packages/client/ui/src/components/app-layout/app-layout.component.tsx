import { useId, useMemo } from 'react';
import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { appLayoutMessages } from './app-layout.messages.js';
import { AppLayoutContext } from './app-layout.context.js';
import type { AppLayoutContextValue } from './app-layout.context.js';
import type { AppLayoutProps } from './app-layout.types.js';
import styles from './app-layout.module.css';

/**
 * The page shell: the regions a product page is made of, and the three things
 * every product gets wrong about them.
 *
 *     <AppLayout>
 *       <header>…</header>
 *       <AppLayoutNav label="Main"><Nav orientation="vertical">…</Nav></AppLayoutNav>
 *       <AppLayoutMain>…</AppLayoutMain>
 *       <aside>…</aside>
 *       <footer>…</footer>
 *     </AppLayout>
 *
 * IT DECIDES NOTHING ABOUT CONTENT. No brand, no user, no icon set, no `items`
 * array — the moment a shell takes a list of links it has invented a second
 * markup language, and every product then needs one more field on it. The
 * regions are children, and an absent region is simply absent.
 *
 * WHICH IS ALSO HOW IT ADAPTS. There is no `columns` prop: the grid asks what
 * is actually there (`:has()`), so a page with no nav is two rows and a page
 * with a nav and an aside is three columns. An admin panel, a documentation
 * site and a marketing page are the same skeleton with different regions
 * present — naming them as three components would be three names for one grid,
 * and the day one grows a prop the other lacks they have stopped being it.
 *
 * `<header>`, `<aside>` and `<footer>` are PLAIN ELEMENTS, not parts. They are
 * landmarks with no behaviour, and a component around one would be an element
 * that had not earned its place. The two that carry behaviour have parts:
 * `AppLayoutNav`, which becomes a drawer on a small screen, and
 * `AppLayoutMain`, which owns the skip target.
 */
function AppLayout(props: AppLayoutProps) {
  const { className, children, ...rest } = props;
  const mainId = useId();
  const t = useMessages(appLayoutMessages);

  const value = useMemo<AppLayoutContextValue>(() => ({ mainId }), [mainId]);

  return (
    <AppLayoutContext.Provider value={value}>
      {/* TWO ELEMENTS, and the outer one earns its place: a container query
          cannot interrogate the container it is written on, only its
          descendants — and every rule that decides this layout is a
          `grid-template-*` on the grid itself. So the outer element IS the
          container and the inner one is the grid that asks it. */}
      <div {...rest} className={cn(styles.container, className)}>
        <div className={styles.layout}>
          {/* WCAG 2.4.1, and the reason this component exists at all: the first
            focusable thing on the page, invisible until it has the focus. A
            keyboard user who has read the same navigation on every page needs
            one key to get past it — and the id is owned here rather than asked
            of the consumer, because a skip link pointing at an id nobody set
            goes nowhere and says nothing while doing it. */}
          <a href={`#${mainId}`} className={styles.skip}>
            {t('skip')}
          </a>
          {children}
        </div>
      </div>
    </AppLayoutContext.Provider>
  );
}

export { AppLayout };

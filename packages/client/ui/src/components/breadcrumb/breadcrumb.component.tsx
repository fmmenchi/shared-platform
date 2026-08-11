import { useMessages } from '../../i18n/provider.js';
import { breadcrumbMessages } from './breadcrumb.messages.js';
import type { BreadcrumbProps } from './breadcrumb.types.js';
import styles from './breadcrumb.module.css';

/**
 * Where the reader is, as the trail that leads there.
 *
 *     <Breadcrumb>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *       <BreadcrumbLink href="/tea">Tea</BreadcrumbLink>
 *       <BreadcrumbLink href="/tea/oolong" current>Oolong</BreadcrumbLink>
 *     </Breadcrumb>
 *
 * A landmark holding a counted list — `<nav><ol>` — and an ORDERED list on
 * purpose: the sequence is the meaning. "List, 3 items" with the levels in
 * order is what a screen reader announces, and what the APG breadcrumb
 * pattern marks up.
 *
 * The last crumb stays a real link to the page it names (APG again): a link
 * to where you are is still middle-clickable, copyable, and reachable — a
 * `<span>` pretending to be one is none of those. It is marked with
 * `aria-current="page"`, by the `current` prop or by the app's own matcher
 * through the `useIsCurrent` adapter.
 *
 * The separator between crumbs is the stylesheet's business, not an element:
 * it carries no meaning a reader should hear, so there is nothing for the
 * accessibility tree to hold — one generated glyph replaces the per-item
 * `aria-hidden` node every other library ships and then has to hide.
 */
function Breadcrumb(props: BreadcrumbProps) {
  const { 'aria-label': ariaLabel, className, children, ...rest } = props;
  const t = useMessages(breadcrumbMessages);

  return (
    <nav
      // DESTRUCTURED, not defaulted-before-the-spread: a consumer's
      // `aria-label={maybe}` that resolves to `undefined` must fall back to
      // the localized name, not delete it — a nameless navigation landmark is
      // indistinguishable from the page's main one, which is the exact defect
      // the default exists to prevent. A consumer with a better name still
      // wins by writing it (their `aria-labelledby` wins the accname
      // computation over this label without touching it).
      aria-label={ariaLabel ?? t('label')}
      {...rest}
      // The landmark itself has no class of its own — the list carries the
      // layout — so the consumer's, when given, goes through untouched rather
      // than riding with an empty string that renders as `class=""`.
      className={className}
    >
      <ol className={styles.list}>{children}</ol>
    </nav>
  );
}

export { Breadcrumb };

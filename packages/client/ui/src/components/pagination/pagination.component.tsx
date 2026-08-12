import { useMemo, useState } from 'react';
import { cn } from '../../util/cn.js';
import { useCopyLocale, useMessages } from '../../i18n/provider.js';
import { pageRange } from '../../pagination/range.js';
import { Button } from '../button/button.component.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { paginationMessages } from './pagination.messages.js';
import type { PaginationProps } from './pagination.types.js';
import styles from './pagination.module.css';

/**
 * Where you are in a list, and how to be somewhere else.
 *
 * A `<nav>` WITH A LIST IN IT, which is what the pattern is: a set of links or
 * controls that navigate, so assistive technology can list it as a landmark and
 * announce how many entries it has. `role="list"` is written explicitly,
 * because `list-style: none` is what removes those semantics in WebKit and the
 * count is the whole reason the markup is a list.
 *
 * LINKS WHEN THE PAGE IS AN ADDRESS, buttons when it is not, decided by
 * `getHref` rather than by a `variant`. A page that lives in the URL can be
 * opened in a new tab, bookmarked and reached with the browser's own back
 * button; a page that is client state can do none of those, and a link
 * pretending otherwise is a link that lies.
 *
 * THE ENDS REFUSE WITHOUT DROPPING THE FOCUS. `aria-disabled` and a click
 * guard, never native `disabled` — which is this package's own rule for
 * `Button` and was broken here first: measured, the press that reached the last
 * page removed the control under the reader's finger from the tab order and
 * focus fell to `<body>`, so the next Tab restarted at the top of the document.
 * It also means the boundary is ANNOUNCED, where a `disabled` control is simply
 * absent from the reader's list.
 *
 * IT ANNOUNCES WHAT THE READER DID, not what the data did. The sentence is
 * captured when the control is used rather than derived from the props, so a
 * background refetch that changes the total does not speak to somebody who
 * touched nothing — the rule `Table`'s own region spends a paragraph on, and
 * which the first version of this file reintroduced.
 *
 * ONE PAGE IS NOT A PAGER. With nowhere else to go it renders nothing at all,
 * and zero pages renders nothing rather than "page 1 of 1" over an empty list.
 */
function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  label,
  getHref,
  className,
  ...rest
}: PaginationProps) {
  const t = useMessages(paginationMessages);
  // THE COPY'S LOCALE, not the reader's: a number inside a sentence has to be
  // written in the language of that sentence.
  const locale = useCopyLocale();
  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const [announcement, setAnnouncement] = useState('');

  if (pageCount <= 1) return null;

  const items = pageRange(page, pageCount, { siblingCount });
  // THE SAME GUARD THE RANGE MAKES, because this decides which control is
  // marked and where the ends are: a `NaN` page — `parseInt` of a missing query
  // parameter — left both steps enabled on a forty-page list with no current
  // page at all, and Next reporting `NaN` forever.
  const wanted = Number.isFinite(page) ? Math.round(page) : 1;
  const clamped = Math.min(Math.max(wanted, 1), pageCount);

  const go = (target: number) => {
    // CAPTURED HERE, AS A SENTENCE. Derived from the props it would be re-said
    // whenever the data moved.
    setAnnouncement(
      t('announcement', {
        page: numbers.format(target),
        pageCount: numbers.format(pageCount),
      }),
    );
    onPageChange?.(target);
  };

  const step = (target: number, name: string, atEnd: boolean) => {
    const glyph = (
      <span aria-hidden="true">{target < clamped ? '‹' : '›'}</span>
    );

    if (getHref !== undefined) {
      // A PLACEHOLDER, NOT A CONTROL. There is no address for the page before
      // the first, and both alternatives are worse: a link to nowhere lies, and
      // a `<button>` here would make one affordance change ROLE between pages —
      // "link, Previous page" on one and "button, unavailable" on the next. It
      // keeps the space, so nothing else moves.
      return atEnd ? (
        <span aria-hidden="true" className={cn(styles.step, styles.spacer)}>
          {glyph}
        </span>
      ) : (
        <a href={getHref(target)} className={styles.step} aria-label={name}>
          {glyph}
        </a>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        className={styles.step}
        aria-label={name}
        // NOT `disabled`. See the note above the component.
        aria-disabled={atEnd || undefined}
        onClick={() => {
          if (atEnd) return;
          go(target);
        }}
      >
        {glyph}
      </Button>
    );
  };

  // A NAME OF YOUR OWN WINS. Written after the spread, the default overwrote a
  // consumer's `aria-label` silently — and where `Table` passes an
  // `aria-labelledby` (a caption that is not words), having both meant the
  // labelledby won and the landmark lost the word "Pagination" entirely, ending
  // up with the same name as the table beside it.
  const named =
    rest['aria-labelledby'] !== undefined || rest['aria-label'] !== undefined;

  return (
    <nav
      {...rest}
      aria-label={named ? rest['aria-label'] : (label ?? t('label'))}
      className={cn(styles.pagination, className)}
    >
      {/* EXPLICIT. `list-style: none` removes list semantics in WebKit, and the
          count of entries is the whole reason this is a list. */}
      <ul role="list" className={styles.list}>
        <li>{step(clamped - 1, t('previous'), clamped <= 1)}</li>

        {items.map((item) =>
          item.kind === 'gap' ? (
            // NOT A CONTROL AND NOT A NAME. The reader is told how many pages
            // there are by the last number; the ellipsis is the shape of the
            // gap, which is a visual fact and nothing else.
            <li
              key={`gap-${item.side}`}
              aria-hidden="true"
              className={styles.gap}
            >
              …
            </li>
          ) : (
            <li key={item.page}>
              {getHref !== undefined ? (
                <a
                  href={getHref(item.page)}
                  className={cn(
                    styles.page,
                    item.page === clamped && styles.currentPage,
                  )}
                  // ONE CHANNEL, NOT TWO. `aria-current` is what marks it;
                  // putting "current page" in the NAME as well made every
                  // screen reader that maps the attribute say it twice, which
                  // is why GOV.UK, USWDS and Polaris all name it plainly. The
                  // sighted channel is the fill AND the weight, so it is not
                  // colour alone either.
                  aria-current={item.page === clamped ? 'page' : undefined}
                  aria-label={t('page', { page: numbers.format(item.page) })}
                >
                  {numbers.format(item.page)}
                </a>
              ) : (
                <Button
                  variant={item.page === clamped ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    styles.page,
                    item.page === clamped && styles.currentPage,
                  )}
                  aria-current={item.page === clamped ? 'page' : undefined}
                  aria-label={t('page', { page: numbers.format(item.page) })}
                  onClick={() => go(item.page)}
                >
                  {numbers.format(item.page)}
                </Button>
              )}
            </li>
          ),
        )}

        <li>{step(clamped + 1, t('next'), clamped >= pageCount)}</li>
      </ul>

      <VisuallyHidden role="status" data-pagination-status="">
        {announcement}
      </VisuallyHidden>
    </nav>
  );
}

export { Pagination };

import { useEffect, useMemo, useRef, useState } from 'react';
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
 * announce how many entries it has. `aria-current="page"` marks the one in
 * force — and the number also says so in words, because the paint that marks it
 * is colour and colour is not a channel.
 *
 * LINKS WHEN THE PAGE IS AN ADDRESS, buttons when it is not, decided by
 * `getHref` rather than by a `variant`. A page that lives in the URL can be
 * opened in a new tab, bookmarked and reached with the browser's own back
 * button; a page that is client state can do none of those, and a link
 * pretending otherwise is a link that lies.
 *
 * IT ANNOUNCES ITS OWN CHANGE. Pressing Next replaces everything under it and
 * moves nothing a reader who cannot see it would notice — the silent change
 * sorting had, at a larger scale. Silent on arrival, like every region in this
 * package: a list that renders on page 3 is not news.
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

  // Silent on arrival and speaking on every change after — a fact of what the
  // reader last did, which a ref cannot answer because it is needed during the
  // render that draws it.
  const [announcement, setAnnouncement] = useState('');
  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    setAnnouncement(
      t('announcement', {
        page: numbers.format(page),
        pageCount: numbers.format(pageCount),
      }),
    );
  }, [page, pageCount, t, numbers]);

  if (pageCount <= 1) return null;

  const items = pageRange(page, pageCount, { siblingCount });
  const clamped = Math.min(Math.max(Math.round(page), 1), pageCount);

  const step = (target: number, name: string, disabled: boolean) => {
    const content = (
      <span aria-hidden="true">{name === t('previous') ? '‹' : '›'}</span>
    );
    // A DISABLED STEP IS A BUTTON, even where the pages are links: there is no
    // address for "the page before the first", and a link to nowhere is worse
    // than a control that says it cannot be used.
    if (getHref !== undefined && !disabled) {
      return (
        <a href={getHref(target)} className={styles.step} aria-label={name}>
          {content}
        </a>
      );
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        className={styles.step}
        aria-label={name}
        disabled={disabled}
        onClick={() => onPageChange(target)}
      >
        {content}
      </Button>
    );
  };

  return (
    <nav
      {...rest}
      aria-label={label ?? t('label')}
      className={cn(styles.pagination, className)}
    >
      <ul className={styles.list}>
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
                  aria-current={item.page === clamped ? 'page' : undefined}
                  aria-label={
                    item.page === clamped
                      ? t('current', { page: numbers.format(item.page) })
                      : t('page', { page: numbers.format(item.page) })
                  }
                >
                  {numbers.format(item.page)}
                </a>
              ) : (
                <Button
                  variant={item.page === clamped ? 'secondary' : 'ghost'}
                  size="sm"
                  className={styles.page}
                  // THE STATE, and then the same state IN WORDS. `aria-current`
                  // is the machine-readable half; the name is the half that
                  // survives a screen reader that does not announce it.
                  aria-current={item.page === clamped ? 'page' : undefined}
                  aria-label={
                    item.page === clamped
                      ? t('current', { page: numbers.format(item.page) })
                      : t('page', { page: numbers.format(item.page) })
                  }
                  onClick={() => onPageChange(item.page)}
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

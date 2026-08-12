import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Pagination } from './pagination.component.js';
import { usePagination } from './use-pagination.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A landmark, a list, and one control that is marked as the page you are on —
 * plus the thing every pager forgets, which is that pressing Next replaces
 * everything under it in silence.
 */
function Pager(props: {
  pageCount?: number;
  onPageChange?: (p: number) => void;
}) {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      page={page}
      pageCount={props.pageCount ?? 40}
      onPageChange={(next) => {
        setPage(next);
        props.onPageChange?.(next);
      }}
    />
  );
}

const status = () => document.querySelector('[data-pagination-status]');

describe('a pager', () => {
  it('is a named landmark holding a list', async () => {
    render(<Pager />);

    // A set of navigation entries IS a list, and a screen reader counts them —
    // which is most of what tells a reader how far they can go.
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav.querySelector('ul')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(3);
  });

  it('says which page you are on twice — in the attribute and in words', async () => {
    render(<Pager />);

    const current = screen.getByRole('button', {
      name: 'Page 1, current page',
    });
    expect(current).toHaveAttribute('aria-current', 'page');
    // The paint that marks it is colour, and `aria-current` is not announced by
    // every combination of browser and screen reader. The name is the half that
    // survives both.
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('turns the page, and reports the page rather than a delta', async () => {
    const onPageChange = vi.fn();
    render(<Pager onPageChange={onPageChange} />);

    await browser.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await browser.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(onPageChange).toHaveBeenLastCalledWith(4));
  });

  it('announces the change, because the rows move in silence', async () => {
    render(<Pager />);

    // Silent on arrival: a list rendered on page 3 is not news.
    expect(status()).toHaveTextContent('');

    await browser.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(status()).toHaveTextContent('Page 2 of 40'));
  });

  it('keeps the same number of controls on every page', async () => {
    render(<Pager />);

    const count = () => screen.getAllByRole('listitem').length;
    const first = count();

    await browser.click(screen.getByRole('button', { name: 'Page 3' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Page 3, current page' }),
      ).toBeInTheDocument(),
    );
    // A list that grows and shrinks moves Next under the pointer between
    // clicks and changes a keyboard reader's tab count on every press.
    expect(count()).toBe(first);
  });

  it('stops at the ends rather than offering a page that is not there', async () => {
    render(<Pager />);

    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    await browser.click(screen.getByRole('button', { name: 'Page 40' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled(),
    );
  });

  it('is not a pager when there is nowhere to go', async () => {
    const { container, rerender } = render(
      <Pagination page={1} pageCount={1} onPageChange={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();

    // And zero pages renders nothing rather than "page 1 of 1" over an empty
    // list, contradicting the empty message beside it.
    rerender(
      <Pagination page={1} pageCount={0} onPageChange={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides the gap from the reader who cannot see it', async () => {
    render(<Pager />);

    const gap = screen.getByText('…');
    // The last number already says how many pages there are; the ellipsis is
    // the shape of the gap and nothing else.
    expect(gap).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws links when the page is an address', async () => {
    render(
      <Pagination
        page={2}
        pageCount={10}
        onPageChange={() => undefined}
        getHref={(p) => `/people?page=${p}`}
      />,
    );

    // A page that lives in the URL can be opened in a new tab, bookmarked and
    // reached with the browser's own back button.
    const link = screen.getByRole('link', { name: 'Page 3' });
    expect(link).toHaveAttribute('href', '/people?page=3');
    expect(
      screen.getByRole('link', { name: 'Page 2, current page' }),
    ).toHaveAttribute('aria-current', 'page');
    // And there is no address for the page before the first, so that one stays
    // a control that says it cannot be used.
    expect(
      screen.getByRole('link', { name: 'Previous page' }),
    ).toBeInTheDocument();
  });

  it('takes a name of its own, because a page can hold several', async () => {
    render(
      <Pagination
        page={1}
        pageCount={5}
        onPageChange={() => undefined}
        label="Pagination for Persone"
      />,
    );

    expect(
      screen.getByRole('navigation', { name: 'Pagination for Persone' }),
    ).toBeInTheDocument();
  });

  it('speaks the reader’s language', async () => {
    renderUi(<Pager />, { locale: 'it' });

    expect(
      screen.getByRole('navigation', { name: 'Paginazione' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pagina 1, pagina corrente' }),
    ).toBeInTheDocument();
  });

  it('has no violations', async () => {
    const { container } = render(<Pager />);

    await expectNoA11yViolations(container);
  });
});

describe('usePagination', () => {
  const rows = Array.from({ length: 95 }, (_, index) => `row ${index + 1}`);

  function Harness(props: { size?: number }) {
    const pages = usePagination(rows, { defaultPageSize: props.size ?? 20 });
    return (
      <>
        <output>
          {JSON.stringify({
            page: pages.page,
            pageCount: pages.pageCount,
            range: pages.range,
            first: pages.rows[0],
            length: pages.rows.length,
          })}
        </output>
        <button type="button" onClick={() => pages.setPage(5)}>
          last
        </button>
        <button type="button" onClick={() => pages.setPageSize(50)}>
          bigger
        </button>
        <Pagination {...pages.props} />
      </>
    );
  }
  const read = () => JSON.parse(document.querySelector('output')!.textContent!);

  it('slices the rows and counts the pages', async () => {
    render(<Harness />);

    expect(read()).toMatchObject({
      page: 1,
      pageCount: 5,
      range: { from: 1, to: 20 },
      first: 'row 1',
      length: 20,
    });
  });

  it('gives the last page what is left of the rows', async () => {
    render(<Harness />);

    await browser.click(screen.getByRole('button', { name: 'last' }));
    expect(read()).toMatchObject({
      page: 5,
      range: { from: 81, to: 95 },
      first: 'row 81',
      length: 15,
    });
  });

  it('keeps the reader on the row they were looking at when the page grows', async () => {
    render(<Harness />);

    await browser.click(screen.getByRole('button', { name: 'last' }));
    await browser.click(screen.getByRole('button', { name: 'bigger' }));

    // Row 81 at fifty per page is page 2. Sending them to page 1 instead — what
    // every table that does the other thing does — throws away the place they
    // had found.
    expect(read()).toMatchObject({ page: 2, first: 'row 51' });
  });

  it('clamps a page the data no longer has', async () => {
    function Shrinking() {
      const [all, setAll] = useState(rows);
      const pages = usePagination(all, { defaultPage: 5, defaultPageSize: 20 });
      return (
        <>
          <output>
            {JSON.stringify({ page: pages.page, pageCount: pages.pageCount })}
          </output>
          <button type="button" onClick={() => setAll(rows.slice(0, 10))}>
            filter
          </button>
        </>
      );
    }
    render(<Shrinking />);

    expect(read()).toMatchObject({ page: 5 });
    await browser.click(screen.getByRole('button', { name: 'filter' }));

    // A filter applied on page 5 of 5 leaves one page, and a reader staring at
    // an empty table while the pager insists they are on page 5.
    expect(read()).toMatchObject({ page: 1, pageCount: 1 });
  });
});

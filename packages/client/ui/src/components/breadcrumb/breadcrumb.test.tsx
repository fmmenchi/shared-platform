import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { Breadcrumb } from './breadcrumb.component.js';
import { BreadcrumbLink } from '../breadcrumb-link/breadcrumb-link.component.js';
import { renderUi } from '../../test/render.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import { pathIsCurrent } from '../../primitives/path-is-current.js';

/**
 * Fragment hrefs, like the nav family's tests and for the same reason: a real
 * path navigates the test iframe away and the runner loses its connection.
 */
const trail = (
  <Breadcrumb>
    <BreadcrumbLink href="#home">Home</BreadcrumbLink>
    <BreadcrumbLink href="#tea">Tea</BreadcrumbLink>
    <BreadcrumbLink href="#oolong" current>
      Oolong
    </BreadcrumbLink>
  </Breadcrumb>
);

const link = (name: string) => screen.getByRole('link', { name });

describe('Breadcrumb', () => {
  it('is a named landmark holding an ordered, counted list of links', () => {
    render(trail);
    // The default name is DS copy — the base-locale catalog, no provider
    // needed — because a nameless navigation landmark is indistinguishable
    // from the page's main one.
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });

    // ORDERED, by the tag: the roles are the same for `<ul>` and `<ol>`, so
    // the role query cannot see the one thing this markup chose — that the
    // sequence is the meaning.
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(nav).getAllByRole('listitem')).toHaveLength(3);
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
  });

  it('lets a consumer with a better name win', () => {
    render(
      <Breadcrumb aria-label="Where you are">
        <BreadcrumbLink href="#a">A</BreadcrumbLink>
      </Breadcrumb>,
    );
    // Resolved BEFORE the spread — `aria-label` is destructured out of `rest`
    // and defaulted with `??`, so there is exactly one name and an explicit
    // `undefined` still falls back to ours. (An earlier comment here described
    // the opposite implementation, which passes this test just as well.)
    expect(
      screen.getByRole('navigation', { name: 'Where you are' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
  });

  it('marks the current crumb, which stays a real link', () => {
    render(trail);
    // APG: the last crumb is an `<a>` to the page it names, not a span
    // pretending — middle-click, copy and reach all still work on it.
    expect(link('Oolong').tagName).toBe('A');
    expect(link('Oolong')).toHaveAttribute('aria-current', 'page');
    expect(link('Home')).not.toHaveAttribute('aria-current');
    expect(link('Tea')).not.toHaveAttribute('aria-current');
  });

  it('speaks the other aria-current dialects, and survives the direct one', () => {
    render(
      <Breadcrumb>
        <BreadcrumbLink href="#one" current="step">
          One
        </BreadcrumbLink>
        <BreadcrumbLink href="#two" aria-current="step">
          Two
        </BreadcrumbLink>
      </Breadcrumb>,
    );
    // A trail that is a flow rather than a hierarchy marks a step…
    expect(link('One')).toHaveAttribute('aria-current', 'step');
    // …and the attribute written directly must not be deleted by the prop's
    // `undefined` — the escape hatch NavLink had to reopen once already.
    expect(link('Two')).toHaveAttribute('aria-current', 'step');
  });

  it('draws the separator as paint, not as content', () => {
    render(trail);
    // Nothing between the crumbs exists as a node: not in the accessibility
    // tree, not in the text, not in a copy-paste of the page.
    expect(screen.queryByText('/')).toBeNull();

    // The stylesheet paints it on every item AFTER the first — the empty
    // alternative text keeps it out of engines that expose generated content.
    const [first, second] = screen.getAllByRole('listitem');
    expect(getComputedStyle(first, '::before').content).toBe('none');
    expect(getComputedStyle(second, '::before').content).toContain('/');
  });

  describe('which crumb the reader is on — the routing seam', () => {
    const withPath = (pathname: string, ui?: React.ReactNode) =>
      render(
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            useIsCurrent: (href) => pathIsCurrent(pathname, href),
          }}
        >
          {ui ?? (
            <Breadcrumb>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
              <BreadcrumbLink href="/tea">Tea</BreadcrumbLink>
              <BreadcrumbLink href="/tea/oolong">Oolong</BreadcrumbLink>
            </Breadcrumb>
          )}
        </UiProvider>,
      );

    it('asks the adapter, and marks only the page', () => {
      withPath('/tea/oolong');
      expect(link('Oolong')).toHaveAttribute('aria-current', 'page');
      // The adapter answers `location` for `/tea` — and the crumb drops it:
      // every ancestor in a trail is trivially the reader's location, so
      // saying so N times is noise, not information. NavLink keeps the same
      // answer because in a sidebar it is the one thing colour was saying.
      expect(link('Tea')).not.toHaveAttribute('aria-current');
      expect(link('Home')).not.toHaveAttribute('aria-current');
    });

    it('lets an explicit `current` beat the adapter', () => {
      withPath(
        '/tea',
        <Breadcrumb>
          <BreadcrumbLink href="/tea" current={false}>
            Tea
          </BreadcrumbLink>
        </Breadcrumb>,
      );
      expect(link('Tea')).not.toHaveAttribute('aria-current');
    });

    it('honours the simplest legal adapter, which answers booleans', () => {
      // The port's contract says `true` means `page`, and the simplest
      // adapter an app writes — `(href) => href === pathname` — says nothing
      // else. A filter that only knew the string marked nothing: NavLink lit
      // up, the breadcrumb went dark, and no test could tell.
      render(
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            useIsCurrent: (href) => href === '/tea/oolong',
          }}
        >
          <Breadcrumb>
            <BreadcrumbLink href="/tea">Tea</BreadcrumbLink>
            <BreadcrumbLink href="/tea/oolong">Oolong</BreadcrumbLink>
          </Breadcrumb>
        </UiProvider>,
      );
      expect(link('Oolong')).toHaveAttribute('aria-current', 'page');
      expect(link('Tea')).not.toHaveAttribute('aria-current');
    });
  });

  describe('which element renders — the shared link seam', () => {
    // `...rest` is not incidental: a slotted child must forward what it does
    // not consume, or everything the design system put on it — the class,
    // `aria-current` — reaches the component and stops there. The nav tests
    // learned this the measured way; the fixture keeps the lesson.
    const RouterLink = ({
      href,
      className,
      children,
      ...rest
    }: {
      href: string;
      className?: string;
      children?: React.ReactNode;
    } & Record<string, unknown>) => (
      <a href={href} className={className} data-router="" {...rest}>
        {children}
      </a>
    );

    it('takes the router from the provider, and leaves it for a destination that leaves', () => {
      render(
        <UiProvider adapters={{ i18n: { locale: 'en' }, Link: RouterLink }}>
          <Breadcrumb>
            <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
            <BreadcrumbLink href="https://example.com">Site</BreadcrumbLink>
            <BreadcrumbLink href="/pricing" as="a">
              Opted out
            </BreadcrumbLink>
          </Breadcrumb>
        </UiProvider>,
      );
      expect(link('Docs')).toHaveAttribute('data-router');
      // An href that says it leaves the app never goes through the router —
      // the same unasked decision NavLink makes, because it is the same hook.
      expect(link('Site')).not.toHaveAttribute('data-router');
      expect(link('Opted out')).not.toHaveAttribute('data-router');
    });

    it('slots the app’s own link, keeping both sides’ props', () => {
      render(
        <Breadcrumb>
          <BreadcrumbLink asChild current>
            <RouterLink href="/orders">Orders</RouterLink>
          </BreadcrumbLink>
        </Breadcrumb>,
      );
      const el = link('Orders');
      expect(el).toHaveAttribute('data-router');
      // Ours arrive on the element the app wrote: the marking…
      expect(el).toHaveAttribute('aria-current', 'page');
      // …and the class, still inside the list a screen reader counts.
      expect(el.className).not.toBe('');
      expect(el.closest('li')).toBeTruthy();
    });

    it('warns by its own name when told twice who renders', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Breadcrumb>
          <BreadcrumbLink asChild as="a">
            <a href="#x">X</a>
          </BreadcrumbLink>
        </Breadcrumb>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('BreadcrumbLink'),
      );
      warn.mockRestore();
    });
  });

  it('forwards refs to the elements they wrap (React 19 ref-as-prop)', () => {
    const nav = createRef<HTMLElement>();
    const anchor = createRef<HTMLAnchorElement>();
    render(
      <Breadcrumb ref={nav}>
        <BreadcrumbLink href="#a" ref={anchor}>
          A
        </BreadcrumbLink>
      </Breadcrumb>,
    );
    expect(nav.current?.tagName).toBe('NAV');
    // The PRIMARY interactive element, not the `<li>` wrapper: focus,
    // measurement and anchoring all want the link.
    expect(anchor.current?.tagName).toBe('A');
  });

  it('leaves the consumer their own handlers', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      <Breadcrumb>
        <BreadcrumbLink href="#a" onClick={onClick}>
          A
        </BreadcrumbLink>
      </Breadcrumb>,
    );
    link('A').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(trail);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — the full trail, in each theme.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {trail}
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });

  it('undoes the UA list, which this page can finally see', () => {
    // The DS ships no reset, so an `<ol>` arrives indented, margined and
    // NUMBERED. The comment in the stylesheet used to excuse the missing
    // assertion with "invisible on the Preflight-carrying test page" — true
    // once, false since ADR-0022: the suite renders on the same bare page a
    // consumer has. Measured there, unreset: 40px, 16px, `decimal`.
    render(trail);
    const list = screen.getByRole('list');
    const style = getComputedStyle(list);
    expect(style.listStyleType).toBe('none');
    expect(style.paddingInlineStart).toBe('0px');
    expect(style.marginBlockStart).toBe('0px');
    expect(style.marginBlockEnd).toBe('0px');
  });
});

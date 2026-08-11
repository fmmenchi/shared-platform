import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CardTitle } from './card-title.component.js';
import { Card } from '../card/card.component.js';

describe('CardTitle', () => {
  it('is the level it is told, and nothing is guessed', () => {
    const { rerender } = render(<CardTitle level={3}>Name</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Name');

    rerender(<CardTitle level={1}>Name</CardTitle>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('is a Heading, so it inherits the type scale instead of copying it', () => {
    render(
      <>
        <CardTitle level={2}>Card</CardTitle>
        <h2 data-testid="bare">Bare</h2>
      </>,
    );

    const titled = screen.getByRole('heading', { name: 'Card' });
    const bare = screen.getByTestId('bare');
    // The UA margin is zeroed by `Heading`, and the family and weight are its
    // decisions. A second copy of them here would be the same choices made
    // twice — and drifting apart from the first revision onwards.
    expect(getComputedStyle(titled).marginBlockStart).toBe('0px');
    expect(getComputedStyle(bare).marginBlockStart).not.toBe('0px');
    expect(getComputedStyle(titled).fontWeight).toBe('600');
  });

  it('keeps the outline honest while letting the look differ', () => {
    render(
      <CardTitle level={2} size="h4">
        Quarterly report
      </CardTitle>,
    );

    // `Heading`'s whole reason for existing, inherited rather than reinvented:
    // "an h2 that looks like an h4" stays an h2 in the document outline.
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('is only a heading without a destination', () => {
    render(<CardTitle level={3}>Settings</CardTitle>);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('puts the link INSIDE the heading, not around it', () => {
    render(
      <CardTitle level={3} href="/dns">
        How DNS works
      </CardTitle>,
    );

    const heading = screen.getByRole('heading', { level: 3 });
    const link = screen.getByRole('link', { name: 'How DNS works' });
    // The other order is not equivalent: a link wrapping a heading takes the
    // heading's text as its own name, and the two stop agreeing about what
    // this card is called.
    expect(heading).toContainElement(link);
  });

  it('marks itself so the card can paint the surface', () => {
    render(
      <Card>
        <CardTitle level={3} href="/dns">
          How DNS works
        </CardTitle>
      </Card>,
    );

    // A hashed class from `card-title.module.css` cannot be named from
    // `card.module.css`, so the hover rule keys off this attribute. Deleting
    // it would leave the card silently unresponsive to the pointer.
    expect(screen.getByRole('link')).toHaveAttribute('data-card-link');
  });

  describe('asChild — the app brings its own link', () => {
    /** Stands in for a router's link: it takes props `href` cannot express. */
    const RouterLink = (p: {
      to: string;
      params?: Record<string, string>;
      children?: React.ReactNode;
      className?: string;
      'data-card-link'?: string;
    }) => (
      <a
        href={`${p.to}${p.params ? `?${new URLSearchParams(p.params)}` : ''}`}
        className={p.className}
        data-card-link={p['data-card-link']}
        data-router=""
      >
        {p.children}
      </a>
    );

    it('renders the element the app wrote, keeping its own props', () => {
      render(
        <Card>
          <CardTitle level={3} asChild>
            <RouterLink to="/orders" params={{ id: '7' }}>
              Order
            </RouterLink>
          </CardTitle>
        </Card>,
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('data-router');
      // `params` is a route descriptor: not a URL, and nothing `href` could
      // have carried. This is the case that had no answer here before.
      expect(link).toHaveAttribute('href', '/orders?id=7');
    });

    it('still makes the WHOLE card clickable, which is the point', () => {
      render(
        <Card>
          <CardTitle level={3} asChild>
            <RouterLink to="/orders">Order</RouterLink>
          </CardTitle>
        </Card>,
      );
      const link = screen.getByRole('link');
      // Both halves, because each is separately losable. The attribute is what
      // `card.module.css` keys its hover and cursor off…
      expect(link).toHaveAttribute('data-card-link');
      // …and the class is what grows the invisible layer. A hand-rolled link
      // can copy the first and can NEVER get the second — it is a hashed class
      // this component owns — so a card carrying only the attribute looks
      // clickable across its surface and is not.
      const layer = getComputedStyle(link, '::after');
      expect(layer.position).toBe('absolute');
      expect(Number.parseFloat(layer.width)).toBeGreaterThan(
        link.getBoundingClientRect().width,
      );
    });

    it('warns when given a destination twice', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Card>
          <CardTitle level={3} asChild href="/ignored">
            <RouterLink to="/orders">Order</RouterLink>
          </CardTitle>
        </Card>,
      );
      // Not a half-working combination — two destinations, one of which is
      // silently dropped.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('both `asChild` and `href`'),
      );
      expect(screen.getByRole('link')).toHaveAttribute('href', '/orders');
      warn.mockRestore();
    });
  });

  describe("the layer's anchor", () => {
    it('warns when nothing positioned will catch the invisible layer', async () => {
      // `.link::after { inset: 0 }` resolves against the nearest positioned
      // ancestor; standalone there is none, so it resolves against the
      // initial containing block — the whole viewport at the page origin
      // becomes the link's hit area, and clicks on "nothing" navigate.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <CardTitle level={2} href="/x">
          Solo
        </CardTitle>,
      );
      await waitFor(() => {
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('no positioned ancestor'),
        );
      });
      warn.mockRestore();
    });

    it('stays quiet inside a Card, which positions itself for this', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Card>
          <CardTitle level={2} href="/x">
            Dentro
          </CardTitle>
        </Card>,
      );
      // Deliberately generous: the check runs after commit.
      await new Promise((r) => setTimeout(r, 30));
      expect(warn).not.toHaveBeenCalledWith(
        expect.stringContaining('no positioned ancestor'),
      );
      warn.mockRestore();
    });
  });
});

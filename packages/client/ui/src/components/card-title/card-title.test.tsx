import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});

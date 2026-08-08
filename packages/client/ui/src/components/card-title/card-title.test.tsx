import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardTitle } from './card-title.component.js';
import { Card } from '../card/card.component.js';

describe('CardTitle', () => {
  it('is an h3 by default, and the level `as` asks for', () => {
    const { rerender } = render(<CardTitle>Name</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Name');

    // There is no clever default to be had: the right level depends on the page
    // the card sits in, which the design system cannot see.
    rerender(<CardTitle as="h1">Name</CardTitle>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('is only a heading without a destination', () => {
    render(<CardTitle>Settings</CardTitle>);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('puts the link INSIDE the heading, not around it', () => {
    render(<CardTitle href="/dns">How DNS works</CardTitle>);

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
        <CardTitle href="/dns">How DNS works</CardTitle>
      </Card>,
    );

    // A hashed class from `card-title.module.css` cannot be named from
    // `card.module.css`, so the hover rule keys off this attribute. Deleting
    // it would leave the card silently unresponsive to the pointer.
    expect(screen.getByRole('link')).toHaveAttribute('data-card-link');
  });
});

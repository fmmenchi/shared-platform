import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Card } from './card.component.js';
import { CardTitle } from '../card-title/card-title.component.js';
import { CardActions } from '../card-actions/card-actions.component.js';
import { Button } from '../button/button.component.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The card, and the family's one piece of real machinery: a link that is
 * visually the whole card and semantically only its title.
 *
 * Most of what has to be true here is GEOMETRY — what is under a given point —
 * and geometry is the half no behavioural query can see. `elementFromPoint` is
 * the honest question: not "is the link in the document", but "if the reader
 * clicks here, what do they hit".
 */
const center = (element: Element) => {
  const box = element.getBoundingClientRect();
  return document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );
};

const spyWarn = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

describe('Card', () => {
  it('renders a div by default, and the element `as` asks for', () => {
    const { container, rerender } = render(<Card>Content</Card>);
    expect(container.firstElementChild?.tagName).toBe('DIV');

    rerender(<Card as="article">Content</Card>);
    // `<article>` is a landmark-ish role; a plain `<div>` is nothing, which is
    // the right default for a box that holds whatever a product puts in it.
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    let el: HTMLElement | null = null;
    render(
      <Card
        ref={(node) => {
          el = node;
        }}
      >
        Content
      </Card>,
    );
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('warns when `as="a"` holds something interactive', async () => {
    const warn = spyWarn();
    render(
      <Card as="a" href="/post">
        <p>Summary</p>
        <Button>Save</Button>
      </Card>,
    );

    // The HTML content model excludes interactive content from `<a>`: the
    // button is invalid markup, the keyboard cannot reach it reliably, and
    // activating it also navigates. No prop type can see this — it is a
    // question about rendered children — so it is asked of the DOM.
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('`as="a"` cannot contain'),
      ),
    );
    warn.mockRestore();
  });

  it('stays quiet for an anchor card with nothing interactive inside', async () => {
    const warn = spyWarn();
    render(
      <Card as="a" href="/photo">
        <p>A tile with one destination</p>
      </Card>,
    );

    // The case the escape hatch exists for. A warning here would train people
    // to ignore the one that matters.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stays quiet for a normal card holding a button', async () => {
    const warn = spyWarn();
    render(
      <Card>
        <Button>Save</Button>
      </Card>,
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('makes the WHOLE card activate the title link', async () => {
    render(
      <Card>
        <CardTitle level={3} href="/dns">
          How DNS works
        </CardTitle>
        <p>
          An explanation in ten minutes, with a long enough summary to fill the
          card and give the layer something to cover.
        </p>
      </Card>,
    );

    const card = screen.getByRole('heading').closest('div') as HTMLElement;
    const link = screen.getByRole('link', { name: 'How DNS works' });
    const summary = card.querySelector('p') as HTMLElement;

    // Over the SUMMARY — text that belongs to no link — the thing under the
    // pointer is the link. That is the whole mechanism, and it is invisible to
    // any query that only asks what is in the document.
    expect(center(summary)).toBe(link);

    // And the card's own padding, which belongs to nothing at all. Sampled at
    // mid-height rather than in a corner: the card is rounded, so a point two
    // pixels in from a corner is OUTSIDE the shape and hit-tests to whatever
    // is behind it — which is a fact about `border-radius`, not about the
    // layer, and cost this test one wrong accusation.
    const box = card.getBoundingClientRect();
    expect(
      document.elementFromPoint(box.left + 2, box.top + box.height / 2),
    ).toBe(link);
  });

  it('keeps the link’s accessible name to the title, and one tab stop', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Card>
          <CardTitle level={3} href="/dns">
            How DNS works
          </CardTitle>
          <p>An explanation in ten minutes.</p>
        </Card>
        <button type="button">After</button>
      </>,
    );

    // The reason the anchor is around the title and not around the card: an
    // `<a>` takes its name from its contents, so a card-sized anchor is
    // announced by reading the entire card. A rotor list of twelve of those is
    // unusable.
    expect(
      screen.getByRole('link', { name: 'How DNS works' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ten minutes/ })).toBeNull();

    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: 'How DNS works' }),
    );

    // ONE stop, not one per element the card happens to contain.
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'After' }),
    );
  });

  it('leaves the actions clickable above the layer', async () => {
    const onClick = vi.fn();
    render(
      <Card>
        <CardTitle level={3} href="/dns">
          How DNS works
        </CardTitle>
        <p>An explanation in ten minutes.</p>
        <CardActions>
          <Button onClick={onClick}>Save</Button>
        </CardActions>
      </Card>,
    );

    const save = screen.getByRole('button', { name: 'Save' });
    // Without `position: relative` on the actions row the layer covers it and
    // this returns the link — the button is in the document, visible, focusable
    // and completely unclickable. The failure a "renders a button" test cannot
    // see.
    expect(center(save)).toBe(save);

    await browser.click(save);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Card as="article">
        <CardTitle level={3} href="/dns">
          How DNS works
        </CardTitle>
        <p>An explanation in ten minutes.</p>
        <CardActions>
          <Button>Save</Button>
        </CardActions>
      </Card>,
    );

    await expectNoA11yViolations(container);
  });
});

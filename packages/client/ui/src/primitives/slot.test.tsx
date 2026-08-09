import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Slot } from './slot.js';

describe('Slot', () => {
  it('renders the child, wearing the props it was given', () => {
    render(
      <Slot data-testid="slotted" id="ours">
        <a href="/x">Go</a>
      </Slot>,
    );
    const el = screen.getByTestId('slotted');
    expect(el.tagName).toBe('A');
    expect(el).toHaveAttribute('href', '/x');
    expect(el).toHaveAttribute('id', 'ours');
  });

  it('keeps BOTH class names, ours first', () => {
    render(
      <Slot className="ours">
        <a href="/x" className="theirs">
          Go
        </a>
      </Slot>,
    );
    // Last wins the cascade on equal specificity, which is the order every
    // component here already uses. `cloneElement` alone would have kept one.
    expect(screen.getByRole('link').className).toBe('ours theirs');
  });

  it('runs BOTH handlers, the child’s first', async () => {
    const order: string[] = [];
    render(
      <Slot onClick={() => order.push('ours')}>
        <button type="button" onClick={() => order.push('theirs')}>
          Go
        </button>
      </Slot>,
    );
    screen.getByRole('button').click();
    // The child is the more specific author, and a handler that calls
    // `preventDefault` has to do it before ours reads the event.
    expect(order).toEqual(['theirs', 'ours']);
  });

  it('keeps ours when the child has no handler of its own', () => {
    const ours = vi.fn();
    render(
      <Slot onClick={ours}>
        <button type="button">Go</button>
      </Slot>,
    );
    screen.getByRole('button').click();
    expect(ours).toHaveBeenCalledOnce();
  });

  it('merges style per property, and the child wins', () => {
    render(
      <Slot style={{ color: 'rgb(1, 2, 3)', margin: '4px' }}>
        <a href="/x" style={{ color: 'rgb(9, 9, 9)' }}>
          Go
        </a>
      </Slot>,
    );
    const el = screen.getByRole('link');
    // An inline style at the call site is the most specific statement there is…
    expect(el.style.color).toBe('rgb(9, 9, 9)');
    // …and it must not wipe the properties it says nothing about.
    expect(el.style.margin).toBe('4px');
  });

  it('gives the node to both refs', () => {
    const ours = createRef<HTMLAnchorElement>();
    const theirs = createRef<HTMLAnchorElement>();
    render(
      <Slot ref={ours}>
        <a href="/x" ref={theirs}>
          Go
        </a>
      </Slot>,
    );
    expect(ours.current).toBe(screen.getByRole('link'));
    expect(theirs.current).toBe(ours.current);
  });

  it('lets the child win every other prop', () => {
    render(
      <Slot aria-current="location" href="/ours">
        <a href="/theirs" aria-current="page">
          Go
        </a>
      </Slot>,
    );
    const el = screen.getByRole('link');
    // The child is what the app actually wrote.
    expect(el).toHaveAttribute('href', '/theirs');
    expect(el).toHaveAttribute('aria-current', 'page');
  });

  it('warns and renders untouched when the child is not one element', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Slot className="ours" data-testid="wrap">
        plain text
      </Slot>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Slot:'));
    // Degraded, not crashed: the text is still on the page.
    expect(screen.getByText('plain text')).toBeInTheDocument();
    warn.mockRestore();
  });

  it('adds no element of its own — the DOM has exactly the child', () => {
    const { container } = render(
      <Slot className="ours">
        <a href="/x">Go</a>
      </Slot>,
    );
    // The whole point, and the reason `CardTitle`'s invisible layer works: the
    // `::after` belongs to the app's own anchor, with nothing between it and
    // the card. A wrapper would put a box in the middle and change what
    // `position: absolute` resolves against.
    expect(container.childNodes).toHaveLength(1);
    expect(container.firstElementChild?.tagName).toBe('A');
    expect(container.querySelector('span, div')).toBeNull();
  });

  it('keeps BOTH ids on an aria list, the child’s first', () => {
    render(
      <Slot aria-describedby="ours" aria-labelledby="ours-label">
        <a href="/x" aria-describedby="theirs" aria-labelledby="theirs-label">
          Go
        </a>
      </Slot>,
    );
    const el = screen.getByRole('link');
    // `aria-describedby` is a LIST of ids, the same kind of thing `class` is,
    // so keeping one side throws the other away — a tooltip that replaced the
    // element's own description would silence it.
    expect(el).toHaveAttribute('aria-describedby', 'theirs ours');
    // Read in order: what the element already said comes first.
    expect(el).toHaveAttribute('aria-labelledby', 'theirs-label ours-label');
  });

  it('does not treat a single-id attribute as a list', () => {
    render(
      <Slot aria-activedescendant="ours">
        <div role="listbox" aria-activedescendant="theirs" />
      </Slot>,
    );
    // Two tokens here are not "more", they are INVALID: this attribute names
    // one element. The list above has to stay exactly as long as ARIA says.
    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-activedescendant',
      'theirs',
    );
  });

  it('says nothing when there is nothing to slot onto', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const nothing of [null, undefined, false, true] as const) {
      render(<Slot className="ours">{nothing}</Slot>);
    }
    // `{canDelete && <Button/>}` is how a control is left out, not a mistake.
    // A warning that is false teaches people to ignore the ones that are not.
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

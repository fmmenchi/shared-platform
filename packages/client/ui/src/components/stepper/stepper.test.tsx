import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { Stepper } from './stepper.component.js';
import { StepperItem } from '../stepper-item/stepper-item.component.js';
import { renderUi } from '../../test/render.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const checkout = (
  <Stepper>
    <StepperItem status="complete">Cart</StepperItem>
    <StepperItem status="current">Shipping</StepperItem>
    <StepperItem>Payment</StepperItem>
  </Stepper>
);

const items = () => screen.getAllByRole('listitem');
const marker = (el: Element) => getComputedStyle(el, '::before');
const connector = (el: Element) => getComputedStyle(el, '::after');

describe('Stepper', () => {
  it('is a named landmark holding an ordered, counted list', () => {
    render(checkout);
    // The default name is DS copy — the base-locale catalog, no provider
    // needed. A nameless navigation landmark cannot be told from the page's
    // main one.
    const nav = screen.getByRole('navigation', { name: 'Progress' });
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks exactly the current step, and marks it as a step', () => {
    render(checkout);
    const [cart, shipping, payment] = items();
    // `aria-current` on more than one element in a set makes every one of them
    // meaningless, so the assertion is on the whole set, not just the winner.
    expect(cart).not.toHaveAttribute('aria-current');
    expect(shipping).toHaveAttribute('aria-current', 'step');
    expect(payment).not.toHaveAttribute('aria-current');
  });

  it('SAYS a step is complete instead of only painting it', () => {
    render(checkout);
    const [cart, shipping, payment] = items();
    // The whole reason this component exists: colour alone is not a status.
    expect(within(cart).getByText('Completed')).toBeInTheDocument();
    expect(within(shipping).queryByText('Completed')).toBeNull();
    expect(within(payment).queryByText('Completed')).toBeNull();
  });

  it('says the status AFTER the label, not before it', () => {
    render(checkout);
    // "Cart, completed" — not a word the reader has to hold until the label
    // arrives. Presence alone would pass with the two swapped.
    expect(items()[0].textContent).toBe('CartCompleted');
  });

  it('says nothing at all about an upcoming step', () => {
    render(checkout);
    // Not "not started": the unmarked default is the point. A word here would
    // repeat down every remaining step of a ten-step wizard.
    expect(items()[2]).toHaveTextContent(/^Payment$/);
  });

  it('says a step failed, and paints it apart from the rest', () => {
    render(
      <Stepper>
        <StepperItem status="complete">Cart</StepperItem>
        <StepperItem status="error">Shipping</StepperItem>
        <StepperItem>Payment</StepperItem>
      </Stepper>,
    );
    const [, shipping] = items();
    expect(shipping).toHaveAttribute('data-status', 'error');
    expect(within(shipping).getByText('Has an error')).toBeInTheDocument();
    // The one status that takes a second hue — so it must not share a fill
    // with the state it is most likely to sit beside.
    expect(marker(shipping).backgroundColor).not.toBe(
      marker(items()[0]).backgroundColor,
    );
  });

  it('translates the landmark name and both status words', () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'it' } }}>
        <Stepper>
          <StepperItem status="complete">Carrello</StepperItem>
          <StepperItem status="error">Spedizione</StepperItem>
        </Stepper>
      </UiProvider>,
    );
    screen.getByRole('navigation', { name: 'Avanzamento' });
    expect(within(items()[0]).getByText('Completato')).toBeInTheDocument();
    expect(
      within(items()[1]).getByText('Contiene un errore'),
    ).toBeInTheDocument();
  });

  it('lets a consumer name the landmark, and falls back when they pass nothing', () => {
    const { rerender } = render(
      <Stepper aria-label="Checkout">
        <StepperItem status="current">Cart</StepperItem>
      </Stepper>,
    );
    screen.getByRole('navigation', { name: 'Checkout' });

    // The trap this component destructures to avoid: a consumer's
    // `aria-label={maybe}` resolving to undefined must fall back to the DS
    // name, not delete it.
    rerender(
      <Stepper aria-label={undefined}>
        <StepperItem status="current">Cart</StepperItem>
      </Stepper>,
    );
    screen.getByRole('navigation', { name: 'Progress' });
  });

  it('paints the four states apart, and not by hue alone', () => {
    render(
      <Stepper>
        <StepperItem status="complete">Cart</StepperItem>
        <StepperItem status="current">Shipping</StepperItem>
        <StepperItem status="error">Payment</StepperItem>
        <StepperItem>Review</StepperItem>
      </Stepper>,
    );
    const [complete, current, error, upcoming] = items();

    // The circle is the fixed part — a collapsed marker is not a marker. 24px
    // exactly, which only holds because the marker is border-box: sized by its
    // content it would be 26px, and 28px wherever the border is the heavy one.
    expect(marker(complete).inlineSize).toBe('24px');
    expect(marker(complete).blockSize).toBe('24px');
    expect(marker(current).inlineSize).toBe('24px');
    expect(marker(current).blockSize).toBe('24px');

    // The NON-COLOUR channel: border weight is what survives forced colours
    // and reaches a reader for whom two tints of one accent are one tint.
    expect(marker(complete).borderTopWidth).toBe('1px');
    expect(marker(upcoming).borderTopWidth).toBe('1px');
    expect(marker(current).borderTopWidth).toBe('2px');
    expect(marker(error).borderTopWidth).toBe('2px');

    // …and no two states share a fill.
    const fills = [complete, current, error, upcoming].map(
      (el) => marker(el).backgroundColor,
    );
    expect(new Set(fills).size).toBe(4);

    // EACH FILL PINNED TO ITS OWN TOKEN, which "all four differ" does not do:
    // swapping `complete` and `current` outright leaves the set of four fills
    // identical, so the weaker assertion passes while every finished step
    // renders as "you are here". Measured — that mutation survived the first
    // version of this test. axe cannot catch it either: both pairings are
    // legal token pairs, so contrast passes whichever way round they are.
    const token = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    expect(marker(complete).backgroundColor).toBe(token('--fm-color-accent'));
    expect(marker(current).backgroundColor).toBe(
      token('--fm-color-accent-subtle'),
    );
    expect(marker(error).backgroundColor).toBe(
      token('--fm-color-error-subtle'),
    );
  });

  it('draws the step number, and hides it from the reader who is already told', () => {
    render(checkout);
    // Not `not.toBe('none')` — that passes for `content: ''`, i.e. for no
    // marker at all. The counter must be there, AND carry the empty
    // alternative text: measured in this engine, a plain `counter()` puts a
    // StaticText in the accessibility tree, which would announce the position
    // the <ol> already gives.
    const content = marker(items()[0]).content;
    expect(content).toContain('counter(fm-step)');
    expect(content).toContain('/');
  });

  it('draws a line between the steps and never after the last one', () => {
    render(checkout);
    const [first, , last] = items();
    expect(connector(first).content).toBe('""');
    expect(connector(first).position).toBe('absolute');
    expect(connector(last).content).toBe('none');
  });

  it('actually runs the way the orientation says', () => {
    const vertical = (
      <Stepper orientation="vertical">
        <StepperItem status="complete">Cart</StepperItem>
        <StepperItem status="current">Shipping</StepperItem>
      </Stepper>
    );
    const { rerender } = render(checkout);
    const list = () => screen.getByRole('list');

    // Asserting the attribute alone would only prove the component wrote what
    // it wrote — delete the CSS rule and a "vertical" stepper still renders as
    // a row. Measure the layout instead.
    expect(list()).toHaveAttribute('data-orientation', 'horizontal');
    expect(getComputedStyle(list()).flexDirection).toBe('row');
    const [a, b] = items().map((el) => el.getBoundingClientRect());
    expect(b.left).toBeGreaterThan(a.left);

    rerender(vertical);
    expect(list()).toHaveAttribute('data-orientation', 'vertical');
    expect(getComputedStyle(list()).flexDirection).toBe('column');
    const [c, d] = items().map((el) => el.getBoundingClientRect());
    expect(d.top).toBeGreaterThanOrEqual(c.bottom);
  });

  it('renders right-to-left with the sequence mirrored', () => {
    render(
      <div dir="rtl">
        <Stepper aria-label="الدفع">
          <StepperItem status="complete">السلة</StepperItem>
          <StepperItem status="current">الشحن</StepperItem>
        </Stepper>
      </div>,
    );
    // The geometry is written in logical properties, so the row reverses
    // without a single direction-specific rule.
    const [first, second] = items().map((el) => el.getBoundingClientRect());
    expect(second.left).toBeLessThan(first.left);
  });

  it('normalizes the ordered list the UA would otherwise indent and number', () => {
    // The DS ships no reset (ADR-0022) and the suite renders on the same bare
    // page a consumer has, so these are the values a consumer would get if the
    // rule were deleted: 40px indent, 16px block margins, decimal markers —
    // which would number every step twice, beside the marker we draw.
    render(checkout);
    const style = getComputedStyle(screen.getByRole('list'));
    expect(style.paddingInlineStart).toBe('0px');
    expect(style.marginBlockStart).toBe('0px');
    expect(style.marginBlockEnd).toBe('0px');
    expect(style.listStyleType).toBe('none');
  });

  it('draws a real marker on a step rendered outside a Stepper', () => {
    // The type system allows it, so the stylesheet has to survive it: the
    // marker's size is declared on the item itself, not inherited from a list
    // that may not be there.
    render(
      <ol>
        <StepperItem status="current">Alone</StepperItem>
      </ol>,
    );
    expect(marker(items()[0]).inlineSize).toBe('24px');
  });

  it('forwards refs and a consumer className on both halves', () => {
    const nav = createRef<HTMLElement>();
    const item = createRef<HTMLLIElement>();
    render(
      <Stepper ref={nav} className="mine">
        <StepperItem ref={item} className="step" status="current">
          Cart
        </StepperItem>
      </Stepper>,
    );
    expect(nav.current?.tagName).toBe('NAV');
    expect(nav.current).toHaveClass('mine');
    expect(item.current?.tagName).toBe('LI');
    // Merged, not replaced — the module class has to survive a consumer's.
    expect(item.current?.className).toContain('step');
    expect(item.current?.className.split(' ').length).toBeGreaterThan(1);
  });

  // ON A PAINTED SURFACE, the shape breadcrumb's axe tests use — and not for
  // tidiness: the DS paints no page background (that is the consumer's), so an
  // unpainted dark render puts the dark theme's LIGHT text on the harness's
  // white page and axe reports a contrast failure that no consumer would ever
  // see. Found by running it that way first.
  for (const theme of ['light', 'dark']) {
    it(`has no accessibility violations — ${theme}`, async () => {
      const { container } = renderUi(
        <div
          style={{
            background: 'var(--fm-color-background)',
            color: 'var(--fm-color-foreground)',
            padding: '1rem',
          }}
        >
          <Stepper>
            <StepperItem status="complete">Cart</StepperItem>
            <StepperItem status="current">Shipping</StepperItem>
            <StepperItem status="error">Payment</StepperItem>
            <StepperItem>Review</StepperItem>
          </Stepper>
        </div>,
        { theme },
      );
      await expectNoA11yViolations(container);
    });
  }
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { userEvent as browser } from '@vitest/browser/context';
import { Accordion } from './accordion.component.js';
import { AccordionItem } from '../accordion-item/accordion-item.component.js';
import { AccordionTrigger } from '../accordion-trigger/accordion-trigger.component.js';
import { AccordionContent } from '../accordion-content/accordion-content.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const Three = (props: { exclusive?: boolean }) => (
  <Accordion exclusive={props.exclusive}>
    {['Uno', 'Due', 'Tre'].map((t) => (
      <AccordionItem key={t}>
        <AccordionTrigger>{t}</AccordionTrigger>
        <AccordionContent>Contenuto {t}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const detailsOf = (name: string) =>
  screen.getByText(name).closest('details') as HTMLDetailsElement;

describe('Accordion', () => {
  it('renders each item as a real details/summary pair', () => {
    render(<Three />);
    for (const t of ['Uno', 'Due', 'Tre']) {
      const summary = screen.getByText(t);
      expect(summary.tagName).toBe('SUMMARY');
      expect(detailsOf(t).tagName).toBe('DETAILS');
      // The platform already exposes the state; we add no ARIA over it.
      expect(summary).not.toHaveAttribute('aria-expanded');
      expect(summary).not.toHaveAttribute('role');
    }
  });

  it('leaves items independent by default', async () => {
    render(<Three />);
    await browser.click(screen.getByText('Uno'));
    await browser.click(screen.getByText('Due'));
    expect(detailsOf('Uno').open).toBe(true);
    expect(detailsOf('Due').open).toBe(true);
  });

  it('closes the others when exclusive, without any state of ours', async () => {
    render(<Three exclusive />);
    await browser.click(screen.getByText('Uno'));
    expect(detailsOf('Uno').open).toBe(true);
    await browser.click(screen.getByText('Due'));
    expect(detailsOf('Uno').open).toBe(false);
    expect(detailsOf('Due').open).toBe(true);
  });

  it('gives every item of one accordion the same name, and a different one per accordion', () => {
    render(
      <>
        <Three exclusive />
        <Three exclusive />
      </>,
    );
    const names = screen
      .getAllByText('Uno')
      .map((s) => (s.closest('details') as HTMLDetailsElement).name);
    const [a, b] = names;
    expect(a).toBeTruthy();
    // Two accordions must not close each other's panels.
    expect(a).not.toBe(b);
  });

  it('names nothing when not exclusive', () => {
    render(<Three />);
    // The ATTRIBUTE, not the property: `HTMLDetailsElement.name` reflects `''`
    // whether the attribute is absent or present-and-empty, so the assertion
    // written for this decision could not see `name ?? ''` replacing it.
    expect(detailsOf('Uno').hasAttribute('name')).toBe(false);
  });

  it("opens on Enter and on Space, which are the platform's", async () => {
    render(<Three />);
    const summary = screen.getByText('Uno');
    summary.focus();
    await browser.keyboard('{Enter}');
    expect(detailsOf('Uno').open).toBe(true);
    await browser.keyboard(' ');
    expect(detailsOf('Uno').open).toBe(false);
  });

  it('keeps the panel in the DOM while closed, so find-in-page can reach it', () => {
    render(<Three />);
    expect(detailsOf('Uno').open).toBe(false);
    expect(screen.getByText('Contenuto Uno')).toBeInTheDocument();
  });

  it('merges a consumer className rather than dropping it', () => {
    render(
      <Accordion className="consumer" data-testid="root">
        <AccordionItem className="item-consumer" data-testid="item">
          <AccordionTrigger className="trigger-consumer">T</AccordionTrigger>
          <AccordionContent className="content-consumer">C</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.getByTestId('root')).toHaveClass('consumer');
    expect(screen.getByTestId('item')).toHaveClass('item-consumer');
    expect(screen.getByText('T')).toHaveClass('trigger-consumer');
    expect(screen.getByText('C')).toHaveClass('content-consumer');
    expect(
      screen.getByTestId('root').className.split(' ').length,
    ).toBeGreaterThan(1);
    // LAST, so a consumer's rule of equal specificity wins the cascade.
    // Swapping the two arguments of `cn` left every assertion above green.
    for (const [id, cls] of [
      ['root', 'consumer'],
      ['item', 'item-consumer'],
    ] as const) {
      expect(
        screen.getByTestId(id).className.trim().endsWith(cls),
        `${id}: the consumer class must come last`,
      ).toBe(true);
    }
  });

  it('warns a part used outside the family', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <AccordionItem>
        <AccordionTrigger>Orfano</AccordionTrigger>
      </AccordionItem>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('AccordionItem: used outside a <Accordion>'),
    );
    warn.mockRestore();
  });

  it('does not let one long word widen the stack', () => {
    render(
      <div style={{ width: '320px' }} data-testid="box">
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>
              Unaparolalunghissimaeinspezzabilechealtrimentiallargherebbelinterapila
            </AccordionTrigger>
          </AccordionItem>
          <AccordionItem>
            <AccordionTrigger>Corto</AccordionTrigger>
          </AccordionItem>
        </Accordion>
      </div>,
    );
    const box = screen.getByTestId('box').getBoundingClientRect().width;
    // BOTH items, and the comment used to say so while the loop ran one — the
    // one WITHOUT the long word. The stack is a grid, so the track sizes from
    // the widest item and a single word took every sibling with it: 538px in a
    // 320px box.
    for (const name of [
      'Corto',
      'Unaparolalunghissimaeinspezzabilechealtrimentiallargherebbelinterapila',
    ]) {
      const item = screen.getByText(name).closest('details') as HTMLElement;
      expect(item.getBoundingClientRect().width).toBeLessThanOrEqual(box);
    }
    expect(screen.getByTestId('box').scrollWidth).toBeLessThanOrEqual(
      Math.ceil(box),
    );
  });

  it('does not let a rigid wide child widen the stack either', () => {
    // The text case is answered by `overflow-wrap: anywhere`; this one is not,
    // and it is what `min-inline-size: 0` and the `minmax(0, 1fr)` track are
    // for. Measured with those two removed: both items rendered 650px inside a
    // 320px box. Removing them left the word test green, which is why this
    // exists beside it rather than instead of it.
    render(
      <div style={{ width: '320px' }} data-testid="box">
        <Accordion>
          <AccordionItem defaultOpen>
            <AccordionTrigger>Corto</AccordionTrigger>
            <AccordionContent>
              <div
                style={{ width: '600px', height: '10px' }}
                data-testid="rigid"
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem>
            <AccordionTrigger>Altro</AccordionTrigger>
          </AccordionItem>
        </Accordion>
      </div>,
    );
    const box = screen.getByTestId('box').getBoundingClientRect().width;
    for (const name of ['Corto', 'Altro']) {
      const item = screen.getByText(name).closest('details') as HTMLElement;
      expect(item.getBoundingClientRect().width).toBeLessThanOrEqual(box);
    }
  });

  it("keeps the stack spaced, which is the root's one layout job", () => {
    render(<Three />);
    const acc = screen.getByText('Uno').closest('details')
      ?.parentElement as HTMLElement;
    expect(Number.parseFloat(getComputedStyle(acc).rowGap)).toBeGreaterThan(0);
  });

  it('shows a focus indicator on the trigger', async () => {
    render(<Three />);
    const summary = screen.getByText('Uno');
    summary.focus();
    const style = getComputedStyle(summary);
    // Deleting the whole focus-visible block left the suite green except a
    // class hash: axe does not check focus visibility, and nothing else did.
    expect(summary).toHaveFocus();
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.outlineStyle).not.toBe('none');
  });

  it('puts the chevron at the far end of the row', () => {
    render(<Three />);
    const summary = screen.getByText('Uno');
    expect(getComputedStyle(summary).display).toBe('flex');
    expect(getComputedStyle(summary).justifyContent).toBe('space-between');
  });

  it('forwards native props on every part, not just ref and className', () => {
    // Dropping `{...rest}` wholesale from a part left the suite fully green:
    // the ref rides inside it in React 19, and the className test used
    // `data-testid`, so both kept passing while every other prop vanished.
    const onClick = vi.fn();
    render(
      <Accordion id="root-id" lang="it">
        <AccordionItem id="item-id" lang="it">
          <AccordionTrigger id="trigger-id" onClick={onClick} lang="it">
            T
          </AccordionTrigger>
          <AccordionContent id="content-id" lang="it">
            C
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    for (const id of ['root-id', 'item-id', 'trigger-id', 'content-id']) {
      const el = document.getElementById(id);
      expect(el, `${id} was not forwarded`).toBeTruthy();
      expect(el).toHaveAttribute('lang', 'it');
    }
    screen.getByText('T').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('seeds the OPEN attribute into server markup, not into an effect', () => {
    // A disclosure whose panel only opens after hydration is content invisible
    // without JavaScript, and a closed→open flash for everyone else. Measured
    // before this: the server HTML carried no `open` at all.
    const html = renderToStaticMarkup(
      <Accordion>
        <AccordionItem defaultOpen>
          <AccordionTrigger>Titolo</AccordionTrigger>
          <AccordionContent>Contenuto</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(html).toContain('<details');
    expect(html).toMatch(/<details[^>]*\sopen/);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Three />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations, open and closed — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              padding: '1rem',
            }}
          >
            <Accordion>
              <AccordionItem defaultOpen>
                <AccordionTrigger>Aperto</AccordionTrigger>
                <AccordionContent>Contenuto</AccordionContent>
              </AccordionItem>
              <AccordionItem>
                <AccordionTrigger>Chiuso</AccordionTrigger>
                <AccordionContent>Contenuto</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

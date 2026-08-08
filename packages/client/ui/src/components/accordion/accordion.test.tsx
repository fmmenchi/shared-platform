import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(detailsOf('Uno').name).toBe('');
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

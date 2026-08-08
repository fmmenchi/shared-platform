import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Accordion } from '../accordion/accordion.component.js';
import { AccordionItem } from '../accordion-item/accordion-item.component.js';
import { AccordionTrigger } from '../accordion-trigger/accordion-trigger.component.js';
import { AccordionContent } from './accordion-content.component.js';

const renderOne = (open?: boolean) =>
  render(
    <Accordion>
      <AccordionItem defaultOpen={open}>
        <AccordionTrigger>Titolo</AccordionTrigger>
        <AccordionContent data-testid="panel">Contenuto</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );

describe('AccordionContent', () => {
  it('takes no landmark role: a page of disclosures is not a page of regions', () => {
    renderOne(true);
    const panel = screen.getByTestId('panel');
    expect(panel).not.toHaveAttribute('role');
    expect(panel.tagName).toBe('DIV');
  });

  it('carries the padding the item deliberately does not', () => {
    renderOne(true);
    const panel = screen.getByTestId('panel');
    const item = panel.closest('details') as HTMLElement;
    expect(
      Number.parseFloat(getComputedStyle(panel).paddingInlineStart),
    ).toBeGreaterThan(0);
    // On the item it would band the closed row with unused space.
    expect(getComputedStyle(item).paddingInlineStart).toBe('0px');
  });

  it('stays in the DOM while the item is closed', () => {
    renderOne(false);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('forwards ref to its element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion>
        <AccordionItem>
          <AccordionTrigger>Titolo</AccordionTrigger>
          <AccordionContent ref={ref}>Contenuto</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

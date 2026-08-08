import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Accordion } from '../accordion/accordion.component.js';
import { AccordionItem } from '../accordion-item/accordion-item.component.js';
import { AccordionTrigger } from './accordion-trigger.component.js';

const renderOne = (extra?: Record<string, unknown>) =>
  render(
    <Accordion>
      <AccordionItem {...extra}>
        <AccordionTrigger>Titolo</AccordionTrigger>
      </AccordionItem>
    </Accordion>,
  );

describe('AccordionTrigger', () => {
  it('is a summary, focusable with no tabindex of ours', () => {
    renderOne();
    const summary = screen.getByText('Titolo');
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary).not.toHaveAttribute('tabindex');
    expect((summary as HTMLElement).tabIndex).toBe(0);
  });

  it('adds no ARIA over what the element already says', () => {
    renderOne();
    const summary = screen.getByText('Titolo');
    expect(summary).not.toHaveAttribute('aria-expanded');
    expect(summary).not.toHaveAttribute('role');
  });

  it('hides the UA marker and draws its own', () => {
    renderOne();
    const summary = screen.getByText('Titolo');
    expect(getComputedStyle(summary).listStyleType).toBe('none');
    // Our chevron is the ::after, and it is there in both states.
    expect(getComputedStyle(summary, '::after').content).not.toBe('none');
  });

  it('turns the chevron over when the item opens', () => {
    // Side by side rather than a rerender: the open state belongs to the
    // element, and comparing two live ones asks the cascade directly.
    render(
      <Accordion>
        <AccordionItem>
          <AccordionTrigger>Chiuso</AccordionTrigger>
        </AccordionItem>
        <AccordionItem defaultOpen>
          <AccordionTrigger>Aperto</AccordionTrigger>
        </AccordionItem>
      </Accordion>,
    );
    const rotate = (name: string) =>
      getComputedStyle(screen.getByText(name), '::after').rotate;
    expect(rotate('Chiuso')).not.toBe(rotate('Aperto'));
    expect(rotate('Aperto')).toContain('225');
  });

  it('does not mirror the chevron under rtl', () => {
    // A downward chevron is not directional. Comparing `rotate` cannot see this
    // — it is identical in both directions — so the BORDERS are what to read:
    // with logical ones they swapped and the glyph pointed left.
    render(
      <div dir="rtl">
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>عنوان</AccordionTrigger>
          </AccordionItem>
        </Accordion>
      </div>,
    );
    const after = getComputedStyle(screen.getByText('عنوان'), '::after');
    expect(Number.parseFloat(after.borderRightWidth)).toBeGreaterThan(0);
    expect(Number.parseFloat(after.borderBottomWidth)).toBeGreaterThan(0);
    expect(Number.parseFloat(after.borderLeftWidth)).toBe(0);
  });

  it('forwards ref to the summary', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Accordion>
        <AccordionItem>
          <AccordionTrigger ref={ref}>Titolo</AccordionTrigger>
        </AccordionItem>
      </Accordion>,
    );
    expect(ref.current?.tagName).toBe('SUMMARY');
  });
});

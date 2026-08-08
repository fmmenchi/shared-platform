import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Accordion } from '../accordion/accordion.component.js';
import { AccordionItem } from './accordion-item.component.js';
import { AccordionTrigger } from '../accordion-trigger/accordion-trigger.component.js';

const One = (props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => (
  <Accordion>
    <AccordionItem {...props}>
      <AccordionTrigger>Titolo</AccordionTrigger>
    </AccordionItem>
  </Accordion>
);

const details = () =>
  screen.getByText('Titolo').closest('details') as HTMLDetailsElement;

describe('AccordionItem', () => {
  it('is closed unless told otherwise', () => {
    render(<One />);
    expect(details().open).toBe(false);
  });

  it('opens at mount with `defaultOpen`', () => {
    render(<One defaultOpen />);
    expect(details().open).toBe(true);
  });

  it('is a SEED, not a control: it does not reopen after a close', async () => {
    const { rerender } = render(<One defaultOpen />);
    const node = details();
    expect(node.open).toBe(true);
    await browser.click(screen.getByText('Titolo'));
    expect(node.open).toBe(false);
    rerender(<One defaultOpen />);
    expect(node.open).toBe(false);
  });

  it('ignores `defaultOpen` while controlled — one writer, not two', () => {
    render(<One open={false} defaultOpen onOpenChange={() => undefined} />);
    expect(details().open).toBe(false);
  });

  it('opens and closes from the `open` prop', () => {
    const noop = () => undefined;
    const { rerender } = render(<One open={false} onOpenChange={noop} />);
    const node = details();
    expect(node.open).toBe(false);
    rerender(<One open onOpenChange={noop} />);
    expect(node.open).toBe(true);
    rerender(<One open={false} onOpenChange={noop} />);
    expect(node.open).toBe(false);
  });

  it('wins BACK: a toggle the user performs is undone while `open` is true', async () => {
    render(<One open onOpenChange={() => undefined} />);
    const node = details();
    expect(node.open).toBe(true);
    await browser.click(screen.getByText('Titolo'));
    await vi.waitFor(() => expect(node.open).toBe(true));
  });

  it('reports every toggle, whoever caused it', async () => {
    const onOpenChange = vi.fn();
    render(<One onOpenChange={onOpenChange} />);
    await browser.click(screen.getByText('Titolo'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await browser.click(screen.getByText('Titolo'));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('warns when `open` arrives without `onOpenChange`', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<One open />);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`open` was given without `onOpenChange`'),
    );
    warn.mockRestore();
  });

  it('warns when it switches between controlled and uncontrolled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(<One onOpenChange={() => undefined} />);
    rerender(<One open onOpenChange={() => undefined} />);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('switched between controlled and uncontrolled'),
    );
    warn.mockRestore();
  });

  it('forwards ref to the details element', () => {
    const ref = createRef<HTMLDetailsElement>();
    render(
      <Accordion>
        <AccordionItem ref={ref}>
          <AccordionTrigger>Titolo</AccordionTrigger>
        </AccordionItem>
      </Accordion>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDetailsElement);
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button.component.js';
import { Input } from '../input/input.component.js';
import { InputGroup } from '../input-group/input-group.component.js';

/**
 * The touch form, in the browser that reports a coarse pointer. The sibling
 * suite pins the cursor heights at 32/36/44; this one pins what a thumb gets.
 */
describe('Button on a touch screen', () => {
  it('gives every size a finger-sized target', () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </>,
    );
    for (const name of ['Small', 'Medium', 'Large']) {
      expect(
        screen.getByRole('button', { name }).getBoundingClientRect().height,
      ).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps an icon-only button square', () => {
    render(
      <Button
        size="sm"
        aria-label="Close"
        icon={<svg viewBox="0 0 16 16" />}
      />,
    );
    const box = screen.getByRole('button').getBoundingClientRect();
    // `aspect-square`, so the width follows the height rather than needing its
    // own rule — which is what makes 2.5.8's second dimension free.
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(Math.round(box.width)).toBe(Math.round(box.height));
  });

  it('still lines up with the field it sits beside', () => {
    render(
      <InputGroup>
        <Input aria-label="Search" />
        <Button size="sm">Go</Button>
      </InputGroup>,
    );
    const field = screen.getByRole('textbox').getBoundingClientRect();
    const button = screen.getByRole('button').getBoundingClientRect();
    // `InputGroup` centres rather than stretches, so a button that grew alone
    // would sit taller than the field it belongs to — a mismatch introduced by
    // the fix, not by the platform.
    expect(Math.round(button.height)).toBe(Math.round(field.height));
  });
});

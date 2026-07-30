import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { InputGroupSlot } from './input-group-slot.component.js';
import { InputGroup } from '../input-group/input-group.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';

/** The slot only means anything inside a field, so the host is declared once. */
const inGroup = (slot: React.ReactNode) =>
  renderUi(
    <InputGroup>
      {slot}
      <Input aria-label="Search" />
    </InputGroup>,
  );

describe('InputGroupSlot', () => {
  // Decorative is the default because it is what makes clicking the icon focus
  // the field: the event has to pass THROUGH the slot to reach the group's
  // handler. Asserted on the computed style, since that is the actual mechanism.
  it('lets pointer events through by default', () => {
    inGroup(<InputGroupSlot data-testid="slot">icon</InputGroupSlot>);
    expect(getComputedStyle(screen.getByTestId('slot')).pointerEvents).toBe(
      'none',
    );
  });

  it('takes pointer events back when it holds a control', () => {
    inGroup(
      <InputGroupSlot interactive data-testid="slot">
        <button type="button">Clear</button>
      </InputGroupSlot>,
    );
    expect(getComputedStyle(screen.getByTestId('slot')).pointerEvents).toBe(
      'auto',
    );
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('forwards ref to the underlying element', () => {
    let el: HTMLElement | null = null;
    inGroup(
      <InputGroupSlot
        ref={(node) => {
          el = node;
        }}
      >
        icon
      </InputGroupSlot>,
    );
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });
});

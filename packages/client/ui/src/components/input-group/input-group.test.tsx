import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputGroup } from './input-group.component.js';
import { InputGroupSlot } from '../input-group-slot/input-group-slot.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const search = (props?: { invalid?: boolean; disabled?: boolean }) =>
  renderUi(
    <InputGroup data-testid="group">
      <InputGroupSlot data-testid="icon">
        <span aria-hidden="true">⌕</span>
      </InputGroupSlot>
      <Input
        aria-label="Search"
        aria-invalid={props?.invalid || undefined}
        disabled={props?.disabled}
      />
    </InputGroup>,
  );

describe('InputGroup', () => {
  afterEach(() => vi.restoreAllMocks());

  it('leaves the control transparent — it is a plain child, spread and all', () => {
    render(
      <InputGroup>
        <Input aria-label="Search" placeholder="Type here" name="q" />
      </InputGroup>,
    );
    const control = screen.getByRole('textbox', { name: 'Search' });
    expect(control).toHaveAttribute('placeholder', 'Type here');
    expect(control).toHaveAttribute('name', 'q');
  });

  // The whole point: the chrome moves to the group, so the control must NOT draw
  // a second border inside it.
  it('takes the border, and strips the control of its own', () => {
    search();
    const group = screen.getByTestId('group');
    const control = screen.getByRole('textbox', { name: 'Search' });
    expect(
      Number.parseFloat(getComputedStyle(group).borderTopWidth),
    ).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(control).borderTopWidth)).toBe(0);
  });

  // The inset belongs to the GROUP, so it survives a field with no slots at all —
  // the case that rendered flush against the border while the slot owned it. Both
  // scenarios are pinned, because only one of them is the one people look at.
  it.each([
    [
      'with a slot',
      <InputGroup key="a" data-testid="group">
        <InputGroupSlot>
          <span aria-hidden="true">⌕</span>
        </InputGroupSlot>
        <Input aria-label="Search" />
      </InputGroup>,
    ],
    [
      'with no slot at all',
      <InputGroup key="b" data-testid="group">
        <Input aria-label="Search" />
      </InputGroup>,
    ],
  ])('keeps the text off the border %s', (_label, element) => {
    renderUi(element);
    const group = screen.getByTestId('group');
    const control = screen.getByRole('textbox', { name: 'Search' });
    const inset =
      control.getBoundingClientRect().left - group.getBoundingClientRect().left;
    expect(inset).toBeGreaterThanOrEqual(12);
  });

  it('shows the control’s invalid state on the group', () => {
    search({ invalid: true });
    const group = screen.getByTestId('group');
    expect(Number.parseFloat(getComputedStyle(group).borderTopWidth)).toBe(2);
  });

  it('draws the focus ring around the whole field, not around the control', async () => {
    const user = userEvent.setup();
    search();
    const group = screen.getByTestId('group');
    await user.click(screen.getByRole('textbox', { name: 'Search' }));
    expect(Number.parseFloat(getComputedStyle(group).outlineWidth)).toBe(2);
    expect(
      getComputedStyle(screen.getByRole('textbox', { name: 'Search' }))
        .outlineStyle,
    ).toBe('none');
  });

  // Clicking the field anywhere focuses the control, as a bare input does. The
  // decorative slot passes the event through (its pointer-events are none — see
  // the slot's own suite), and this handler is what receives it.
  it('focuses the control when the field is clicked beside it', () => {
    search();
    const control = screen.getByRole('textbox', { name: 'Search' });
    expect(control).not.toHaveFocus();
    fireEvent.mouseDown(screen.getByTestId('icon'));
    expect(control).toHaveFocus();
  });

  it('leaves a click on a real control alone', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <InputGroup>
        <Input aria-label="Search" />
        <InputGroupSlot interactive>
          <button type="button" onClick={onClick}>
            Clear
          </button>
        </InputGroupSlot>
      </InputGroup>,
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveFocus();
  });

  it('composes a consumer onMouseDown, and yields to its preventDefault', () => {
    const onMouseDown = vi.fn((event: React.MouseEvent) => {
      event.preventDefault();
    });
    render(
      <InputGroup onMouseDown={onMouseDown} data-testid="group">
        <InputGroupSlot data-testid="icon">icon</InputGroupSlot>
        <Input aria-label="Search" />
      </InputGroup>,
    );
    fireEvent.mouseDown(screen.getByTestId('icon'));
    expect(onMouseDown).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'Search' })).not.toHaveFocus();
  });

  it('warns when it holds no control — a field-shaped box nothing can type into', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <InputGroup>
        <InputGroupSlot>icon</InputGroupSlot>
      </InputGroup>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('InputGroup: no control inside'),
    );
  });

  it('forwards ref to the group element', () => {
    let el: HTMLElement | null = null;
    render(
      <InputGroup
        ref={(node) => {
          el = node;
        }}
      >
        <Input aria-label="Search" />
      </InputGroup>,
    );
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupSlot>icon</InputGroupSlot>
        <Input aria-label="Search" />
      </InputGroup>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations — plain, invalid and disabled / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <InputGroup>
              <InputGroupSlot>
                <span aria-hidden="true">⌕</span>
              </InputGroupSlot>
              <Input aria-label="Search" />
            </InputGroup>
            <InputGroup>
              <Input aria-label="Amount" aria-invalid />
              <InputGroupSlot>EUR</InputGroupSlot>
            </InputGroup>
            <InputGroup>
              <Input aria-label="Locked" disabled />
              <InputGroupSlot interactive>
                <button type="button">Clear</button>
              </InputGroupSlot>
            </InputGroup>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

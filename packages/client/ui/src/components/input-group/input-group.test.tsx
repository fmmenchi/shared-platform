import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputGroup } from './input-group.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const field = (props?: { invalid?: boolean; disabled?: boolean }) =>
  renderUi(
    <InputGroup data-testid="group">
      <span aria-hidden="true">⌕</span>
      <Input
        aria-label="Search"
        aria-invalid={props?.invalid || undefined}
        disabled={props?.disabled}
      />
    </InputGroup>,
  );

/** The field's outline, in px — 0 when there is none. Read through `outline-style`
 *  because `outline-width` computes to `medium` (3px) even with no outline drawn. */
const ringWidth = (el: HTMLElement) => {
  const style = getComputedStyle(el);
  return style.outlineStyle === 'none'
    ? 0
    : Number.parseFloat(style.outlineWidth);
};

/** The field's border, in px. It is an inset shadow, and a computed shadow reads
 *  `<color> <x> <y> <blur> <spread> inset` — so the border is the FOURTH length. */
const borderWidth = (el: HTMLElement) => {
  const lengths = getComputedStyle(el).boxShadow.match(/-?[\d.]+px/g) ?? [];
  return Number.parseFloat(lengths[3] ?? '0');
};

describe('InputGroup', () => {
  it('draws the border, and the control draws none', () => {
    field();
    expect(borderWidth(screen.getByTestId('group'))).toBeGreaterThan(0);
    expect(
      Number.parseFloat(
        getComputedStyle(screen.getByRole('textbox', { name: 'Search' }))
          .borderTopWidth,
      ),
    ).toBe(0);
  });

  // The stripping has to hold in EVERY state. The control's own invalid rule is
  // more specific than a plain reset, so without a matching one the field draws
  // two nested red borders — which is what shipped, and what the screenshot
  // baseline had frozen as correct.
  it('shows invalid on the group, and STILL none on the control', () => {
    field({ invalid: true });
    expect(borderWidth(screen.getByTestId('group'))).toBe(2);
    expect(
      Number.parseFloat(
        getComputedStyle(screen.getByRole('textbox', { name: 'Search' }))
          .borderTopWidth,
      ),
    ).toBe(0);
  });

  // The height comes from the control, so a grouped field and a bare one line up
  // in the same row. This is what having no size axis on the group buys.
  it('is exactly as tall as the same field without a group', () => {
    renderUi(
      <div>
        <InputGroup data-testid="group">
          <span aria-hidden="true">⌕</span>
          <Input aria-label="Grouped" />
        </InputGroup>
        <Input aria-label="Bare" data-testid="bare" />
      </div>,
    );
    expect(
      screen.getByTestId('group').getBoundingClientRect().height,
    ).toBeCloseTo(screen.getByTestId('bare').getBoundingClientRect().height, 1);
  });

  // `:focus-within` would light the whole field when a button inset beside the
  // control takes focus — telling the user the text field is active while their
  // caret is on the button.
  it('rings the field for the control’s focus, not for a button’s', () => {
    renderUi(
      <InputGroup data-testid="group">
        <Input aria-label="Search" />
        <button type="button">Clear</button>
      </InputGroup>,
    );
    const group = screen.getByTestId('group');
    screen.getByRole('button', { name: 'Clear' }).focus();
    expect(ringWidth(group)).toBe(0);
    screen.getByRole('textbox', { name: 'Search' }).focus();
    expect(ringWidth(group)).toBe(2);
  });

  // The state selectors read the DIRECT child, so a control nested inside
  // something inset beside the field cannot be mistaken for the field's own.
  it('ignores an input nested in what you inset beside the control', () => {
    renderUi(
      <InputGroup data-testid="group">
        <Input aria-label="Main" />
        <span>
          <input aria-label="Nested" aria-invalid="true" />
        </span>
      </InputGroup>,
    );
    expect(borderWidth(screen.getByTestId('group'))).toBe(1);
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
        <span aria-hidden="true">⌕</span>
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
              <span aria-hidden="true">⌕</span>
              <Input aria-label="Search" />
            </InputGroup>
            <InputGroup>
              <Input aria-label="Amount in euros" aria-invalid />
              <span aria-hidden="true">€</span>
            </InputGroup>
            <InputGroup>
              <Input aria-label="Locked" disabled />
            </InputGroup>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

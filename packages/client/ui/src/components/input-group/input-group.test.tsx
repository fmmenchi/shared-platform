import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { InputGroup } from './input-group.component.js';
import { Input } from '../input/input.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldError } from '../field-error/field-error.component.js';
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

  // What the control draws that the group also draws has to go in EVERY state, not
  // just the resting one — the disabled fill is more specific than a plain reset,
  // so without a matching one a disabled field shows its own grey box inside the
  // group's border.
  it('shows disabled on the group, and no second box on the control', () => {
    field({ disabled: true });
    const control = screen.getByRole('textbox', { name: 'Search' });
    expect(getComputedStyle(control).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(screen.getByTestId('group')).cursor).toBe(
      'not-allowed',
    );
  });

  // Whatever is inset has to clear the border by the same step the control's own
  // padding gives its text — the group has none of its own. Asserted per side,
  // because the two rules are scoped by `:first-child` / `:last-child` and it is
  // the scoping that can break.
  it.each([
    ['leading', 'paddingInlineStart'],
    ['trailing', 'paddingInlineEnd'],
  ] as const)('insets a %s affix from the border', (position, side) => {
    const affix = (
      <span data-testid="affix" aria-hidden="true">
        EUR
      </span>
    );
    renderUi(
      <InputGroup data-testid="group">
        {position === 'leading' ? affix : null}
        <Input aria-label="Amount" />
        {position === 'trailing' ? affix : null}
      </InputGroup>,
    );
    const style = getComputedStyle(screen.getByTestId('affix'));
    expect(Number.parseFloat(style[side])).toBeGreaterThanOrEqual(12);
    // …and it stays inside the field, whichever side it is on.
    expect(
      screen.getByTestId('affix').getBoundingClientRect().width,
    ).toBeGreaterThan(0);
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

  // How an error actually reaches the user, end to end and through three
  // components that know nothing about each other: `Field` puts `aria-invalid` on
  // the CONTROL, the group reads it off its direct child to draw the chrome, and
  // `FieldError` registers into the CONTROL's describedby. The group has no
  // `invalid` prop precisely because it would be a third source of truth.
  it('carries an error through Field → control → group, with no prop of its own', async () => {
    renderUi(
      <Field invalid data-testid="field">
        <FieldLabel>Budget in euros</FieldLabel>
        <InputGroup data-testid="group">
          <Input inputMode="decimal" />
          <span aria-hidden="true">€</span>
        </InputGroup>
        <FieldError>Enter an amount above zero.</FieldError>
      </Field>,
    );
    const control = screen.getByRole('textbox', { name: 'Budget in euros' });
    const message = screen.getByText('Enter an amount above zero.');

    // the state is on the control, where the form library would have put it
    expect(control).toHaveAttribute('aria-invalid', 'true');
    // the chrome follows, without the group being told anything
    expect(borderWidth(screen.getByTestId('group'))).toBe(2);
    // and the message describes the CONTROL, not the group
    await waitFor(() =>
      expect(control.getAttribute('aria-describedby')).toContain(message.id),
    );
    expect(
      screen.getByTestId('group').getAttribute('aria-describedby'),
    ).toBeNull();
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

  it('does not dress another form control up as an affix', () => {
    // A currency prefix beside a <Select> is a real form. The affix bucket was
    // `:not(input)`, so the select fell in: placeholder colour, `shrink-0`,
    // affix padding — a control in an affix costume, silently. The bucket now
    // means what it says (not a form control); the select keeps its own face.
    render(
      <InputGroup>
        <span>€</span>
        <select aria-label="Valuta">
          <option>EUR</option>
        </select>
      </InputGroup>,
    );
    const affix = screen.getByText('€');
    const select = screen.getByRole('combobox');
    const affixColor = getComputedStyle(affix).color;
    expect(getComputedStyle(select).color).not.toBe(affixColor);
    expect(getComputedStyle(select).flexShrink).not.toBe('0');
  });

  it('does not dress a BUTTON up as an affix either', () => {
    // The bucket said "not a form control", and a button is not one — so a
    // picker's trigger, a reveal, a clear all fell in and were painted as
    // decoration: a placeholder colour they should not wear, and `pe-3` on the
    // last child, which pushed the glyph off the centre of a square button that
    // had already set `p-0`. Measured on `DatePicker`, whose hover fill came out
    // a wide pale block, square where the group is round.
    render(
      <>
        <InputGroup>
          <span>€</span>
          <input aria-label="Importo" />
          <button type="button" aria-label="Svuota">
            ×
          </button>
        </InputGroup>
        {/* The same button outside a group, so the assertion is "the group adds
            nothing" rather than a guess at what a bare button's padding is. */}
        <button type="button" aria-label="Svuota fuori">
          ×
        </button>
      </>,
    );
    const affix = screen.getByText('€');
    const inside = screen.getByRole('button', { name: 'Svuota' });
    const outside = screen.getByRole('button', { name: 'Svuota fuori' });

    expect(getComputedStyle(inside).color).not.toBe(
      getComputedStyle(affix).color,
    );
    expect(getComputedStyle(inside).paddingInlineEnd).toBe(
      getComputedStyle(outside).paddingInlineEnd,
    );
  });

  it('keeps a focused button’s ring inside the group, which clips', async () => {
    render(
      <InputGroup>
        <input aria-label="Importo" />
        <button type="button" aria-label="Svuota">
          ×
        </button>
      </InputGroup>,
    );
    const button = screen.getByRole('button', { name: 'Svuota' });

    await browser.click(screen.getByRole('textbox', { name: 'Importo' }));
    await browser.tab();
    expect(button).toHaveFocus();

    // `overflow: hidden` keeps a long affix off the rounded border, and an
    // element's own outline escapes its own overflow — the group's does — but a
    // CHILD's does not. Measured before this rule: three sides of a ring and the
    // fourth cut at the group's edge, a keyboard user shown half an indicator.
    const offset = getComputedStyle(button).outlineOffset;
    expect(Number.parseFloat(offset)).toBeLessThan(0);
  });

  it('keeps a button clear of the border it would otherwise sit on', () => {
    const { container } = render(
      <InputGroup>
        <input aria-label="Importo" />
        <button type="button" aria-label="Svuota">
          ×
        </button>
      </InputGroup>,
    );
    const group = container.firstElementChild as HTMLElement;
    const button = screen.getByRole('button', { name: 'Svuota' });

    // Flush against the edge, a hover fill collides with the group's own border
    // and its radius — the group drawing an edge around a shape that does not
    // share it. Inline only: a vertical inset would make the group taller than
    // the same field without one, which the height test above forbids.
    expect(button.getBoundingClientRect().right).toBeLessThan(
      group.getBoundingClientRect().right,
    );
  });
});

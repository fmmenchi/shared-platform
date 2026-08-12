import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Radio } from './radio.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** The documented shape: a named group of options, each labelled by nesting. */
function renderGroup(props: { name?: string } = {}) {
  const { name = 'plan' } = props;
  return render(
    <Fieldset role="radiogroup">
      <FieldsetLegend>Plan</FieldsetLegend>
      <label>
        <Radio name={name} value="free" defaultChecked /> Free
      </label>
      <label>
        <Radio name={name} value="pro" /> Pro
      </label>
      <label>
        <Radio name={name} value="max" /> Max
      </label>
    </Fieldset>,
  );
}

describe('Radio', () => {
  it('is a radio that takes its name from the label it is nested in', () => {
    render(
      <label>
        <Radio /> Free
      </label>,
    );
    expect(screen.getByRole('radio', { name: 'Free' })).toBeInTheDocument();
  });

  it('is always type="radio" — the type is its identity, not an axis', () => {
    render(<Radio aria-label="free" />);
    expect(screen.getByRole('radio', { name: 'free' })).toHaveAttribute(
      'type',
      'radio',
    );
  });

  it('keeps its type against something that passes one anyway', () => {
    // The same untyped path `Checkbox` guards: a form adapter's bag is native
    // props TypeScript never saw, and Conform's `getInputProps` emits `type`
    // unconditionally (see `form/control-props.ts`).
    render(
      <Radio
        aria-label="free"
        {...({ type: 'text' } as Record<string, string>)}
      />,
    );
    expect(screen.getByRole('radio', { name: 'free' })).toHaveAttribute(
      'type',
      'radio',
    );
  });

  it('forwards ref to the input element', () => {
    let el: HTMLElement | null = null;
    render(
      <Radio
        aria-label="free"
        ref={(node) => {
          el = node;
        }}
      />,
    );
    expect(el).toBeInstanceOf(HTMLInputElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Radio aria-label="free" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // The reason this component is native rather than a drawn control: the
  // platform supplies the whole group interaction. If any of these break, the
  // choice in the component doc no longer pays for itself.
  describe('what the platform gives us for free', () => {
    it('makes options sharing a name mutually exclusive', async () => {
      renderGroup();

      await browser.click(screen.getByRole('radio', { name: 'Pro' }));
      expect(screen.getByRole('radio', { name: 'Pro' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Free' })).not.toBeChecked();
    });

    it('does NOT pair options that carry different names', async () => {
      // Guards the assertion above from being about rendering rather than
      // grouping: same markup, one name per option, no exclusivity.
      render(
        <>
          <label>
            <Radio name="a" defaultChecked /> First
          </label>
          <label>
            <Radio name="b" /> Second
          </label>
        </>,
      );
      await browser.click(screen.getByRole('radio', { name: 'Second' }));
      expect(screen.getByRole('radio', { name: 'First' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Second' })).toBeChecked();
    });

    it('moves the selection with the arrow keys', async () => {
      renderGroup();

      await browser.tab();
      expect(screen.getByRole('radio', { name: 'Free' })).toHaveFocus();
      await browser.keyboard('{ArrowDown}');
      expect(screen.getByRole('radio', { name: 'Pro' })).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'Pro' })).toBeChecked();
    });

    it('spends ONE tab stop on the whole group, not one per option', async () => {
      render(
        <>
          {renderGroupless()}
          <button type="button">After</button>
        </>,
      );

      await browser.tab();
      expect(screen.getByRole('radio', { name: 'Free' })).toHaveFocus();
      await browser.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('keeps the legend as the group name even with role="radiogroup"', () => {
      // The documented group markup overrides the fieldset's native `group`
      // role to make `aria-invalid` meaningful. The name must survive that:
      // the legend is the element's native labelling mechanism, not a property
      // of the implicit role — but a nameless group is silent, so pin it.
      renderGroup();
      expect(
        screen.getByRole('radiogroup', { name: 'Plan' }),
      ).toBeInTheDocument();
    });

    it('extends the click target to the label text', async () => {
      renderGroup();

      await browser.click(screen.getByText('Pro'));
      expect(screen.getByRole('radio', { name: 'Pro' })).toBeChecked();
    });
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the input', () => {
      render(<Radio aria-label="free" name="plan" value="free" required />);
      const radio = screen.getByRole('radio', { name: 'free' });
      expect(radio).toHaveAttribute('name', 'plan');
      expect(radio).toHaveAttribute('value', 'free');
      expect(radio).toBeRequired();
    });

    it('works uncontrolled — does not hijack checked', async () => {
      render(<Radio aria-label="free" defaultChecked={false} />);
      const radio = screen.getByRole<HTMLInputElement>('radio', {
        name: 'free',
      });
      await browser.click(radio);
      expect(radio.checked).toBe(true);
    });

    it('works controlled — forwards onChange and never owns the state', async () => {
      const onChange = vi.fn();
      render(<Radio aria-label="free" checked={false} onChange={onChange} />);
      const radio = screen.getByRole<HTMLInputElement>('radio', {
        name: 'free',
      });

      await browser.click(radio);
      expect(onChange).toHaveBeenCalledTimes(1);
      // Still unchecked: the consumer owns the value, we never wrote it.
      expect(radio.checked).toBe(false);
    });

    it('reflects the disabled state', () => {
      render(<Radio aria-label="free" disabled />);
      expect(screen.getByRole('radio', { name: 'free' })).toBeDisabled();
    });
  });

  describe('field wiring', () => {
    it('takes the id from a Field so its FieldLabel associates', () => {
      render(
        <Field>
          <FieldLabel>Free</FieldLabel>
          <Radio />
        </Field>,
      );
      expect(screen.getByRole('radio', { name: 'Free' })).toBeInTheDocument();
    });

    it('does NOT copy the group description onto each option', async () => {
      // A Fieldset describes the GROUP once. If a radio picked the description
      // up as well, a screen reader would repeat it on every option.
      render(
        <Fieldset role="radiogroup">
          <FieldsetLegend>Plan</FieldsetLegend>
          <FieldDescription>Pick one</FieldDescription>
          <label>
            <Radio name="plan" value="free" /> Free
          </label>
        </Fieldset>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toHaveAccessibleDescription('Pick one');
      expect(screen.getByRole('radio', { name: 'Free' })).not.toHaveAttribute(
        'aria-describedby',
      );
    });
  });

  describe('appearance', () => {
    it('tints the mark with the primary role', () => {
      // The one colour we own. Read as a computed value so a token rename that
      // silently resolves to nothing would fail here.
      const { container } = renderUi(
        <label>
          <Radio defaultChecked /> Free
        </label>,
      );
      const radio = container.querySelector('input') as HTMLInputElement;
      const accent = getComputedStyle(radio).accentColor;
      expect(accent).not.toBe('auto');
      expect(accent).toBe(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--fm-color-primary',
        ),
      );
    });

    it('is 18px square', () => {
      const { container } = renderUi(<Radio aria-label="free" />);
      const radio = container.querySelector('input') as HTMLInputElement;
      const box = radio.getBoundingClientRect();
      expect(box.width).toBe(18);
      expect(box.height).toBe(18);
    });

    it('keeps its size next to text long enough to wrap in a flex row', () => {
      // A flex item with a fixed size still shrinks without `flex: none`, and a
      // squashed radio is an oval. Asserted with real wrapping text rather than
      // by reading the property back.
      const { container } = renderUi(
        <label style={{ display: 'flex', gap: '8px', width: '120px' }}>
          <Radio />
          <span>
            A deliberately long option label that has to wrap onto several lines
          </span>
        </label>,
      );
      const radio = container.querySelector('input') as HTMLInputElement;
      expect(radio.getBoundingClientRect().width).toBe(18);
    });

    it('zeroes the UA margin, and the page can finally see it', () => {
      // Asserted at last: the refusal above it dated from the page that loaded
      // Preflight, which ADR-0022 removed — the suite now renders on the page a
      // consumer actually has, so deleting `margin: 0` turns this red.
      const { container } = render(
        <label>
          Uno
          <Radio name="g" value="1" />
        </label>,
      );
      const radio = container.querySelector('input') as HTMLInputElement;
      expect(getComputedStyle(radio).margin).toBe('0px');
    });
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — group / checked / disabled / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Fieldset role="radiogroup">
              <FieldsetLegend>Plan</FieldsetLegend>
              <FieldDescription>Pick one</FieldDescription>
              <label>
                <Radio name="plan" value="free" defaultChecked /> Free
              </label>
              <label>
                <Radio name="plan" value="pro" /> Pro
              </label>
              <label>
                <Radio name="plan" value="max" disabled /> Max
              </label>
            </Fieldset>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

/** The group markup without a Fieldset, for the tab-stop assertion. */
function renderGroupless() {
  return (
    <>
      <label>
        <Radio name="plan" value="free" defaultChecked /> Free
      </label>
      <label>
        <Radio name="plan" value="pro" /> Pro
      </label>
    </>
  );
}

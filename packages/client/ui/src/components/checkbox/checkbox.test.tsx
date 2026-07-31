import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox.component.js';
import { Field } from '../field/field.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Checkbox', () => {
  it('is a checkbox that takes its name from the label it is nested in', () => {
    render(
      <label>
        <Checkbox /> Accept the terms
      </label>,
    );
    expect(
      screen.getByRole('checkbox', { name: 'Accept the terms' }),
    ).toBeInTheDocument();
  });

  it('is always type="checkbox" — the type is its identity, not an axis', () => {
    render(<Checkbox aria-label="accept" />);
    expect(screen.getByRole('checkbox', { name: 'accept' })).toHaveAttribute(
      'type',
      'checkbox',
    );
  });

  it('forwards ref to the input element, alongside our own', () => {
    // The component keeps an internal ref for `indeterminate`, so the consumer's
    // ref must survive being merged with it.
    let el: HTMLElement | null = null;
    render(
      <Checkbox
        aria-label="accept"
        ref={(node) => {
          el = node;
        }}
      />,
    );
    expect(el).toBeInstanceOf(HTMLInputElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Checkbox aria-label="accept" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // `indeterminate` is a DOM property with no HTML attribute. React cannot set
  // it from props and says nothing when you try — the whole reason this prop
  // exists on the component rather than being left to the consumer.
  describe('indeterminate', () => {
    it('exposes the mixed state to assistive tech', () => {
      render(<Checkbox aria-label="all" indeterminate />);
      const box = screen.getByRole('checkbox', { name: 'all' });
      expect(box).toBePartiallyChecked();
      // The browser derives it natively — writing aria-checked ourselves would
      // be redundant ARIA that could then contradict the property.
      expect(box).not.toHaveAttribute('aria-checked');
    });

    it('is independent of checked', () => {
      render(
        <Checkbox aria-label="all" indeterminate defaultChecked={false} />,
      );
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'all',
      });
      expect(box.indeterminate).toBe(true);
      expect(box.checked).toBe(false);
    });

    it('clears when the prop goes false', async () => {
      const user = userEvent.setup();
      function Host() {
        const [mixed, setMixed] = useState(true);
        return (
          <>
            <Checkbox aria-label="all" indeterminate={mixed} />
            <button type="button" onClick={() => setMixed(false)}>
              settle
            </button>
          </>
        );
      }
      render(<Host />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'all',
      });
      expect(box.indeterminate).toBe(true);
      await user.click(screen.getByRole('button', { name: 'settle' }));
      expect(box.indeterminate).toBe(false);
    });

    it('is RESTORED after a click clears it, while the prop still says mixed', async () => {
      // The trap this component closes. Clicking an indeterminate box clears the
      // property natively. A parent that still considers itself mixed would then
      // disagree with the DOM forever if the effect were keyed on the prop — the
      // value never changed, so a keyed effect would never run again.
      const user = userEvent.setup();
      function Host() {
        const [, force] = useState(0);
        return (
          <Checkbox
            aria-label="all"
            indeterminate
            onChange={() => force((n) => n + 1)}
          />
        );
      }
      render(<Host />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'all',
      });

      await user.click(box);
      expect(box.indeterminate).toBe(true);
    });

    it('defaults to not mixed', () => {
      render(<Checkbox aria-label="one" />);
      expect(
        screen.getByRole('checkbox', { name: 'one' }),
      ).not.toBePartiallyChecked();
    });
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the input', () => {
      render(<Checkbox aria-label="accept" name="tos" value="yes" required />);
      const box = screen.getByRole('checkbox', { name: 'accept' });
      expect(box).toHaveAttribute('name', 'tos');
      expect(box).toHaveAttribute('value', 'yes');
      expect(box).toBeRequired();
    });

    it('works uncontrolled — does not hijack checked', async () => {
      const user = userEvent.setup();
      render(<Checkbox aria-label="accept" defaultChecked />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'accept',
      });
      await user.click(box);
      expect(box.checked).toBe(false);
    });

    it('works controlled — the parent drives it, and nothing moves without the parent', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Checkbox aria-label="accept" checked={false} onChange={onChange} />,
      );
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'accept',
      });
      await user.click(box);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(box.checked).toBe(false);
    });

    it('is driven from outside — parent state is the single source of truth', async () => {
      // What "controlled" buys, end to end: the box follows the parent's state,
      // and the parent can set it from anywhere (here a second button), with no
      // internal state in the component to fall out of step.
      const user = userEvent.setup();
      function Host() {
        const [on, setOn] = useState(false);
        return (
          <>
            <Checkbox
              aria-label="accept"
              checked={on}
              onChange={(e) => setOn(e.target.checked)}
            />
            <button type="button" onClick={() => setOn(true)}>
              force on
            </button>
          </>
        );
      }
      render(<Host />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'accept',
      });

      await user.click(box);
      expect(box.checked).toBe(true);
      await user.click(box);
      expect(box.checked).toBe(false);
      await user.click(screen.getByRole('button', { name: 'force on' }));
      expect(box.checked).toBe(true);
    });

    it('submits with the form, with no JavaScript state at all', () => {
      // Uncontrolled is not a lesser mode: the DOM is the state holder, so the
      // value reaches FormData without React knowing anything about it.
      render(
        <form data-testid="f">
          <label>
            <Checkbox name="tos" value="yes" defaultChecked /> Accept
          </label>
        </form>,
      );
      const data = new FormData(screen.getByTestId('f') as HTMLFormElement);
      expect(data.get('tos')).toBe('yes');
    });

    it('reflects the disabled state', () => {
      render(<Checkbox aria-label="accept" disabled />);
      expect(screen.getByRole('checkbox', { name: 'accept' })).toBeDisabled();
    });
  });

  describe('what the platform gives us', () => {
    it('does NOT pair boxes that share a name — unlike radios', async () => {
      // A misreading carried over from radios: `name` groups radios, but
      // checkboxes sharing one name are independent values of the same field.
      const user = userEvent.setup();
      render(
        <>
          <label>
            <Checkbox name="topics" value="a" /> A
          </label>
          <label>
            <Checkbox name="topics" value="b" /> B
          </label>
        </>,
      );
      await user.click(screen.getByRole('checkbox', { name: 'A' }));
      await user.click(screen.getByRole('checkbox', { name: 'B' }));
      expect(screen.getByRole('checkbox', { name: 'A' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'B' })).toBeChecked();
    });

    it('extends the click target to the label text', async () => {
      const user = userEvent.setup();
      render(
        <label>
          <Checkbox /> Accept the terms
        </label>,
      );
      await user.click(screen.getByText('Accept the terms'));
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('takes one tab stop per box — a group is not one stop, unlike radios', async () => {
      const user = userEvent.setup();
      render(
        <>
          <label>
            <Checkbox /> A
          </label>
          <label>
            <Checkbox /> B
          </label>
        </>,
      );
      await user.tab();
      expect(screen.getByRole('checkbox', { name: 'A' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('checkbox', { name: 'B' })).toHaveFocus();
    });
  });

  describe('field wiring', () => {
    it('takes the id from a Field so its label associates', () => {
      render(
        <Field label="Accept the terms">
          <Checkbox />
        </Field>,
      );
      expect(
        screen.getByRole('checkbox', { name: 'Accept the terms' }),
      ).toBeInTheDocument();
    });
  });

  describe('appearance', () => {
    it('tints the mark with the primary role', () => {
      const { container } = renderUi(
        <label>
          <Checkbox defaultChecked /> Accept
        </label>,
      );
      const box = container.querySelector('input') as HTMLInputElement;
      const accent = getComputedStyle(box).accentColor;
      expect(accent).not.toBe('auto');
      expect(accent).toBe(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--fm-color-primary',
        ),
      );
    });

    it('is 18px square, matching Radio', () => {
      const { container } = renderUi(<Checkbox aria-label="accept" />);
      const box = (
        container.querySelector('input') as HTMLInputElement
      ).getBoundingClientRect();
      expect(box.width).toBe(18);
      expect(box.height).toBe(18);
    });

    it('keeps its size next to text long enough to wrap in a flex row', () => {
      const { container } = renderUi(
        <label style={{ display: 'flex', gap: '8px', width: '120px' }}>
          <Checkbox />
          <span>
            A deliberately long consent sentence that has to wrap over lines
          </span>
        </label>,
      );
      const box = container.querySelector('input') as HTMLInputElement;
      expect(box.getBoundingClientRect().width).toBe(18);
    });

    // NOT asserted: the `margin: 0` reset — this page loads Tailwind Preflight,
    // which zeroes it anyway, so the test would pass with the line deleted.
    // Verified against the built stylesheet; see checkbox.mdx.
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — group / mixed / disabled / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Fieldset>
              <FieldsetLegend>Topics</FieldsetLegend>
              <label>
                <Checkbox indeterminate /> All
              </label>
              <label>
                <Checkbox name="topics" value="a" defaultChecked /> Alpha
              </label>
              <label>
                <Checkbox name="topics" value="b" /> Beta
              </label>
              <label>
                <Checkbox name="topics" value="c" disabled /> Gamma
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

import { describe, it, expect, vi, afterEach } from 'vitest';
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
  // Without this, a console spy survives into the next test carrying its call
  // history — which made a "does not warn" assertion fail on the PREVIOUS
  // test's warning.
  afterEach(() => vi.restoreAllMocks());

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

  it('keeps its type against something that passes one anyway', () => {
    // NOT hypothetical, and not reachable through the types: `type` is omitted
    // from the props, so this can only arrive from code TypeScript never saw —
    // which is exactly what a form adapter's bag is. `form/control-props.ts`
    // records that Conform's `getInputProps` emits `type` unconditionally from
    // the schema's constraints, and `forTag` returns an `<input>`'s bag
    // untouched. Measured before the fix: the attribute read `text`, the role
    // was gone, and the field submitted a string.
    render(
      <Checkbox
        aria-label="accept"
        {...({ type: 'text' } as Record<string, string>)}
      />,
    );
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

  // The third state is a VALUE of `checked` (Radix's model), not a prop of its
  // own — so "mixed" cannot disagree with "checked". The DOM cannot express it
  // as an attribute: `indeterminate` is a property React cannot set from props,
  // and passing it as one silently does nothing. The component bridges that.
  describe('the mixed state', () => {
    it('exposes the mixed state to assistive tech', () => {
      render(<Checkbox aria-label="all" checked="indeterminate" readOnly />);
      const box = screen.getByRole('checkbox', { name: 'all' });
      expect(box).toBePartiallyChecked();
      // The browser derives it natively — writing aria-checked ourselves would
      // be redundant ARIA that could then contradict the property.
      expect(box).not.toHaveAttribute('aria-checked');
    });

    it('is independent of checked', () => {
      render(<Checkbox aria-label="all" checked="indeterminate" readOnly />);
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
            <Checkbox
              aria-label="all"
              checked={mixed ? 'indeterminate' : false}
              readOnly
            />
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
      // Clicking a mixed box clears the property natively. A parent that still
      // considers itself mixed would otherwise disagree with the DOM for ever:
      // the prop never changed, so the keyed effect never runs again.
      const user = userEvent.setup();
      function Host() {
        const [, force] = useState(0);
        return (
          <Checkbox
            aria-label="all"
            checked="indeterminate"
            onChange={() => force((n) => n + 1)}
          />
        );
      }
      render(<Host />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'all',
      });

      // The precondition, so this asserts RESTORATION and not "ends up true".
      expect(box.indeterminate).toBe(true);
      await user.click(box);
      expect(box.indeterminate).toBe(true);
    });

    it('leaves the property alone when neither prop is given', () => {
      // The component must not write `false` unasked: that would stomp on a
      // consumer driving the property through the forwarded ref.
      render(<Checkbox aria-label="one" />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'one',
      });
      box.indeterminate = true;
      expect(box).toBePartiallyChecked();
    });

    it('still applies when the consumer also passes a ref', () => {
      // Verified as a real gap: replacing mergeRefs with `ref ?? el` left all
      // other tests green while silently disabling indeterminate for every
      // consumer that passes a ref.
      const mine = { current: null as HTMLInputElement | null };
      render(
        <Checkbox
          aria-label="all"
          checked="indeterminate"
          onChange={() => undefined}
          ref={mine}
        />,
      );
      const node = mine.current;
      expect(node).toBeInstanceOf(HTMLInputElement);
      expect(node?.indeterminate).toBe(true);
    });

    it('is UNCHECKED for form submission — the value follows the boolean', () => {
      // The mixed state is a rendering of "some of these are on", not a value.
      render(
        <form data-testid="f">
          <label>
            <Checkbox name="all" value="yes" checked="indeterminate" readOnly />{' '}
            All
          </label>
        </form>,
      );
      const data = new FormData(screen.getByTestId('f') as HTMLFormElement);
      expect(data.get('all')).toBeNull();
    });

    it('as a DEFAULT it is a starting value — a click settles it, and that is right', async () => {
      // Uncontrolled, nothing claims the box is still mixed after the user acts,
      // so the native clearing is the correct outcome. This is the case that
      // the old separate `indeterminate` prop turned into a lying control.
      const user = userEvent.setup();
      render(<Checkbox aria-label="all" defaultChecked="indeterminate" />);
      const box = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'all',
      });
      expect(box.indeterminate).toBe(true);

      await user.click(box);
      expect(box.indeterminate).toBe(false);
      expect(box.checked).toBe(true);
    });

    it('a boolean checked clears a mixed state it replaces', async () => {
      const user = userEvent.setup();
      function Host() {
        const [state, setState] = useState<'indeterminate' | boolean>(
          'indeterminate',
        );
        return (
          <>
            <Checkbox aria-label="all" checked={state} readOnly />
            <button type="button" onClick={() => setState(true)}>
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
      expect(box.checked).toBe(true);
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

    it('leaves onChange a plain passthrough, so React still polices controlled use', () => {
      // The component restores `indeterminate` from the element's own `change`
      // listener rather than by wrapping onChange. Wrapping put a handler on the
      // element permanently, which silently suppressed React's own "controlled
      // without onChange" warning — measured against Radio, which still emits it.
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      render(<Checkbox aria-label="accept" checked />);
      const warned = error.mock.calls.some((call) =>
        call.some((arg) =>
          String(arg).includes('without an `onChange` handler'),
        ),
      );
      expect(warned).toBe(true);
    });

    it('calls the consumer handler once, with the browser’s own post-click values', async () => {
      // The documented ordering. Restoring BEFORE the handler would show it a
      // value the browser never produced, breaking any handler that recomputes
      // the mixed state from the event.
      const user = userEvent.setup();
      const seen: Array<{ checked: boolean; indeterminate: boolean }> = [];
      render(
        <Checkbox
          aria-label="all"
          checked="indeterminate"
          onChange={(e) =>
            seen.push({
              checked: e.target.checked,
              indeterminate: e.target.indeterminate,
            })
          }
        />,
      );
      await user.click(screen.getByRole('checkbox', { name: 'all' }));
      expect(seen).toEqual([{ checked: true, indeterminate: false }]);
    });

    it('merges a consumer className rather than replacing ours', () => {
      const { container } = render(
        <Checkbox aria-label="a" className="mine" />,
      );
      const box = container.querySelector('input') as HTMLInputElement;
      expect(box.className).toContain('mine');
      expect(box.className.split(' ').length).toBeGreaterThan(1);
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
                <Checkbox checked="indeterminate" readOnly /> All
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

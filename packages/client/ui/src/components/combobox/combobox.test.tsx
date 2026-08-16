import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Combobox } from './combobox.component.js';
import { Field } from '../field/field.component.js';
import { InputGroup } from '../input-group/input-group.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano' },
  { id: '2', name: 'Málaga' },
  { id: '3', name: 'Manchester' },
  { id: '4', name: 'Torino' },
];

/** The three the consumer always supplies — the data is never ours. */
const wiring = {
  items: CITIES,
  getKey: (city: City) => city.id,
  getLabel: (city: City) => city.name,
};

const field = () => screen.getByRole('combobox');
const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement | null;
/**
 * The id the field POINTS AT, whether or not anything carries it.
 *
 * Split out from `activeOption` because that helper resolves the id to an
 * element, so it answers `null` for BOTH "the field points at nothing" and "the
 * field points at an id no element has" — a dangling IDREF, WCAG 4.1.2. A
 * mutation run measured what that costs: the render clamp, whose whole reason
 * for existing is that second case, could be deleted with the entire suite
 * green, because the one test written for it asserted `activeOption()` was null
 * and the broken state satisfies that as readily as the fixed one. Where the
 * distinction is the point, assert this.
 */
const activeId = () => field().getAttribute('aria-activedescendant');
/** The option the arrows are on — pointed at, never focused. */
const activeOption = () => {
  const id = activeId();
  return id === null ? null : document.getElementById(id);
};

describe('Combobox', () => {
  it('is a combobox that says what it controls', () => {
    const { container } = render(<Combobox {...wiring} aria-label="City" />);

    const input = screen.getByRole('combobox', { name: 'City' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    // The list exists while closed — `aria-controls` has to point at something
    // that is there — but it is `display: none`, so it is NOT in the
    // accessibility tree and `getByRole` rightly cannot see it.
    const closed = container.querySelector('[role="listbox"]');
    expect(input.getAttribute('aria-controls')).toBe(closed?.id);
  });

  describe('manual selection — opening highlights nothing', () => {
    it('opens with no active option, so Enter is still the form’s', async () => {
      // THE DESTRUCTIVE DEFECT THIS REPLACES: the list used to highlight row 0
      // the moment it opened, so someone typing "man" and pressing Enter to
      // SUBMIT got "Manchester" committed instead.
      const submitted = vi.fn();
      render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitted();
          }}
        >
          <Combobox {...wiring} aria-label="City" />
        </form>,
      );

      await browser.click(field());
      await browser.keyboard('man');
      await waitFor(() => {
        expect(field()).toHaveAttribute('aria-expanded', 'true');
      });
      expect(field()).not.toHaveAttribute('aria-activedescendant');

      await browser.keyboard('{Enter}');
      expect(submitted).toHaveBeenCalledTimes(1);
      expect(field()).toHaveValue('man');
    });

    it('takes Enter only once the user has moved to a row', async () => {
      const submitted = vi.fn();
      const { container } = render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitted();
          }}
        >
          <Combobox {...wiring} name="city" aria-label="City" />
        </form>,
      );

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{Enter}');

      expect(submitted).not.toHaveBeenCalled();
      expect(field()).toHaveValue('Milano');
      expect(carrier(container)).toHaveValue('1');
    });
  });

  it('scrolls the highlighted row into view, since nothing else will', async () => {
    // The highlight is an ATTRIBUTE and not focus, so the platform scrolls
    // nothing for us: past row nine a keyboard user watched a list that
    // appeared frozen. Every fixture in this file has four rows, so the effect
    // that fixes it could be deleted in silence.
    const MANY = Array.from({ length: 30 }, (_, index) => ({
      id: String(index),
      name: `City ${String(index)}`,
    }));
    const { container } = render(
      <Combobox {...wiring} items={MANY} aria-label="City" />,
    );

    await browser.click(field());
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(MANY.length);
    });
    const surface = container.querySelector('[popover]') as HTMLElement;
    expect(surface.scrollHeight).toBeGreaterThan(surface.clientHeight);

    await browser.keyboard('{ArrowDown}'.repeat(20));

    const row = activeOption() as HTMLElement;
    expect(row).toHaveTextContent('City 19');
    expect(surface.scrollTop).toBeGreaterThan(0);
    const seen = row.getBoundingClientRect();
    const view = surface.getBoundingClientRect();
    expect(seen.top).toBeGreaterThanOrEqual(view.top - 1);
    expect(seen.bottom).toBeLessThanOrEqual(view.bottom + 1);

    // AND `nearest` SPECIFICALLY, which everything above passes without:
    // `center` and `start` both keep the row on screen and both keep
    // `scrollTop` positive. What they lose is the documented half — "leaves a
    // row that is already visible alone" — and losing it means the list jumps
    // under the reader on every single arrow.
    const settled = surface.scrollTop;
    await browser.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('City 18');
    expect(surface.scrollTop).toBe(settled);
  });

  it('walks the rows with the arrows, and wraps both ways', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    // The click opened it with nothing active; the first press lands on row one.
    expect(field()).not.toHaveAttribute('aria-activedescendant');
    await browser.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Milano');

    await browser.keyboard('{ArrowUp}');
    // Up from the first row wraps to the last — the case no test used to press.
    expect(activeOption()).toHaveTextContent('Torino');

    await browser.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Milano');
    // THE WHOLE POINT OF THE PATTERN: the caret never moves.
    expect(field()).toHaveFocus();
  });

  it('opens on a click, so a pointer has a way in', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());

    await waitFor(() => {
      expect(field()).toHaveAttribute('aria-expanded', 'true');
    });
    // A touch or switch user facing an empty field could otherwise never see
    // the options — on the very platform the centred branch exists for.
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('filters as you type, ignoring case and accents', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('mala');

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option')).toHaveTextContent('Málaga');
  });

  it('shows the whole list again when it reopens after a pick', async () => {
    // The query is the label of what was chosen, so filtering by it left one
    // row — which reads to a screen reader as though every other city had gone.
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{Enter}');
    expect(field()).toHaveValue('Milano');

    await browser.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(4);
    });
  });

  it('announces the count WITH the query, because the count alone repeats', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('tor');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('“tor”: 1');
    });

    // Two searches that both leave one row produced a byte-identical string,
    // React committed no mutation, and the region said nothing at all.
    await browser.keyboard('{Backspace}{Backspace}{Backspace}mala');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('“mala”: 1');
    });
  });

  describe('the carrier, which is what a form actually sees', () => {
    it('submits the key through FormData', async () => {
      const sent = vi.fn();
      render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sent(new FormData(event.currentTarget).get('city'));
          }}
        >
          <Combobox {...wiring} name="city" aria-label="City" />
          <button type="submit">Save</button>
        </form>,
      );

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
      await browser.click(screen.getByRole('button', { name: 'Save' }));

      expect(sent).toHaveBeenCalledTimes(1);
      expect(sent).toHaveBeenCalledWith('3');
    });

    it('fires a real input event, which is how a ref-based binding hears it', async () => {
      // A React `value` prop would move the DOM and tell nobody: react-hook-form
      // reads `.value` off the node its ref was given and would never learn the
      // choice had changed. The write goes through the prototype setter.
      const heard = vi.fn();
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" />,
      );
      carrier(container)?.addEventListener('input', () => {
        heard(carrier(container)?.value);
      });

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(heard).toHaveBeenCalledWith('1');
      });
    });

    it('comes back from form.reset(), which a hidden input cannot', async () => {
      // A `type="hidden"` carrier is in value mode "default": reset restores its
      // current value onto itself. This is a CSS-hidden text input whose
      // `defaultValue` is a one-shot seed, so the reset has somewhere to go.
      const { container } = render(
        <form>
          <Combobox {...wiring} name="city" aria-label="City" />
          <button type="reset">Clear</button>
        </form>,
      );

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{Enter}');
      expect(carrier(container)).toHaveValue('1');

      await browser.click(screen.getByRole('button', { name: 'Clear' }));
      await waitFor(() => {
        expect(carrier(container)).toHaveValue('');
      });
    });

    it('is focusable, so an error summary can reach the field', () => {
      // `FormErrorSummary` finds a control by `name` and calls `focus()` on it.
      // A `hidden` attribute would make that a silent no-op.
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" />,
      );
      const node = carrier(container);
      expect(node).not.toBeNull();
      node?.focus();
      // Focused, it hands focus straight on to the visible field.
      expect(field()).toHaveFocus();
    });

    it('is disabled together with the field, so nothing is submitted', () => {
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" disabled />,
      );
      // A disabled control is not submitted; left enabled the carrier would keep
      // posting a value for a field the user was told they cannot touch.
      expect(carrier(container)).toBeDisabled();
      expect(field()).toBeDisabled();
    });

    it('is absent when there is no name to submit under', () => {
      const { container } = render(<Combobox {...wiring} aria-label="City" />);
      expect(carrier(container)).toBeNull();
    });
  });

  it('shows the label of a value it was given, rather than an empty box', async () => {
    // A seeded or controlled value used to render an EMPTY field that submitted
    // a key: the user saw "nothing chosen" while the form carried `2`.
    const { container } = render(
      <Combobox {...wiring} name="city" defaultValue="2" aria-label="City" />,
    );

    await waitFor(() => {
      expect(field()).toHaveValue('Málaga');
    });
    expect(carrier(container)).toHaveValue('2');
  });

  it('refuses to change under readOnly', async () => {
    const { container } = render(
      <Combobox {...wiring} name="city" aria-label="City" readOnly />,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{Enter}');

    // Typing is blocked by the platform; the arrows and Enter are ours to
    // refuse, and a read-only control that rewrote its own value would be
    // mutating submitted data.
    expect(carrier(container)).toHaveValue('');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape, and clears on the second one', async () => {
    const { container } = render(
      <Combobox {...wiring} name="city" aria-label="City" />,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{Enter}');
    expect(field()).toHaveValue('Milano');

    await browser.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(field()).toHaveAttribute('aria-expanded', 'true');
    });

    await browser.keyboard('{Escape}');
    await waitFor(() => {
      expect(field()).toHaveAttribute('aria-expanded', 'false');
    });

    await browser.keyboard('{Escape}');
    expect(field()).toHaveValue('');
    expect(carrier(container)).toHaveValue('');
  });

  it('survives being opened and closed over and over', async () => {
    // THE FLAKE THIS REPLACES: the mirror re-subscribed on every open↔close
    // transition, its cleanup reported closed, its setup re-read a DOM the sync
    // effect had not caught up with, and the state was resurrected to open.
    // Roughly one cold run in five failed on the third cycle.
    const onOpenChange = vi.fn();
    render(
      <Combobox {...wiring} aria-label="City" onOpenChange={onOpenChange} />,
    );
    // Focus first: the keyboard goes to `body` otherwise, and the component
    // would never see a key.
    field().focus();

    for (let cycle = 0; cycle < 5; cycle += 1) {
      await browser.keyboard('{ArrowDown}');
      await waitFor(() => {
        expect(field()).toHaveAttribute('aria-expanded', 'true');
      });
      await browser.keyboard('{Escape}');
      await waitFor(() => {
        expect(field()).toHaveAttribute('aria-expanded', 'false');
      });
    }
  });

  it('does not filter what a server already filtered', async () => {
    render(
      <Combobox
        {...wiring}
        items={[{ id: '9', name: 'Zurich' }]}
        filter={false}
        aria-label="City"
      />,
    );

    await browser.click(field());
    await browser.keyboard('mila');

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option')).toHaveTextContent('Zurich');
  });

  it('says so when nothing matches, from outside the listbox', async () => {
    // ARIA 1.2 lets a `listbox` own `option` and `group` and nothing else, so
    // the message is a sibling of the list rather than a row in it.
    const { container } = render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('zzz');

    await waitFor(() => {
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });
    const list = container.querySelector('[role="listbox"]');
    expect(list).not.toHaveTextContent('No results');
    expect(screen.getByText('No results')).toBeTruthy();
  });

  describe('inside a Field, which is where a label comes from', () => {
    it('takes the id, the description and the invalid state', async () => {
      render(
        <Field label="City" invalid>
          <Combobox {...wiring} name="city" />
          <FieldError>Pick one.</FieldError>
        </Field>,
      );

      // Without `useFieldControl` the label pointed at an id no element carried,
      // and the combobox had no accessible name at all.
      const input = screen.getByRole('combobox', { name: 'City' });
      expect(input).toHaveAccessibleDescription(/Pick one\./);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('controlled and uncontrolled, on all three axes', () => {
    it('reports the choice and the typing to a controlled parent', async () => {
      function Controlled() {
        const [value, setValue] = useState<string | null>(null);
        const [query, setQuery] = useState('');
        return (
          <>
            <Combobox
              {...wiring}
              aria-label="City"
              value={value}
              onValueChange={setValue}
              query={query}
              onQueryChange={setQuery}
            />
            <p>{`${query}/${value ?? '-'}`}</p>
          </>
        );
      }
      render(<Controlled />);

      await browser.click(field());
      await browser.keyboard('tor');
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
      await browser.keyboard('{ArrowDown}{Enter}');

      expect(screen.getByText('Torino/4')).toBeTruthy();
    });

    it('lets a parent hold the open state', async () => {
      const onOpenChange = vi.fn();
      render(
        <Combobox
          {...wiring}
          aria-label="City"
          defaultOpen
          onOpenChange={onOpenChange}
        />,
      );

      await waitFor(() => {
        expect(field()).toHaveAttribute('aria-expanded', 'true');
      });
      await browser.keyboard('{Escape}');
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  it('honours its size axis, and merges the consumer className', () => {
    // Both were unasserted, and `Select`'s suite records the same two as having
    // shipped green once already: `comboboxVariants({})` and dropping
    // `className` from `cn` each left everything passing.
    const { container } = render(
      <Combobox {...wiring} aria-label="City" size="lg" className="mine" />,
    );
    const input = field();
    expect(input.classList.contains('mine')).toBe(true);
    expect(input.className).not.toBe('mine');
    expect(container.querySelectorAll('input')).toHaveLength(1);
  });

  it('forwards ref to the field a person types in', () => {
    let node: HTMLElement | null = null;
    render(
      <Combobox
        {...wiring}
        aria-label="City"
        ref={(element) => {
          node = element;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
    expect((node as unknown as HTMLInputElement).getAttribute('role')).toBe(
      'combobox',
    );
  });

  it('gives a bound wrapper a ref to the carrier', () => {
    let node: HTMLInputElement | null = null;
    const { container } = render(
      <Combobox
        {...wiring}
        name="city"
        aria-label="City"
        carrierRef={(element) => {
          node = element;
        }}
      />,
    );
    // The two refs have two jobs and want two different nodes.
    expect(node).toBe(carrier(container));
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <Combobox {...wiring} name="city" aria-label="City" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations, open, with a row highlighted — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Combobox {...wiring} name="city" aria-label="City" />
          </div>,
          { theme },
        );
        await browser.click(field());
        await browser.keyboard('{ArrowDown}');
        await expectNoA11yViolations(container);
      });

      it(`has no violations with nothing matching — ${name}`, async () => {
        // The branch axe never saw: the empty message used to sit INSIDE the
        // listbox, where owned content that is not an `option` is a violation.
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Combobox {...wiring} name="city" aria-label="City" />
          </div>,
          { theme },
        );
        await browser.click(field());
        await browser.keyboard('zzz');
        await waitFor(() => {
          expect(screen.queryAllByRole('option')).toHaveLength(0);
        });
        await expectNoA11yViolations(container);
      });
    }
  });

  describe('creating what is not there, and accepting what was typed', () => {
    it('offers the create row as an OPTION, reachable by the arrows', async () => {
      const onCreate = vi.fn();
      render(<Combobox {...wiring} aria-label="City" onCreate={onCreate} />);

      await browser.click(field());
      await browser.keyboard('Bologna');

      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
      // A row, not a button beside the field: it inherits the keyboard, the
      // highlight and the announcement that already exist.
      const offer = screen.getByRole('option');
      expect(offer).toHaveTextContent('Create “Bologna”');
      expect(offer.closest('[role="listbox"]')).not.toBeNull();

      await browser.keyboard('{ArrowDown}');
      expect(activeOption()).toBe(offer);
      await browser.keyboard('{Enter}');
      expect(onCreate).toHaveBeenCalledWith('Bologna');
    });

    it('counts the offer in the row metadata, so the announcement is true', async () => {
      const onCreate = vi.fn();
      render(<Combobox {...wiring} aria-label="City" onCreate={onCreate} />);

      await browser.click(field());
      await browser.keyboard('mila');

      await waitFor(() => {
        // Milano, plus the offer.
        expect(screen.getAllByRole('option')).toHaveLength(2);
      });
      for (const option of screen.getAllByRole('option')) {
        expect(option).toHaveAttribute('aria-setsize', '2');
      }
    });

    it('does not offer to create what the list already says', async () => {
      const onCreate = vi.fn();
      render(<Combobox {...wiring} aria-label="City" onCreate={onCreate} />);

      await browser.click(field());
      await browser.keyboard('milano');

      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
      expect(screen.getByRole('option')).toHaveTextContent('Milano');
    });

    it('asks the consumer when the default is wrong for the list', async () => {
      const onCreate = vi.fn();
      render(
        <Combobox
          {...wiring}
          aria-label="City"
          onCreate={onCreate}
          canCreate={(query) => query.length >= 5}
        />,
      );

      await browser.click(field());
      await browser.keyboard('zzz');
      await waitFor(() => {
        expect(screen.queryAllByRole('option')).toHaveLength(0);
      });

      await browser.keyboard('zz');
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
    });

    it('submits nothing for an unmatched query — this is a chooser by default', async () => {
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" />,
      );

      await browser.click(field());
      await browser.keyboard('Bologna');

      // The default that matters: a form does not post a typo as if it were a
      // record.
      await waitFor(() => {
        expect(carrier(container)).toHaveValue('');
      });
    });

    it('submits the typed text once free text is on', async () => {
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" freeText />,
      );

      await browser.click(field());
      await browser.keyboard('Bologna');

      await waitFor(() => {
        expect(carrier(container)).toHaveValue('Bologna');
      });
    });

    it('drops a choice the text no longer says', async () => {
      // Picked "Milano" and then typed over it, the field read the new text
      // while the carrier still held the old key: the user saw one thing and
      // the form sent another.
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" />,
      );

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{Enter}');
      expect(carrier(container)).toHaveValue('1');

      await browser.keyboard('x');
      await waitFor(() => {
        expect(carrier(container)).toHaveValue('');
      });
      expect(field()).toHaveValue('Milanox');
    });

    it('adopts the key onCreate returns, so the field and the form agree', async () => {
      // THE DEFECT THIS CLOSES, and it is the exact class the component exists
      // around: the offer reported the intent and left `chosen` null, so the box
      // read "Bologna" over a form submitting an empty string. Uncontrolled
      // there was no repair available at all — `onCreate` was handed a string
      // and could hand nothing back.
      const { container } = render(
        <Combobox
          {...wiring}
          name="city"
          aria-label="City"
          onCreate={(query) => (query === 'Bologna' ? '9' : null)}
        />,
      );

      await browser.click(field());
      await browser.keyboard('Bologna{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(carrier(container)).toHaveValue('9');
      });
      // The row for it does not exist yet — the consumer adds it — so the query
      // stays as the label until `items` catch up.
      expect(field()).toHaveValue('Bologna');
    });

    it('warns when a create leaves the field and the form disagreeing', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Combobox
          {...wiring}
          name="city"
          aria-label="City"
          onCreate={vi.fn()}
        />,
      );

      await browser.click(field());
      await browser.keyboard('Bologna{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('`onCreate` returned nothing'),
        );
      });
      warn.mockRestore();
    });

    it('does not offer to duplicate a row the accents hid', async () => {
      // The filter folds accents and the offer's own check did not, so the two
      // disagreed on this package's own fixture: `Málaga` stayed in the list and
      // `Create “malaga”` appeared directly beneath it. The obvious action was
      // to create a duplicate of a record visible on the same screen.
      render(<Combobox {...wiring} aria-label="City" onCreate={vi.fn()} />);

      await browser.click(field());
      await browser.keyboard('malaga');

      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
      expect(screen.getByRole('option')).toHaveTextContent('Málaga');
    });

    it('does not offer to duplicate a row a stray space hid', async () => {
      // Worse than the accents, because the check passed TRIVIALLY: the filter
      // dropped every row, so nothing said it, so the offer appeared alone —
      // and `onCreate` was handed the untrimmed string.
      render(<Combobox {...wiring} aria-label="City" onCreate={vi.fn()} />);

      await browser.click(field());
      await browser.keyboard('Milano ');

      await waitFor(() => {
        expect(field()).toHaveValue('Milano ');
      });
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('narrows with canCreate and never widens it', async () => {
      // REPLACING the duplicate check rather than refining it, this package's
      // own documented example offered to create a row that was selected two
      // lines above it.
      const onCreate = vi.fn();
      render(
        <Combobox
          {...wiring}
          aria-label="City"
          onCreate={onCreate}
          canCreate={(query) => query.length >= 5}
        />,
      );

      await browser.click(field());
      await browser.keyboard(
        '{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}',
      );
      expect(field()).toHaveValue('Torino');

      // Reopened on the chosen label: six characters, so the consumer's rule
      // passes — and the built-in check is what has to stop the offer.
      await browser.keyboard('{ArrowDown}');
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(CITIES.length);
      });
      for (const option of screen.getAllByRole('option')) {
        expect(option).not.toHaveTextContent('Create');
      }
    });

    it('announces the creation, which nothing else would', async () => {
      // Activating the offer selects no option and leaves the field reading the
      // text it already held, so NOTHING changed for a screen-reader user to
      // hear: they were returned to the field with no confirmation at all.
      // Choosing an ordinary row needs no message — the field's value changes.
      const { container } = render(
        <Combobox {...wiring} aria-label="City" onCreate={() => '9'} />,
      );
      const status = container.querySelector('[role="status"]');

      await browser.click(field());
      await browser.keyboard('Bologna{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(status).toHaveTextContent('Created “Bologna”');
      });
    });

    it('gives the offer an id of its own, not the first row’s', async () => {
      // With one id shared between the offer and row 0, `getElementById`
      // answers with whichever comes FIRST in the document — the real row. So
      // `aria-activedescendant` would name "Milano" while the highlight was
      // painted on `Create “mila”`: the screen reader and the screen disagreeing
      // about which row `Enter` takes, over a pair of duplicate ids that no rule
      // in this suite looks for.
      render(<Combobox {...wiring} aria-label="City" onCreate={vi.fn()} />);

      await browser.click(field());
      await browser.keyboard('mila');
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(2);
      });

      const [row, offer] = screen.getAllByRole('option');
      expect(offer?.id).not.toBe(row?.id);

      await browser.keyboard('{ArrowDown}{ArrowDown}');
      expect(activeOption()).toBe(offer);
      expect(activeOption()).toHaveTextContent('Create “mila”');
    });

    it('counts the offer in the announcement, as the row metadata already did', async () => {
      // The two counts of one list contradicted each other out loud: every row
      // announced "1 of 1" while the region said "Results for “Bologna”: 0", so
      // the one action available was described as nothing to do.
      const { container } = render(
        <Combobox {...wiring} aria-label="City" onCreate={vi.fn()} />,
      );
      const status = container.querySelector('[role="status"]');

      await browser.click(field());
      await browser.keyboard('Bologna');

      await waitFor(() => {
        expect(status).toHaveTextContent('Results for “Bologna”: 1');
      });
      expect(screen.getByRole('option')).toHaveAttribute('aria-setsize', '1');
    });
  });

  describe('the pointer, which this suite had stopped testing', () => {
    // RESTORED. The commit that answered an earlier review deleted the only
    // test that clicked a row and replaced it with one about `readOnly`, so
    // `onMouseDown`, its `preventDefault` — the pattern's central claim — and
    // the whole pointer path were free to delete. The touch file measures that
    // rows are 44px for a finger; nothing proved a finger did anything.
    it('picks with the pointer without taking focus off the field', async () => {
      const { container } = render(
        <Combobox {...wiring} name="city" aria-label="City" />,
      );

      await browser.click(field());
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(CITIES.length);
      });
      await browser.click(screen.getByRole('option', { name: 'Manchester' }));

      expect(carrier(container)).toHaveValue('3');
      expect(field()).toHaveValue('Manchester');
      // The whole reason for `preventDefault` on mousedown: focus never leaves,
      // because `aria-activedescendant` on a field nobody is in points at
      // nothing.
      expect(field()).toHaveFocus();
    });

    it('activates the offer with the pointer too', async () => {
      const onCreate = vi.fn();
      render(<Combobox {...wiring} aria-label="City" onCreate={onCreate} />);

      await browser.click(field());
      await browser.keyboard('Bologna');
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
      await browser.click(screen.getByRole('option'));

      expect(onCreate).toHaveBeenCalledWith('Bologna');
      expect(field()).toHaveFocus();
    });

    it('paints a hovered row without arming Enter', async () => {
      // Manual selection, defeated through the other input device: hover set
      // the same state the arrows set, so resting the pointer on a row while
      // reading the list and pressing Enter to SUBMIT committed the hovered row.
      const submitted = vi.fn();
      render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitted();
          }}
        >
          <Combobox {...wiring} name="city" aria-label="City" />
          <button type="submit">Save</button>
        </form>,
      );

      await browser.click(field());
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(CITIES.length);
      });
      await browser.hover(screen.getByRole('option', { name: 'Torino' }));

      expect(activeOption()).toBeNull();
      await browser.keyboard('{Enter}');
      expect(submitted).toHaveBeenCalledTimes(1);
      expect(field()).toHaveValue('');
    });
  });

  describe('the carrier’s other direction — writes that arrive from outside', () => {
    it('keeps a value a binding assigned before the effects ran', async () => {
      // `register()`'s ref callback fires in the COMMIT phase, so a
      // `defaultValues: { city: '2' }` is already on the node when the
      // component's first passive effect runs. Pushed blindly, that effect
      // wrote an empty string over it and told the library the field was now
      // empty — the default value destroyed on mount, measured on `DateInput`
      // before it was measured here.
      let seeded = false;
      const { container } = render(
        <Combobox
          {...wiring}
          name="city"
          aria-label="City"
          carrierRef={(node) => {
            if (node && !seeded) {
              seeded = true;
              node.value = '2';
            }
          }}
        />,
      );

      await waitFor(() => {
        expect(field()).toHaveValue('Málaga');
      });
      expect(carrier(container)).toHaveValue('2');
    });

    it('follows a bare assignment, which is how a controlled adapter writes', async () => {
      // Formik and TanStack hand over a `value` and no ref, so `useBoundCarrier`
      // assigns the node directly. Unheard, the box stayed empty and the next
      // commit wrote the empty string back — `setFieldValue` wiping the
      // library's own state through the control it was setting.
      const held = { current: null as HTMLInputElement | null };
      render(
        <Combobox
          {...wiring}
          name="city"
          aria-label="City"
          carrierRef={held}
        />,
      );

      await act(async () => {
        if (held.current) held.current.value = '3';
      });

      expect(field()).toHaveValue('Manchester');
      expect(held.current).toHaveValue('3');
    });

    it('follows form.reset() with its state and not only its DOM', async () => {
      // The DOM half already worked — the seed is a one-shot, so the platform
      // has somewhere to revert to. The STATE half did not exist: after a reset
      // the field went on showing the discarded choice, and the first commit
      // after it wrote that choice back onto the carrier and re-reported it to
      // the binding.
      const { container } = render(
        <form>
          <Combobox
            {...wiring}
            name="city"
            defaultValue="1"
            aria-label="City"
          />
          <button type="reset">Clear</button>
        </form>,
      );
      expect(field()).toHaveValue('Milano');

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
      expect(carrier(container)).toHaveValue('3');

      await browser.click(screen.getByRole('button', { name: 'Clear' }));
      await waitFor(() => {
        expect(carrier(container)).toHaveValue('1');
      });
      expect(field()).toHaveValue('Milano');

      // AND STAYS THERE. Any commit re-runs the push effect; keyed on the state
      // alone it found the carrier disagreeing and undid the reset.
      await browser.click(field());
      expect(carrier(container)).toHaveValue('1');
      expect(field()).toHaveValue('Milano');
    });
  });

  describe('the list changing underneath the highlight', () => {
    it('starts at the top when the list shrank under a stale highlight', async () => {
      // The render clamped the highlight and `move()` did not: with `active` at
      // 3 and the list down to 3 rows, `aria-activedescendant` correctly
      // disappeared and the next `ArrowDown` computed `4 % 3` and landed on the
      // SECOND row — a row the user never looked at, one keystroke from Enter.
      const { rerender } = render(
        <Combobox {...wiring} filter={false} aria-label="City" />,
      );

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(activeOption()).toHaveTextContent('Torino');

      rerender(
        <Combobox
          {...wiring}
          items={CITIES.slice(0, 3)}
          filter={false}
          aria-label="City"
        />,
      );
      expect(activeOption()).toBeNull();

      await browser.keyboard('{ArrowDown}');
      expect(activeOption()).toHaveTextContent('Milano');
    });

    it('points at nothing rather than at an id that is gone', async () => {
      // THE TEST ABOVE CANNOT TELL THOSE TWO APART. `activeOption()` resolves
      // the id to an element, so an absent `aria-activedescendant` and one
      // naming an id nothing carries both come back `null` — and a mutation run
      // measured the cost: the render clamp, written for exactly this, could be
      // deleted with all 68 assertions green. The broken form is a dangling
      // IDREF (WCAG 4.1.2): a screen reader is told the focus is on a row that
      // is not in the tree, and `Enter` is a silent no-op. So assert the
      // ATTRIBUTE, which is the thing that is either there or not.
      const { rerender } = render(
        <Combobox {...wiring} filter={false} aria-label="City" />,
      );

      await browser.click(field());
      await browser.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(activeOption()).toHaveTextContent('Torino');

      rerender(
        <Combobox
          {...wiring}
          items={CITIES.slice(0, 3)}
          filter={false}
          aria-label="City"
        />,
      );
      // AND THE LIST IS STILL OPEN, which is the second cause of that same
      // `null`: `aria-activedescendant` is written as `showing && highlighted
      // !== null`, so a change that closed the surface when `items` moved would
      // make this test green with the clamp deleted. One attribute, two reasons
      // — the shape this whole commit is about, one level up.
      expect(field()).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByRole('option')).toHaveLength(3);
      expect(activeId()).toBeNull();
    });

    it('drops the highlight the moment the query changes under it', async () => {
      // The HOOK's `clearHighlight` is pinned; the component's CALL to it on
      // typing was not. The only arrow-then-type sequence in this file typed a
      // query that left zero rows, so the render clamp masked the state.
      // Without the call: arm Milano, type `tor`, and the one remaining row is
      // highlighted — so `Enter` commits Torino, a row the user never moved to.
      // The destructive defect in this component's header, through the other
      // door.
      render(<Combobox {...wiring} aria-label="City" />);

      await browser.click(field());
      await browser.keyboard('{ArrowDown}');
      expect(activeOption()).toHaveTextContent('Milano');

      await browser.keyboard('tor');
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1);
      });
      // The ATTRIBUTE: `activeOption()` is blind here, since a highlight held
      // at index 0 would resolve to the one row that is left.
      expect(activeId()).toBeNull();
    });

    it('cannot commit a row that took the offer’s place', async () => {
      // Identified as "the last position", the offer was whatever sat at
      // `shown.length` WHEN THE KEY WAS PRESSED — so in the server-search flow
      // the docs recommend, a response landing between the arrow and the Enter
      // turned the offer into a real city the user had never seen.
      const onCreate = vi.fn();
      const { container, rerender } = render(
        <Combobox
          {...wiring}
          items={[]}
          filter={false}
          name="city"
          aria-label="City"
          onCreate={onCreate}
        />,
      );

      await browser.click(field());
      await browser.keyboard('Bolo{ArrowDown}');
      expect(activeOption()).toHaveTextContent('Create “Bolo”');

      rerender(
        <Combobox
          {...wiring}
          filter={false}
          name="city"
          aria-label="City"
          onCreate={onCreate}
        />,
      );
      await browser.keyboard('{Enter}');

      expect(onCreate).toHaveBeenCalledWith('Bolo');
      expect(carrier(container)).toHaveValue('');
    });
  });

  it('closes when focus leaves for another control', async () => {
    // Tabbing away, rather than clicking away: a click outside is light-dismissed
    // by the platform, so it proves nothing about this handler.
    render(
      <>
        <Combobox {...wiring} aria-label="City" />
        <button type="button">After</button>
      </>,
    );

    await browser.click(field());
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(CITIES.length);
    });

    await browser.tab();
    await waitFor(() => {
      expect(field()).toHaveAttribute('aria-expanded', 'false');
    });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('reports each open and each close once', async () => {
    // The component both COMMANDS the popover and mirrors it, which
    // `useOpenMirror`'s contract says nothing using it should do. The cost of
    // breaking that contract is an echo: our own `hidePopover()` came back as a
    // `toggle`, so a close was reported twice.
    const onOpenChange = vi.fn();
    render(
      <Combobox {...wiring} aria-label="City" onOpenChange={onOpenChange} />,
    );

    await browser.click(field());
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(CITIES.length);
    });
    expect(onOpenChange.mock.calls).toEqual([[true]]);

    await browser.keyboard('{Escape}');
    await waitFor(() => {
      expect(field()).toHaveAttribute('aria-expanded', 'false');
    });
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('lets a consumer say what the field is for (WCAG 1.3.5)', () => {
    // Hard-coded AFTER the spread, `autocomplete="country-name"` compiled,
    // typechecked and did nothing — and Identify Input Purpose is unsatisfiable
    // without it on exactly the fields a combobox is used for.
    render(
      <Combobox {...wiring} aria-label="City" autoComplete="address-level2" />,
    );
    expect(field()).toHaveAttribute('autocomplete', 'address-level2');
  });

  it('leaves Escape alone when there is nothing to clear', async () => {
    // Stopped unconditionally, an untouched combobox with the focus swallowed
    // every Escape — and a `Dialog` around it could not be dismissed at all.
    const escaped = vi.fn();
    render(
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') escaped();
        }}
      >
        <Combobox {...wiring} aria-label="City" />
      </div>,
    );

    field().focus();
    await browser.keyboard('{Escape}');
    expect(escaped).toHaveBeenCalledTimes(1);

    // And still stopped when there IS: the same keystroke must not both clear
    // the field and dismiss what is around it.
    await browser.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(field()).toHaveAttribute('aria-expanded', 'true');
    });
    await browser.keyboard('{Escape}');
    expect(escaped).toHaveBeenCalledTimes(1);
  });

  it('marks the chosen row and the highlighted row differently', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(field()).toHaveValue('Málaga');

    await browser.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(CITIES.length);
    });
    const [first, second] = screen.getAllByRole('option');
    // `aria-selected` is the CHOICE — only ever seen as `false` until now, so
    // hard-coding it survived and took `.option[aria-selected='true']` with it.
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(first).toHaveAttribute('aria-selected', 'false');
    // `data-active` is what PAINTS the highlight, and is a second mechanism
    // beside `aria-activedescendant`: only the second was ever asserted, so the
    // visible highlight could be deleted with nothing going red.
    await browser.keyboard('{ArrowDown}');
    expect(first).toHaveAttribute('data-active');
    expect(second).not.toHaveAttribute('data-active');
  });

  it('is the group’s own input inside an InputGroup', () => {
    // It was wrapped in a `display: contents` div, which is transparent to
    // LAYOUT and not to SELECTORS — so none of `.group > input`'s resets
    // reached it and the field drew a second bordered, filled box inside the
    // group's own.
    render(
      <InputGroup>
        <span aria-hidden="true">⌕</span>
        <Combobox {...wiring} aria-label="City" />
      </InputGroup>,
    );

    const style = getComputedStyle(field());
    expect(style.borderTopWidth).toBe('0px');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});

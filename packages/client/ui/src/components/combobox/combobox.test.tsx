import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Combobox } from './combobox.component.js';
import { Field } from '../field/field.component.js';
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
/** The option the arrows are on — pointed at, never focused. */
const activeOption = () => {
  const id = field().getAttribute('aria-activedescendant');
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
  });
});

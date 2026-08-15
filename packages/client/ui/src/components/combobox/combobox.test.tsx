import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Combobox } from './combobox.component.js';
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
const list = () => screen.getByRole('listbox');
const carrier = (container: HTMLElement) =>
  container.querySelector('input[type="hidden"]') as HTMLInputElement | null;
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
    // The list exists in the markup while closed — `aria-controls` has to point
    // at something that is there — but it is `display: none`, so it is NOT in
    // the accessibility tree and `getByRole` rightly cannot see it. Queried
    // from the DOM for that reason, which is also the APG's own arrangement.
    const closed = container.querySelector('[role="listbox"]');
    expect(input.getAttribute('aria-controls')).toBe(closed?.id);
  });

  it('opens on ArrowDown and points at the first row', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('{ArrowDown}');

    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(activeOption()).toHaveTextContent('Milano');
    // THE WHOLE POINT OF THE PATTERN: the caret stays where the person is
    // typing, and the highlight moves without it.
    expect(field()).toHaveFocus();
  });

  it('walks the rows with the arrows, and wraps', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Málaga');

    await browser.keyboard('{End}');
    expect(activeOption()).toHaveTextContent('Torino');

    await browser.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Milano');
    expect(field()).toHaveFocus();
  });

  it('filters as you type, ignoring case and accents', async () => {
    // "mala" must find "Málaga": a default that fails there looks to the reader
    // like the record is not in the list.
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('mala');

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option')).toHaveTextContent('Málaga');
  });

  it('announces how many rows are left, because filtering is otherwise silent', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('m');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Results: 3');
    });
  });

  it('picks with Enter: the field reads the label, the form carries the key', async () => {
    const { container } = render(
      <Combobox {...wiring} name="city" aria-label="City" />,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    // The two halves of the shape: what a person reads and what a form sends
    // are different strings, and that is why the carrier exists.
    expect(field()).toHaveValue('Málaga');
    expect(carrier(container)).toHaveValue('2');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });

  it('picks with the pointer without taking focus off the field', async () => {
    const { container } = render(
      <Combobox {...wiring} name="city" aria-label="City" />,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}');
    await browser.click(screen.getByRole('option', { name: 'Manchester' }));

    expect(carrier(container)).toHaveValue('3');
    expect(field()).toHaveValue('Manchester');
    expect(field()).toHaveFocus();
  });

  it('closes on Escape, and clears on the second one', async () => {
    const { container } = render(
      <Combobox {...wiring} name="city" aria-label="City" />,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{Enter}');
    expect(field()).toHaveValue('Milano');

    await browser.keyboard('{ArrowDown}');
    expect(field()).toHaveAttribute('aria-expanded', 'true');

    await browser.keyboard('{Escape}');
    expect(field()).toHaveAttribute('aria-expanded', 'false');

    // Closed, Escape is the only way back to "nothing chosen" from the keyboard
    // alone.
    await browser.keyboard('{Escape}');
    expect(field()).toHaveValue('');
    expect(carrier(container)).toHaveValue('');
  });

  it('submits the key through FormData, like any other field', async () => {
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

    expect(sent).toHaveBeenCalledWith('3');
  });

  it('does not filter what a server already filtered', async () => {
    // `filter={false}` is not a convenience: filtering server results again
    // applies the query twice and empties a list that should have rows.
    render(
      <Combobox
        {...wiring}
        items={[{ id: '9', name: 'Zurich' }]}
        filter={false}
        defaultQuery="mila"
        aria-label="City"
      />,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Zurich');
  });

  it('says so when nothing matches', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(field());
    await browser.keyboard('zzz');

    await waitFor(() => {
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });
    expect(list()).toHaveTextContent('No results');
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
            {/* NOT an `<output>`: that element's implicit role is `status`, and
                the component already renders one — two live regions would make
                `getByRole('status')` ambiguous and, worse, would have a test
                asserting against the wrong one. */}
            <p>{`${query}/${value ?? '-'}`}</p>
          </>
        );
      }
      render(<Controlled />);

      await browser.click(field());
      await browser.keyboard('tor');
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Results: 1');
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

      // Opened at mount by the platform, and mirrored back rather than assumed.
      await waitFor(() => {
        expect(field()).toHaveAttribute('aria-expanded', 'true');
      });
      await browser.keyboard('{Escape}');
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
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
    expect((node as unknown as HTMLInputElement).type).toBe('text');
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
            <Combobox {...wiring} name="city" aria-label="City" defaultOpen />
          </div>,
          { theme },
        );
        await browser.keyboard('{ArrowDown}');
        await expectNoA11yViolations(container);
      });
    }
  });
});

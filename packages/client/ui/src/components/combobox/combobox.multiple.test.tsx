import { describe, it, expect, vi, afterEach } from 'vitest';
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
  { id: '2', name: 'Torino' },
  { id: '3', name: 'Napoli' },
];

const wiring = {
  items: CITIES,
  getKey: (city: City) => city.id,
  getLabel: (city: City) => city.name,
};

const field = () => screen.getByRole('combobox');
const row = (name: string) => screen.getByRole('option', { name });
const tags = () =>
  screen.queryAllByRole('listitem').map((li) => li.textContent);
const removeTag = (name: string) =>
  screen.getByRole('button', { name: `Remove ${name}` });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Combobox, several of many', () => {
  it('says the list takes more than one', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());

    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-multiselectable',
      'true',
    );
  });

  it('keeps the list open, marks the row, and clears the query', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());
    await browser.keyboard('mil');
    await browser.click(row('Milano'));

    // OPEN, because picking several out of one list means picking them one
    // after another — a list that closed would have to be reopened between
    // each.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(row('Milano')).toHaveAttribute('aria-selected', 'true');
    // And the query goes, so the next keystroke searches the whole list again
    // rather than the one word already spent.
    expect(field()).toHaveValue('');
    expect(row('Torino')).toBeInTheDocument();
  });

  it('draws a tag per choice, in the order they were picked', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());
    await browser.click(row('Napoli'));
    await browser.click(row('Milano'));

    // The order is the order they were picked, and it is what the tags show:
    // what a reader sees and what the selection holds cannot disagree.
    await waitFor(() => expect(tags()).toEqual(['Napoli', 'Milano']));
  });

  it('picking a chosen row takes it back out', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());
    await browser.click(row('Milano'));
    await browser.click(row('Milano'));

    await waitFor(() => expect(tags()).toEqual([]));
    expect(row('Milano')).toHaveAttribute('aria-selected', 'false');
  });

  it('a tag’s ✕ drops its key and hands the box back the focus', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());
    await browser.click(row('Milano'));
    await browser.click(row('Torino'));
    await browser.click(removeTag('Milano'));

    await waitFor(() => expect(tags()).toEqual(['Torino']));
    // Removing a choice is not leaving the control, and the reader is most
    // likely to type next.
    await waitFor(() => expect(document.activeElement).toBe(field()));
  });

  it('Backspace takes the last one, but only from an empty box', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());
    await browser.click(row('Milano'));
    await browser.click(row('Torino'));

    // WITH TEXT, Backspace is the text's: it deletes a character, never a
    // choice — the same rule `Home` and `End` are refused under.
    await browser.keyboard('nap');
    await browser.keyboard('{Backspace}');
    expect(tags()).toEqual(['Milano', 'Torino']);
    expect(field()).toHaveValue('na');

    await browser.keyboard('{Backspace}{Backspace}');
    expect(field()).toHaveValue('');
    await browser.keyboard('{Backspace}');

    await waitFor(() => expect(tags()).toEqual(['Milano']));
  });

  it('Escape clears the whole selection once the list is closed', async () => {
    render(<Combobox {...wiring} multiple aria-label="Cities" />);

    await browser.click(field());
    await browser.click(row('Milano'));
    await browser.click(row('Torino'));

    // The first Escape closes the list; the second clears.
    await browser.keyboard('{Escape}');
    await browser.keyboard('{Escape}');

    await waitFor(() => expect(tags()).toEqual([]));
  });

  it('reports the keys in order, and follows a controlled value', async () => {
    const changed = vi.fn();

    function Controlled() {
      const [keys, setKeys] = useState<readonly string[]>(['3']);
      return (
        <Combobox
          {...wiring}
          multiple
          aria-label="Cities"
          value={keys}
          onValueChange={(next) => {
            changed(next);
            setKeys(next);
          }}
        />
      );
    }

    render(<Controlled />);
    // Seeded from the parent, so the tag is there before anything is clicked.
    expect(tags()).toEqual(['Napoli']);

    await browser.click(field());
    await browser.click(row('Milano'));

    expect(changed).toHaveBeenCalledWith(['3', '1']);
    await waitFor(() => expect(tags()).toEqual(['Napoli', 'Milano']));
  });

  it('draws the key itself when no row carries it', () => {
    // A selection may hold a key whose row has not been fetched — a tag that
    // drew nothing would be a value the reader can neither see nor remove.
    render(
      <Combobox
        {...wiring}
        multiple
        aria-label="Cities"
        defaultValue={['404']}
      />,
    );

    expect(tags()).toEqual(['404']);
    expect(removeTag('404')).toBeInTheDocument();
  });

  it('refuses `name` out loud, because the form half is not built', () => {
    // The port cannot yet express a set whose members come and go — measured
    // over five bindings in `apps/ui-ports-validation`. Shipping a carrier here
    // would post a key the reader had removed, so there is no carrier and the
    // warning says where to read the selection instead.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { container } = render(
      <Combobox {...wiring} multiple name="cities" aria-label="Cities" />,
    );

    expect(container.querySelector('[data-carrier]')).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`name` does nothing while `multiple` is on'),
    );
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations, with tags and an open list — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Combobox
              {...wiring}
              multiple
              aria-label="Cities"
              defaultValue={['1', '2']}
            />
          </div>,
          { theme },
        );

        await browser.click(field());
        await expectNoA11yViolations(container);
      });
    }
  });
});

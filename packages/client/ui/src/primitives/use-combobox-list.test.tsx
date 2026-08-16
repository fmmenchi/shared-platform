import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { useComboboxList } from './use-combobox-list.js';
import type { ComboboxListOptions } from './use-combobox-list.types.js';

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

/**
 * A bare host, so the LIST is tested on its own and not through the one
 * component that happens to consume it today. `Combobox` reaches this hook only
 * through a popover, a carrier and a `searching` flag it sets from its own
 * keystroke handling; the second consumer (ADR-0029 §1) will reach it
 * differently, and what has to hold is the contract, not one route to it.
 */
function Host(props: Partial<ComboboxListOptions<City>>) {
  const list = useComboboxList<City>({
    items: CITIES,
    getLabel: (city) => city.name,
    query: '',
    searching: true,
    ...props,
  });
  return (
    <>
      <output aria-label="where">
        {list.highlighted === null ? 'none' : String(list.highlighted)}
      </output>
      <output aria-label="rows">{String(list.rows)}</output>
      <output aria-label="shown">
        {list.shown.map((city) => city.name).join(',')}
      </output>
      <output aria-label="offer">{String(list.creatable)}</output>
      <button type="button" onClick={() => list.move(1)}>
        down
      </button>
      <button type="button" onClick={() => list.move(-1)}>
        up
      </button>
      <button type="button" onClick={() => list.clearHighlight()}>
        clear
      </button>
    </>
  );
}

const where = () => screen.getByRole('status', { name: 'where' });
const rows = () => screen.getByRole('status', { name: 'rows' });
const shown = () => screen.getByRole('status', { name: 'shown' });
const offer = () => screen.getByRole('status', { name: 'offer' });
const press = (name: string) =>
  browser.click(screen.getByRole('button', { name }));

describe('useComboboxList', () => {
  it('reaches the last row from nothing, which is what makes “open then Up” work', async () => {
    // The hook's own comment claims it and nothing pressed it: every existing
    // test arrows DOWN first, so the `from === null && delta < 0` arm could
    // return `0` with the whole suite green — and a keyboard user opening a
    // forty-row list and pressing Up to reach the end would land on the first
    // row instead.
    render(<Host />);
    expect(where()).toHaveTextContent('none');

    await press('up');
    expect(where()).toHaveTextContent('3');
  });

  it('has nowhere to go in an empty list, and does not remember trying', async () => {
    // `if (rows === 0) return` is the guard. Without it `move` still advances
    // its state against a list that is not there — the render clamp hides that
    // while the list stays empty, and the moment an async answer arrives row 0
    // is armed, one Enter from committing a row the user never moved onto. It
    // is the manual-selection rule, broken through the loading state.
    const { rerender } = render(<Host items={[]} query="zzz" />);
    expect(rows()).toHaveTextContent('0');

    await press('down');
    await press('down');
    expect(where()).toHaveTextContent('none');

    // The search answers.
    rerender(<Host query="zzz" filter={false} />);
    expect(shown()).toHaveTextContent('Milano,Málaga,Manchester,Torino');
    expect(where()).toHaveTextContent('none');
  });

  it('offers nothing to create until something other than space is typed', async () => {
    // `query.trim() !== ''` is the term. Dropped, a creatable combobox opened
    // on an empty field shows `Create “”` — a row whose only job is to name
    // what it will make, naming nothing — and Enter hands `onCreate('')`.
    const { rerender } = render(<Host offersCreation query="" />);
    expect(offer()).toHaveTextContent('false');

    rerender(<Host offersCreation query="   " />);
    expect(offer()).toHaveTextContent('false');

    rerender(<Host offersCreation query="Bologna" />);
    expect(offer()).toHaveTextContent('true');
  });

  it('asks the consumer’s filter when there is one', async () => {
    // `filter` AS A FUNCTION had no test anywhere — only `filter={false}` did —
    // so the branch that calls it could be deleted and every suite stayed
    // green, while a consumer matching on a code, a synonym or a fuzzy score
    // silently got substring-on-the-label instead.
    render(<Host query="3" filter={(city, query) => city.id === query} />);
    expect(shown()).toHaveTextContent('Manchester');
    expect(rows()).toHaveTextContent('1');
  });

  it('hands canCreate the rows on screen, not the whole catalogue', async () => {
    // The documented second argument is `shown` — what the user is LOOKING AT.
    // Handed `items`, the commonest rule there is ("only offer when nothing
    // matched") is false on every list that has any rows at all, so the offer
    // never appears for anybody who writes it.
    render(
      <Host
        offersCreation
        query="Bologna"
        canCreate={(_query, onScreen) => onScreen.length === 0}
      />,
    );
    expect(offer()).toHaveTextContent('true');
  });

  it('lets go of the offer, and of the position, when a row starts saying it', async () => {
    // Both `creatable` guards, the one in `highlighted` and the one in `move`.
    // The server-search flow the docs recommend is the case: the user is on the
    // offer when the answer lands, and one of the rows IS what they typed.
    // Ungüarded in `highlighted`, `aria-activedescendant` names a row that is
    // no longer rendered (a broken IDREF) and Enter still fires `onCreate` for
    // a duplicate. Unguarded in `move`, the next arrow measures from a position
    // that no longer exists and skips to the SECOND row.
    const { rerender } = render(
      <Host items={[]} query="Milano" offersCreation />,
    );

    await press('down');
    expect(where()).toHaveTextContent('create');

    rerender(<Host query="Milano" offersCreation filter={false} />);
    expect(offer()).toHaveTextContent('false');
    expect(where()).toHaveTextContent('none');

    await press('down');
    expect(where()).toHaveTextContent('0');
  });
});

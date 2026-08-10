import { describe, it, expect } from 'vitest';
import { byKey, compareValues, createCollator, sortRows } from './compare.js';

/**
 * Pure, so none of this needs a component around it — the same reason
 * `roving.ts` is not inside the menu.
 *
 * What it has to prove is not that sorting works, but that it works the way a
 * READER expects, which is where the hand-written comparator in every app gets
 * it wrong. Each of the first three cases below is a real defect that `<`
 * produces, asserted twice: once to show the naive answer is wrong, once to
 * show ours is right.
 */
const collator = createCollator('it');

const order = (values: unknown[]) =>
  [...values].sort((a, b) => compareValues(a, b, collator));

describe('compareValues', () => {
  it('orders accented letters where the alphabet puts them', () => {
    // 'À' is U+00C0, above 'Z' — so a code point comparison parades every
    // accented word to the end, and "Àosta" lands after "Zurigo".
    expect('Àosta' < 'Zurigo').toBe(false);
    expect(order(['Zurigo', 'Àosta'])).toEqual(['Àosta', 'Zurigo']);
  });

  it('reads digits inside strings as numbers', () => {
    // The second most common table defect: "Item 10" before "Item 9" because
    // '1' < '9' as text.
    expect('Item 10' < 'Item 9').toBe(true);
    expect(order(['Item 10', 'Item 9', 'Item 2'])).toEqual([
      'Item 2',
      'Item 9',
      'Item 10',
    ]);
  });

  it('orders numbers as numbers, not as their text', () => {
    expect(order([10, 9, 2])).toEqual([2, 9, 10]);
  });

  it('orders dates by their instant', () => {
    const a = new Date('2026-01-02');
    const b = new Date('2026-01-10');
    // Their string forms would compare the other way round in a US format.
    expect(order([b, a])).toEqual([a, b]);
  });

  it('orders false before true, and bigints without overflowing', () => {
    expect(order([true, false])).toEqual([false, true]);
    expect(order([10n, 2n])).toEqual([2n, 10n]);
  });

  it('sends nothing to the end, whatever the type', () => {
    // `null`, `undefined` and the empty string are the three shapes "no value"
    // arrives in from a real API.
    const sorted = order(['b', null, 'a', undefined, '']);

    expect(sorted.slice(0, 2)).toEqual(['a', 'b']);
    // The promise is that the empties come last — NOT the order among
    // themselves, which is not ours to give: `Array.prototype.sort` moves
    // `undefined` to the end by specification, without ever consulting the
    // comparator. Asserting a fixed order here would be asserting the engine's
    // behaviour as if it were ours.
    expect(sorted.slice(2)).toHaveLength(3);
    expect(
      sorted.slice(2).every((v) => v === null || v === undefined || v === ''),
    ).toBe(true);
  });

  it('treats NaN as nothing rather than as a position', () => {
    expect(order([3, Number.NaN, 1])).toEqual([1, 3, Number.NaN]);
  });

  it('still answers for mixed types, and answers consistently', () => {
    // A numeric column with an "n/a" in it. `sort` may do anything at all with
    // an inconsistent comparator, so the requirement is a total order — not a
    // particular one.
    const mixed = [3, 'n/a', 1, true];
    expect(order(mixed)).toEqual(order([...mixed].reverse()));
  });
});

describe('byKey', () => {
  interface Row {
    name: string;
    age: number | null;
  }

  const rows: Row[] = [
    { name: 'Bruno', age: 30 },
    { name: 'Àlice', age: null },
    { name: 'Carla', age: 9 },
  ];

  const names = (list: Row[]) => list.map((r) => r.name);

  it('orders by the key it is given', () => {
    expect(names(sortRows(rows, byKey('name', 'asc', collator)))).toEqual([
      'Àlice',
      'Bruno',
      'Carla',
    ]);
  });

  it('reverses on desc', () => {
    expect(names(sortRows(rows, byKey('name', 'desc', collator)))).toEqual([
      'Carla',
      'Bruno',
      'Àlice',
    ]);
  });

  it('keeps empty at the bottom in BOTH directions', () => {
    // THE ASYMMETRY THAT HAS TO BE DELIBERATE. Negating the comparator for
    // `desc` would also negate the empty-last rule, so reversing the column
    // would parade every blank row to the top — where it is the least useful
    // thing a reader can be shown.
    expect(names(sortRows(rows, byKey('age', 'asc', collator)))).toEqual([
      'Carla',
      'Bruno',
      'Àlice',
    ]);
    expect(names(sortRows(rows, byKey('age', 'desc', collator)))).toEqual([
      'Bruno',
      'Carla',
      'Àlice',
    ]);
  });

  it('is stable, which is what makes a second key work by clicking twice', () => {
    const people = [
      { city: 'Roma', name: 'Bruno' },
      { city: 'Milano', name: 'Àlice' },
      { city: 'Roma', name: 'Àlice' },
      { city: 'Milano', name: 'Bruno' },
    ];

    const byNameThenCity = sortRows(
      sortRows(people, byKey('name', 'asc', collator)),
      byKey('city', 'asc', collator),
    );

    expect(byNameThenCity.map((p) => `${p.city}/${p.name}`)).toEqual([
      'Milano/Àlice',
      'Milano/Bruno',
      'Roma/Àlice',
      'Roma/Bruno',
    ]);
  });
});

describe('sortRows', () => {
  it('never touches the array it was given', () => {
    // Sorting in place would reorder state the consumer is rendering from —
    // a list that changes under a component that never re-rendered.
    const rows = [{ n: 2 }, { n: 1 }];
    const sorted = sortRows(rows, byKey('n', 'asc', collator));

    expect(rows.map((r) => r.n)).toEqual([2, 1]);
    expect(sorted.map((r) => r.n)).toEqual([1, 2]);
  });
});

describe('createCollator', () => {
  it('reuses the instance, because building one per keystroke is the cost', () => {
    expect(createCollator('it')).toBe(createCollator('it'));
    expect(createCollator('de')).not.toBe(createCollator('it'));
  });
});

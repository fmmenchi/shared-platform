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

  it('canonicalises the tag, so one locale is not three cache entries', () => {
    expect(createCollator('de-DE')).toBe(createCollator('DE-de'));
  });

  it('survives the tag shape a Java or POSIX backend sends', () => {
    // `new Intl.Collator('en_US')` throws RangeError. Uncaught inside a
    // comparator that is an exception mid-render.
    expect(() => createCollator('en_US')).not.toThrow();
  });

  it('keeps the numeric option out of the shared instance', () => {
    expect(createCollator('it', { numeric: false })).not.toBe(
      createCollator('it', { numeric: true }),
    );
    expect(
      createCollator('it', { numeric: false }).compare('Item 10', 'Item 9'),
    ).toBeLessThan(0);
  });
});

/**
 * THE PROPERTY THE WHOLE FILE RESTS ON, and the one the first version failed.
 *
 * `Array.prototype.sort` given an inconsistent comparator may produce anything,
 * so "mostly right" is not a weaker kind of right — it is output that depends
 * on the order the rows arrived in. The first version was intransitive, and no
 * example-based test could see it: the one guard was `order(mixed)` against
 * `order(mixed.reverse())`, which samples two of the 24 permutations of one
 * array. A triple loop over a corpus finds it in a second, which is what this
 * is.
 */
describe('the comparator is a total order', () => {
  const corpus: unknown[] = [
    -10,
    -5,
    -1,
    0,
    -0,
    1,
    9,
    10,
    1e21,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    '-10',
    '-7',
    '-3',
    '007',
    '7',
    'Item 2',
    'Item 10',
    'Àosta',
    'Zurigo',
    '',
    5n,
    9007199254740993n,
    true,
    false,
    new Date('2026-01-02'),
    new Date('2026-03-01'),
    new Date('nope'),
    null,
    undefined,
  ];

  const cmp = (a: unknown, b: unknown) =>
    Math.sign(compareValues(a, b, collator));

  it('is antisymmetric: cmp(a,b) is always -cmp(b,a)', () => {
    const broken: string[] = [];
    for (const a of corpus) {
      for (const b of corpus) {
        if (cmp(a, b) !== -cmp(b, a))
          broken.push(`${String(a)} / ${String(b)}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('is transitive: a<=b and b<=c implies a<=c', () => {
    const broken: string[] = [];
    for (const a of corpus) {
      for (const b of corpus) {
        for (const c of corpus) {
          if (cmp(a, b) <= 0 && cmp(b, c) <= 0 && cmp(a, c) > 0) {
            broken.push(`${String(a)} <= ${String(b)} <= ${String(c)}`);
          }
        }
      }
    }
    // The measured failure of the first version: `-10 > '-7' > -5` while
    // `-10 < -5`, because `String(-10)` collated by magnitude and ignored the
    // sign while same-type numbers subtracted. 33 violations, and a column of
    // five values with 13 different orderings across its 120 permutations.
    expect(broken).toEqual([]);
  });

  it('gives the same answer whatever order the rows arrived in', () => {
    const rows = [-10, -5, '-7', -1, '-3'].map((v) => ({ v }));
    const sorted = (list: { v: unknown }[]) =>
      sortRows(list, byKey<{ v: unknown }>('v', 'asc', collator)).map((r) =>
        String(r.v),
      );

    const expected = sorted(rows);
    for (const permutation of permutations(rows)) {
      expect(sorted(permutation)).toEqual(expected);
    }
  });

  function permutations<X>(list: X[]): X[][] {
    if (list.length <= 1) return [list];
    return list.flatMap((item, i) =>
      permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [
        item,
        ...rest,
      ]),
    );
  }
});

describe('the shapes that used to escape the empty rule', () => {
  interface Row {
    v: unknown;
  }

  const order2 = (values: unknown[], direction: 'asc' | 'desc') =>
    sortRows(
      values.map((v) => ({ v })),
      byKey<Row>('v', direction, collator),
    ).map((r) => r.v);

  it('keeps NaN and an invalid Date at the bottom in BOTH directions', () => {
    // The first version checked emptiness twice with two different answers —
    // `compareValues` counted NaN, `byKey` did not — so NaN escaped the rule,
    // met the descending flip, and arrived at the TOP. One predicate now.
    const values = [30, Number.NaN, 9, new Date('nope')];

    expect(order2(values, 'asc').slice(0, 2)).toEqual([9, 30]);
    expect(order2(values, 'desc').slice(0, 2)).toEqual([30, 9]);
  });

  it('orders valid dates correctly with an invalid one among them', () => {
    // `NaN` from the subtraction was coerced to `+0` by the sort spec, making
    // the invalid date compare EQUAL to every date — and equality that is not
    // transitive corrupts the valid ones around it. Measured then: an ascending
    // sort that returned Jan 10 before Jan 2.
    const jan2 = new Date('2026-01-02');
    const jan10 = new Date('2026-01-10');

    expect(order2([jan10, new Date('nope'), jan2], 'asc').slice(0, 2)).toEqual([
      jan2,
      jan10,
    ]);
  });

  it('never returns NaN, so the declared return type is honest', () => {
    // `sort` masks a NaN result by reading it as 0, which is why this hid. Any
    // other caller — grouping, dedupe, "is this already sorted" — does not.
    expect(compareValues(Infinity, Infinity, collator)).toBe(0);
    expect(compareValues(-Infinity, -Infinity, collator)).toBe(0);
    expect(
      Number.isNaN(
        compareValues(new Date('2026-01-02'), new Date('nope'), collator),
      ),
    ).toBe(false);
  });

  it('compares a bigint against a number exactly', () => {
    // A bigint column is a bigint column because the values exceed
    // MAX_SAFE_INTEGER; a `Number()` coercion would lose the comparison.
    expect(
      compareValues(9007199254740993n, 9007199254740992, collator),
    ).toBeGreaterThan(0);
    expect(compareValues(5n, 1e21, collator)).toBeLessThan(0);
  });

  it('never calls two distinct strings equal', () => {
    // With `numeric` on, "007" and "7" collate identically — and a comparator
    // that reports unequal values equal is not a total order.
    expect(compareValues('007', '7', collator)).not.toBe(0);
    expect(compareValues('A-1', 'A-01', collator)).not.toBe(0);
  });

  it('never collates a Date against text', () => {
    // `String(date)` is "Thu Jan 01 2026 … (Peru Standard Time)" — ordered by
    // the weekday name and different on a server in UTC than in a browser in
    // Lima, which is the client/server divergence this file exists to prevent.
    const date = new Date('2026-03-01');
    const text = '2026-01-05';
    expect(Math.sign(compareValues(date, text, collator))).toBe(
      -Math.sign(compareValues(text, date, collator)),
    );
  });

  it('does not fall over on a null row', () => {
    expect(() =>
      sortRows(
        [null, { v: 1 }] as unknown as Row[],
        byKey<Row>('v', 'asc', collator),
      ),
    ).not.toThrow();
  });
});

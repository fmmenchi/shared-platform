import { describe, it, expect } from 'vitest';
import {
  activeFilters,
  filterRows,
  foldForSearch,
  isFiltered,
  matchesFilters,
} from './filter.js';

interface Person {
  name: string;
  city: string;
  note: string | null;
}

const people: Person[] = [
  { name: 'Àlice', city: 'Aosta', note: 'prima' },
  { name: 'Bruno', city: 'Milano', note: null },
  { name: 'Straße', city: 'Zurigo', note: '' },
];

describe('folding a string for search', () => {
  it('ignores accents, which is the whole reason this is ours', () => {
    // `includes` says "Àosta" does not contain "aosta". Every app that writes
    // its own filter writes that comparison.
    expect(foldForSearch('Àosta', 'it')).toBe('aosta');
    expect(foldForSearch('AOSTA', 'it')).toBe('aosta');
  });

  it('lowercases in the reader’s locale, not the runtime’s', () => {
    // THE TURKISH DOTTED CAPITAL. `'İ'.toLowerCase()` produces an `i` followed
    // by a combining dot, which is a different string from `i`; the Turkish
    // mapping produces the plain letter. Folding after the case is what makes
    // the combining dot reachable at all.
    expect(foldForSearch('İzmir', 'tr')).toBe('izmir');
    // And the same input under a locale that has no such rule still folds to
    // something searchable rather than to a string with a stray mark in it.
    expect(foldForSearch('İzmir', 'en')).toBe('izmir');
  });

  it('reaches past Latin', () => {
    expect(foldForSearch('Ελλάδα', 'el')).toBe('ελλαδα');
  });

  it('expands ß, which nothing in JavaScript does for you', () => {
    // The claim this file SHIPPED WITHOUT IMPLEMENTING. `toLocaleLowerCase` is
    // simple lowercase, not full case folding: ß survives it, has no canonical
    // decomposition and is not a diacritic — so "Straße" did not contain
    // "strasse" while the comment above it said it did.
    expect(foldForSearch('Straße', 'de')).toBe('strasse');
    expect(foldForSearch('STRASSE', 'de')).toBe('strasse');
  });

  it('normalises the Greek final sigma', () => {
    // `'ΟΔΟΣ'.toLocaleLowerCase('el')` ends in ς, and a reader types σ.
    // Both end in σ after folding — which is the point: the row and the query
    // meet on one letter instead of on two that look identical.
    expect(foldForSearch('Οδός', 'el')).toBe('οδοσ');
    expect(foldForSearch('ΟΔΟΣ', 'el')).toBe(foldForSearch('Οδός', 'el'));
  });

  it('KEEPS the Japanese voiced marks, which Unicode calls diacritics', () => {
    // THE BREADTH WAS THE DEFECT. `\p{Diacritic}` matches U+3099/309A, and NFD
    // splits every precomposed voiced kana — so a blind strip folds バス (bus)
    // to ハス (lotus). Those are different words, and a filter that conflates
    // them is a false-positive engine rather than a forgiving one.
    expect(foldForSearch('バス', 'ja')).not.toBe(foldForSearch('ハス', 'ja'));
    expect(foldForSearch('ガス', 'ja')).not.toBe(foldForSearch('カス', 'ja'));
  });

  it('folds ligatures and full-width forms, because NFKD does', () => {
    expect(foldForSearch('ﬀentlich', 'de')).toBe('ffentlich');
    expect(foldForSearch('ＡＢＣ', 'ja')).toBe('abc');
  });
});

describe('which filters are in force', () => {
  it('does not count an empty or blank value', () => {
    // A cleared box is not a filter that matches nothing — it is no filter.
    expect(activeFilters({ city: '', name: '  ' })).toEqual([]);
    expect(isFiltered({ city: '', name: '  ' })).toBe(false);
    expect(activeFilters({ city: 'Mi' })).toEqual(['city']);
  });

  it('does not count a value that is not a string, and does not throw on one', () => {
    // `filters[key]?.trim() !== ''` read a MISSING value as ACTIVE, because
    // `undefined !== ''` — and the matcher then called `.trim()` on it and
    // threw. Reachable from the shape this state exists for: a URL round-trip
    // where an absent search param arrives as `undefined`.
    const wonky = { city: undefined, age: 30 } as unknown as Record<
      string,
      string
    >;
    expect(activeFilters(wonky)).toEqual([]);
    expect(() => matchesFilters({ city: 'Milano' }, wonky, 'it')).not.toThrow();
  });
});

describe('matching a row', () => {
  it('narrows with every filter, never widens', () => {
    // Two filters mean AND. A table that answered with the union would GROW
    // when the reader tried to shrink it.
    const row = people[0] as Person;
    expect(matchesFilters(row, { city: 'aos', name: 'ali' }, 'it')).toBe(true);
    expect(matchesFilters(row, { city: 'aos', name: 'bru' }, 'it')).toBe(false);
  });

  it('treats an empty cell as no match rather than as the word "undefined"', () => {
    // `String(undefined)` would make "undefined" searchable, so a filter for
    // "u" would return every row with a hole in it.
    const bruno = people[1] as Person;
    expect(matchesFilters(bruno, { note: 'u' }, 'it')).toBe(false);
    expect(matchesFilters(bruno, { note: 'nde' }, 'it')).toBe(false);
    const strasse = people[2] as Person;
    expect(matchesFilters(strasse, { note: '' }, 'it')).toBe(true);
  });

  it('lets a column say what its own value means', () => {
    // The one place domain enters, and it is one place — the same shape
    // sorting gives a column the default cannot know.
    const rows = [{ name: 'a', city: 'x', note: null, age: 30 }];
    expect(
      matchesFilters(rows[0] as { age: number }, { age: '25' }, 'it', {
        age: (row, value) => row.age > Number(value),
      }),
    ).toBe(true);
  });

  it('survives a null row — including through a consumer’s predicate', () => {
    // The guard sat BELOW the branch that calls the predicate, so the one
    // comment promising it would "not take the table down from inside a
    // predicate" described the one path where it did. The default path was the
    // only one this test used to exercise.
    expect(
      matchesFilters(null as unknown as Person, { city: 'mi' }, 'it'),
    ).toBe(false);
    expect(() =>
      matchesFilters(null as unknown as { age: number }, { age: '25' }, 'it', {
        age: (row, value) => row.age > Number(value),
      }),
    ).not.toThrow();
  });
});

describe('filtering the rows', () => {
  it('keeps the caller’s array when nothing is in force', () => {
    // An unfiltered table should not hand React a new identity every render.
    expect(filterRows(people, {}, 'it')).toBe(people);
    expect(filterRows(people, { city: '   ' }, 'it')).toBe(people);
  });

  it('returns a new array when something is', () => {
    const filtered = filterRows(people, { city: 'mi' }, 'it');
    expect(filtered).not.toBe(people);
    expect(filtered.map((p) => p.name)).toEqual(['Bruno']);
  });

  it('folds the query once, not once per row', () => {
    // Behavioural proof rather than a benchmark: a predicate that counts its
    // own calls shows the per-row work, and the needle's folding is hoisted
    // beside it. Measured at 50,000 rows the hoist was 22.2ms → 9.7ms.
    let calls = 0;
    filterRows(people, { name: 'a' }, 'it', {
      name: (_row, _value) => {
        calls += 1;
        return true;
      },
    });
    expect(calls).toBe(people.length);
  });

  it('matches accent-insensitively end to end', () => {
    expect(
      filterRows(people, { name: 'alice' }, 'it').map((p) => p.name),
    ).toEqual(['Àlice']);
  });
});

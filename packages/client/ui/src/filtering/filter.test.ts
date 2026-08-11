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
});

describe('which filters are in force', () => {
  it('does not count an empty or blank value', () => {
    // A cleared box is not a filter that matches nothing — it is no filter.
    expect(activeFilters({ city: '', name: '  ' })).toEqual([]);
    expect(isFiltered({ city: '', name: '  ' })).toBe(false);
    expect(activeFilters({ city: 'Mi' })).toEqual(['city']);
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

  it('survives a null row', () => {
    // What an API payload with a hole in it delivers, and it must not take the
    // table down from inside a predicate.
    expect(
      matchesFilters(null as unknown as Person, { city: 'mi' }, 'it'),
    ).toBe(false);
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

  it('matches accent-insensitively end to end', () => {
    expect(
      filterRows(people, { name: 'alice' }, 'it').map((p) => p.name),
    ).toEqual(['Àlice']);
  });
});

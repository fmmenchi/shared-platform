import { describe, it, expect } from 'vitest';
import {
  NOTHING_SELECTED,
  EVERYTHING_SELECTED,
  isRowSelected,
  toggleRow,
  toggleRows,
  coverageOf,
  countSelected,
} from './selection.js';
import type { Selection } from './selection.types.js';

const include = (...ids: string[]): Selection => ({
  mode: 'include',
  ids: new Set(ids),
});
const exclude = (...ids: string[]): Selection => ({
  mode: 'exclude',
  ids: new Set(ids),
});

const page = ['a', 'b', 'c'];

describe('reading a selection', () => {
  it('reads `ids` as members under include and as exceptions under exclude', () => {
    expect(isRowSelected(include('a'), 'a')).toBe(true);
    expect(isRowSelected(include('a'), 'b')).toBe(false);
    expect(isRowSelected(exclude('a'), 'a')).toBe(false);
    // The row this client has never seen. Under `exclude` it is IN, which is
    // the whole point: the rule covers rows nobody enumerated.
    expect(isRowSelected(exclude('a'), 'zzz-never-loaded')).toBe(true);
  });

  it('starts from nothing, and can start from everything', () => {
    expect(isRowSelected(NOTHING_SELECTED, 'a')).toBe(false);
    expect(isRowSelected(EVERYTHING_SELECTED, 'a')).toBe(true);
  });
});

describe('toggling one row', () => {
  it('is the same edit in both modes, read two different ways', () => {
    // The observation the file rests on: flip membership in `ids`. Two branches
    // is how this grows a bug in the mode nobody tested.
    expect([...toggleRow(include('a'), 'b').ids].sort()).toEqual(['a', 'b']);
    expect([...toggleRow(exclude('a'), 'b').ids].sort()).toEqual(['a', 'b']);

    expect(isRowSelected(toggleRow(include(), 'a'), 'a')).toBe(true);
    expect(isRowSelected(toggleRow(exclude(), 'a'), 'a')).toBe(false);
  });

  it('returns a new set, because this value is React state', () => {
    const before = include('a');
    const after = toggleRow(before, 'b');
    expect(after.ids).not.toBe(before.ids);
    expect([...before.ids]).toEqual(['a']);
  });

  it('round-trips: flipping twice is where it started', () => {
    for (const start of [include(), include('a'), exclude(), exclude('a')]) {
      const twice = toggleRow(toggleRow(start, 'a'), 'a');
      expect(isRowSelected(twice, 'a')).toBe(isRowSelected(start, 'a'));
    }
  });
});

describe('coverage, which is what the header box shows', () => {
  it('answers none, some and all over the rows in hand', () => {
    expect(coverageOf(include(), page)).toBe('none');
    expect(coverageOf(include('a'), page)).toBe('some');
    expect(coverageOf(include('a', 'b', 'c'), page)).toBe('all');
    expect(coverageOf(exclude(), page)).toBe('all');
    expect(coverageOf(exclude('a'), page)).toBe('some');
    expect(coverageOf(exclude('a', 'b', 'c'), page)).toBe('none');
  });

  it('calls an empty page `none`, not `all`', () => {
    // Vacuously every row is selected; a filled header box over no rows is a
    // lie a reader would act on.
    expect(coverageOf(include(), [])).toBe('none');
    expect(coverageOf(EVERYTHING_SELECTED, [])).toBe('none');
  });
});

describe('toggling a whole page', () => {
  it('selects when partial, and clears only when everything is already in', () => {
    // A reader clicking a half-filled box is completing it, not emptying it.
    expect(coverageOf(toggleRows(include('a'), page), page)).toBe('all');
    expect(coverageOf(toggleRows(include('a', 'b', 'c'), page), page)).toBe(
      'none',
    );
    expect(coverageOf(toggleRows(exclude('a'), page), page)).toBe('all');
  });

  it('touches only the rows it was given, never the rule beyond them', () => {
    // The header box speaks for the page it renders. Clearing it must not
    // quietly deselect the rows on page 2 that the reader had ticked.
    const withOffPageRow = include('a', 'b', 'c', 'off-page');
    const cleared = toggleRows(withOffPageRow, page);
    expect(isRowSelected(cleared, 'off-page')).toBe(true);
    expect(coverageOf(cleared, page)).toBe('none');
  });

  it('narrows an everything-rule to the rows it can see, and keeps the rest', () => {
    const cleared = toggleRows(EVERYTHING_SELECTED, page);
    expect(coverageOf(cleared, page)).toBe('none');
    // Still selected: the rule said everything, and the page never spoke for it.
    expect(isRowSelected(cleared, 'zzz-never-loaded')).toBe(true);
  });
});

describe('counting', () => {
  it('counts what it knows, and refuses to guess what it does not', () => {
    expect(countSelected(include('a', 'b'))).toBe(2);
    // The honest answer under `exclude` with no total: nobody on this side
    // knows. A `0` here is how a table says "delete 3" and deletes 10,000.
    expect(countSelected(exclude('a'))).toBeUndefined();
    expect(countSelected(exclude('a'), 10_000)).toBe(9_999);
  });

  it('never reports a negative count when the total is stale', () => {
    expect(countSelected(exclude('a', 'b', 'c'), 2)).toBe(0);
  });
});

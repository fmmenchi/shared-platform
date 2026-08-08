import { describe, it, expect } from 'vitest';
import { pathIsCurrent } from './path-is-current.js';

describe('pathIsCurrent', () => {
  it('calls the page you are on `page`', () => {
    expect(pathIsCurrent('/prezzi', '/prezzi')).toBe('page');
  });

  it('calls the section that contains it `location`, not `page`', () => {
    // Two "current page" in one menu is the defect this distinction exists for.
    expect(pathIsCurrent('/impostazioni/profilo', '/impostazioni')).toBe(
      'location',
    );
    expect(
      pathIsCurrent('/impostazioni/profilo', '/impostazioni/profilo'),
    ).toBe('page');
  });

  it('never lets the root claim to be a section', () => {
    // `/` is a prefix of everything, so a naive matcher lights up every entry
    // in the navigation. React Router special-cases it too.
    expect(pathIsCurrent('/prezzi', '/')).toBeUndefined();
    expect(pathIsCurrent('/', '/')).toBe('page');
  });

  it('matches on a segment boundary, not a string prefix', () => {
    // The commonest way this is written wrong.
    expect(pathIsCurrent('/teams', '/team')).toBeUndefined();
    expect(pathIsCurrent('/team/42', '/team')).toBe('location');
  });

  it('ignores a trailing slash, a query and a hash', () => {
    for (const here of ['/a/', '/a?x=1', '/a#top', '/a/?x=1#top']) {
      expect(pathIsCurrent(here, '/a'), here).toBe('page');
    }
    expect(pathIsCurrent('/a', '/a/')).toBe('page');
  });

  it('does not let an href that cleans down to nothing match everything', () => {
    // `?x=1` has no path. Without the guard it prefix-matches the whole site.
    expect(pathIsCurrent('/prezzi', '?x=1')).toBeUndefined();
    expect(pathIsCurrent('/prezzi', '#top')).toBeUndefined();
  });

  it('answers nothing when it has nothing to compare', () => {
    expect(pathIsCurrent(undefined, '/a')).toBeUndefined();
    expect(pathIsCurrent('/a', undefined)).toBeUndefined();
  });

  it('does not match a different branch', () => {
    expect(pathIsCurrent('/prodotti/1', '/prezzi')).toBeUndefined();
  });
});

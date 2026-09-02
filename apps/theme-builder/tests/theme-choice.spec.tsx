import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Scheme } from '../app/declarations';
import {
  BOOT_SCRIPT,
  SCHEMES,
  STORAGE_KEY,
  applyScheme,
  isScheme,
  resolveScheme,
  useScheme,
} from '../app/theme-choice';

/**
 * THE SHELL FOLLOWS THE SYSTEM UNLESS PINNED, and the two readers of that choice —
 * the inline boot script and the React hook — must answer alike.
 *
 * The script exists so a stored `dark` never paints light first; it is ES5 in a
 * string, which no type checks. So it is RUN here, in jsdom, against every choice
 * and both system preferences, and compared with `resolveScheme`, the TypeScript
 * the hook uses. A drift between them is exactly the bug a flash-free switcher
 * would otherwise ship: right after hydration, wrong for the first frame.
 *
 * THE UNPINNED CASE IS `null` and gets its own tests rather than riding along with
 * the pinned two, because it is the state the whole two-state UI rests on: there is
 * no button for it, so nothing else would catch it regressing.
 */

/** jsdom has no `matchMedia`; this one answers the dark query as told. */
function systemPrefersDark(dark: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches: dark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', () => media);
  return {
    flip(next: boolean) {
      media.matches = next;
      for (const fn of listeners) fn();
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.unstubAllGlobals();
  // AND the spies: the "storage unavailable" case mocks `Storage.prototype.getItem`
  // to throw, and without this the hook tests after it read a storage that throws
  // and fall back to unpinned — two failures that were about test hygiene, not the
  // hook. Measured.
  vi.restoreAllMocks();
});

describe('resolveScheme', () => {
  it('follows the system only when nothing is pinned', () => {
    expect(resolveScheme(null, true)).toBe('dark');
    expect(resolveScheme(null, false)).toBe('light');
    expect(resolveScheme('light', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
  });
});

describe('applyScheme', () => {
  it('selects the preset for dark and REMOVES the attribute for light', () => {
    // `:root` is the light theme; an attribute saying `light` would select nothing.
    applyScheme(document.documentElement, 'dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    applyScheme(document.documentElement, 'light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('the boot script', () => {
  // The string the page executes, executed. `Function` IS eval, which is the point:
  // this test exists to run the exact bytes `<head>` runs, against the same window.
  // eslint-disable-next-line no-new-func -- executing BOOT_SCRIPT is the subject under test
  const run = () => new Function(BOOT_SCRIPT)();

  const applied = (): Scheme =>
    document.documentElement.hasAttribute('data-theme') ? 'dark' : 'light';

  it.each(
    SCHEMES.flatMap((scheme) =>
      [true, false].map((dark) => [scheme, dark] as const),
    ),
  )(
    'agrees with resolveScheme for %s when system dark is %s',
    (scheme, dark) => {
      systemPrefersDark(dark);
      window.localStorage.setItem(STORAGE_KEY, scheme);

      run();

      expect(applied()).toBe(resolveScheme(scheme, dark));
    },
  );

  it.each([true, false])(
    'follows the system when nothing is stored and system dark is %s',
    (dark) => {
      systemPrefersDark(dark);

      run();

      expect(applied()).toBe(resolveScheme(null, dark));
    },
  );

  it('treats a stored value that is not a scheme as unpinned', () => {
    systemPrefersDark(true);
    window.localStorage.setItem(STORAGE_KEY, 'sepia');

    run();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(isScheme('sepia')).toBe(false);
  });

  it('does not throw when storage is unavailable', () => {
    systemPrefersDark(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(run).not.toThrow();
  });
});

describe('useScheme', () => {
  function mount() {
    const seen: {
      current: readonly [Scheme, (n: Scheme) => void] | null;
    } = {
      current: null,
    };
    function Probe() {
      seen.current = useScheme();
      return null;
    }
    render(<Probe />);
    return {
      get scheme() {
        return seen.current?.[0];
      },
      set(next: Scheme) {
        seen.current?.[1](next);
      },
    };
  }

  it('reports what the system prefers, and follows it changing', () => {
    const system = systemPrefersDark(true);
    const h = mount();

    // The RESOLVED scheme, which is the whole reason the hook returns this and not
    // the stored choice: the toggle has no `system` state left to render.
    expect(h.scheme).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    act(() => system.flip(false));
    expect(h.scheme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('pins a scheme, persists it, and stops following the system', () => {
    const system = systemPrefersDark(false);
    const h = mount();

    act(() => h.set('dark'));

    expect(h.scheme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    act(() => system.flip(true));
    act(() => system.flip(false));
    expect(h.scheme).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('reads a scheme pinned before it mounted', () => {
    systemPrefersDark(true);
    window.localStorage.setItem(STORAGE_KEY, 'light');
    const h = mount();

    expect(h.scheme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

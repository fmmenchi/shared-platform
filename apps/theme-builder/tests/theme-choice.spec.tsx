import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BOOT_SCRIPT,
  STORAGE_KEY,
  THEME_CHOICES,
  applyScheme,
  isThemeChoice,
  resolveScheme,
  useThemeChoice,
  type ThemeChoice,
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
  // and fall back to `system` — two failures that were about test hygiene, not the
  // hook. Measured.
  vi.restoreAllMocks();
});

describe('resolveScheme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveScheme('system', true)).toBe('dark');
    expect(resolveScheme('system', false)).toBe('light');
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

  it.each(
    THEME_CHOICES.flatMap((choice) =>
      [true, false].map((dark) => [choice, dark] as const),
    ),
  )(
    'agrees with resolveScheme for %s when system dark is %s',
    (choice, dark) => {
      systemPrefersDark(dark);
      window.localStorage.setItem(STORAGE_KEY, choice);

      run();

      const applied = document.documentElement.hasAttribute('data-theme')
        ? 'dark'
        : 'light';
      expect(applied).toBe(resolveScheme(choice, dark));
    },
  );

  it('treats a stored value that is not a choice as system', () => {
    systemPrefersDark(true);
    window.localStorage.setItem(STORAGE_KEY, 'sepia');

    run();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(isThemeChoice('sepia')).toBe(false);
  });

  it('does not throw when storage is unavailable', () => {
    systemPrefersDark(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(run).not.toThrow();
  });
});

describe('useThemeChoice', () => {
  function mount() {
    const seen: {
      current: readonly [ThemeChoice, (n: ThemeChoice) => void] | null;
    } = {
      current: null,
    };
    function Probe() {
      seen.current = useThemeChoice();
      return null;
    }
    render(<Probe />);
    return {
      get choice() {
        return seen.current?.[0];
      },
      set(next: ThemeChoice) {
        seen.current?.[1](next);
      },
    };
  }

  it('starts on system, applies what the system prefers, and follows it changing', () => {
    const system = systemPrefersDark(true);
    const h = mount();

    expect(h.choice).toBe('system');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    act(() => system.flip(false));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('pins a choice, persists it, and stops following the system', () => {
    const system = systemPrefersDark(false);
    const h = mount();

    act(() => h.set('dark'));

    expect(h.choice).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    act(() => system.flip(true));
    act(() => system.flip(false));
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('reads a choice stored before it mounted', () => {
    systemPrefersDark(true);
    window.localStorage.setItem(STORAGE_KEY, 'light');
    const h = mount();

    expect(h.choice).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

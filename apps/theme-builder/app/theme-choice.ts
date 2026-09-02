import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { Scheme } from './declarations';

/**
 * WHICH THEME THE SHELL WEARS — the person's choice, or the system's.
 *
 * The chrome of this app used to be the reference theme, light, always. That was
 * argued as a failure mode: a draft whose contrast fails must not take down the
 * controls that would fix it. The argument is right about the DRAFT and says nothing
 * about light versus dark — the design system's own dark preset is a finished theme,
 * and a builder that ignored the system's dark mode was the one product in the
 * workspace that did. So the shell follows `prefers-color-scheme` by default, and a
 * switcher in the header can pin it either way.
 *
 * THREE CHOICES, NOT TWO. `system` is a real state, not "no choice": it means the
 * page will change when the OS does, which neither pinned value promises, and a person
 * who pinned dark and later wants to follow the system again needs something to
 * choose. It is also the default, so a person who never touches the switcher gets the
 * page they asked their OS for.
 *
 * THE PRESET IS SELECTED BY `[data-theme='dark']`, on `<html>`, which is how the design
 * system says a preset is applied — `presets/dark.css` is "a complete assignment of
 * every COLOR role under `[data-theme='dark']`". Light is the absence of the attribute:
 * `:root` is the reference theme, so there is nothing to select. Following the system
 * therefore needs a line of JavaScript — an attribute cannot watch a media query — and
 * `resolveScheme` is that line, written once and used twice: by the hook after
 * hydration, and by `BOOT_SCRIPT` before the first paint.
 *
 * THE PREVIEW IS UNAFFECTED. `ThemeScope` sets the 84 roles as inline custom
 * properties on its subtree, and inline wins over any stylesheet rule, so the theme
 * being built stays the theme being built whichever preset the shell wears around it.
 * `tests/theme-choice.spec.tsx` asserts the boot script and the hook agree with
 * `resolveScheme`, and that a stored value that is not a choice falls back to
 * `system` rather than throwing.
 */
export const THEME_CHOICES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** What the switcher shows for each choice. */
export const THEME_CHOICE_LABELS: Readonly<Record<ThemeChoice, string>> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * ONE KEY, spelled here and nowhere else. The boot script is built from this constant
 * rather than repeating it, so the two readers of the storage cannot disagree on
 * where the choice lives.
 */
export const STORAGE_KEY = 'fm-theme-builder:theme';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (THEME_CHOICES as readonly unknown[]).includes(value);
}

/** Which preset a choice means, given what the system currently prefers. */
export function resolveScheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): Scheme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}

/**
 * Put the scheme on the root element the way the design system selects on it.
 * Light REMOVES the attribute rather than writing `light`: `:root` is the light
 * theme, and an attribute that selects nothing is a value with no reader.
 */
export function applyScheme(root: Element, scheme: Scheme): void {
  if (scheme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * RUNS BEFORE THE FIRST PAINT, inline in `<head>`, so a person who chose dark never
 * sees a light flash while React boots — the server does not know the choice, and a
 * page that painted light and then corrected itself would be the flash every
 * hand-rolled theme switcher is known for.
 *
 * It is the same decision as `resolveScheme` + `applyScheme`, transcribed to the
 * ES5 a script tag needs, and BUILT FROM THE SAME CONSTANTS — the key, the two
 * pinned values, the query — so an edit to one of them reaches both readers. The
 * spec runs this string in jsdom against the TypeScript functions and fails if the
 * two ever answer differently. `try` because storage access throws in some private
 * modes, and a theme switcher must never be what breaks the page.
 */
export const BOOT_SCRIPT =
  `(function(){try{` +
  `var c=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});` +
  `var d=c==='dark'||(c!=='light'&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);` +
  `var r=document.documentElement;` +
  `if(d)r.setAttribute('data-theme','dark');else r.removeAttribute('data-theme');` +
  `}catch(e){}})();`;

/** A tiny event bus for the same-document case `storage` events do not cover. */
const CHANGE_EVENT = 'fm-theme-builder:theme-change';

function readChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** On the server, and during hydration, there is no choice yet: the default. */
const serverSnapshot = (): ThemeChoice => 'system';

/**
 * The current choice, and a setter that persists it.
 *
 * `useSyncExternalStore` rather than `useState` seeded from storage, because the
 * store IS external — `localStorage` — and because hydration has to render what the
 * server rendered (`system`) before it may show the stored value. The primitive does
 * both; a `useState` + effect would set state in an effect, which is the cascading
 * render the lint rule refuses, and would still mismatch on the first client render.
 *
 * The effect below APPLIES the resolved scheme and keeps applying it while the OS
 * changes its mind. It touches the DOM, not state.
 */
export function useThemeChoice(): readonly [
  ThemeChoice,
  (next: ThemeChoice) => void,
] {
  const choice = useSyncExternalStore(subscribe, readChoice, serverSnapshot);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () =>
      applyScheme(
        document.documentElement,
        resolveScheme(choice, media.matches),
      );
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage refused (private mode, quota): the choice still applies for this
      // page through the event below; it just will not survive a reload.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [choice, setChoice] as const;
}

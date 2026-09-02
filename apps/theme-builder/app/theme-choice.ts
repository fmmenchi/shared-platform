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
 * toggle in the header can pin it either way.
 *
 * TWO STATES IN THE UI, THREE IN THE MODEL, and the difference is the whole design.
 * An earlier version offered `system` as a THIRD BUTTON, on the argument that
 * following the OS is a real state a person must be able to return to. It is a real
 * state — it is just not a real CHOICE, because it is what you get by not choosing.
 * Spending a third of a control on the default is paying for the case nobody clicks.
 *
 * So `system` moved from the control to the STORAGE: nothing stored means follow the
 * OS, which is where a person starts and where they stay until they touch the toggle.
 * `ThemeChoice` is `Scheme | null` and the `null` is that state, spelled once.
 *
 * WHAT THAT COSTS, recorded because it is a real trade and not an oversight: once a
 * person pins, they cannot go back to following the OS from this UI. The page stops
 * changing when the OS does. That is the behaviour of nearly every dark toggle on the
 * web, and it is the price of the button we did not spend.
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
 * `resolveScheme`, and that a stored value that is not a scheme falls back to
 * following the system rather than throwing.
 */
export const SCHEMES = ['light', 'dark'] as const;

/**
 * What the person pinned — or `null`, which is not "no value" but the third state:
 * follow whatever the OS currently prefers, and keep following it when it changes.
 */
export type ThemeChoice = Scheme | null;

/**
 * ONE KEY, spelled here and nowhere else. The boot script is built from this constant
 * rather than repeating it, so the two readers of the storage cannot disagree on
 * where the choice lives.
 */
export const STORAGE_KEY = 'fm-theme-builder:theme';

export function isScheme(value: unknown): value is Scheme {
  return (SCHEMES as readonly unknown[]).includes(value);
}

/** Which preset a choice means, given what the system currently prefers. */
export function resolveScheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): Scheme {
  return choice ?? (systemPrefersDark ? 'dark' : 'light');
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
 *
 * Note it already encoded the two-state model before the UI did: anything that is
 * not `dark` or `light` falls through to the media query.
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
    return isScheme(stored) ? stored : null;
  } catch {
    return null;
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

/** On the server, and during hydration, nothing is pinned: follow the system. */
const choiceServerSnapshot = (): ThemeChoice => null;

/**
 * WHAT THE OS PREFERS, AS A STORE rather than as an effect. `matchMedia` is external
 * state with a subscription, which is exactly what `useSyncExternalStore` is for, and
 * reading it this way is what makes the two-state UI possible at all: the toggle has
 * to render the RESOLVED scheme (there is no `system` button left to render instead),
 * so the resolution has to happen during render.
 *
 * The server cannot know the preference, so it reports light — and the primitive
 * handles the rest by design: it renders `getServerSnapshot` during hydration and
 * re-renders with the real value immediately after, so there is no hydration mismatch
 * to suppress. The page itself never flashes, because `BOOT_SCRIPT` painted the right
 * preset before React existed; only `aria-pressed` settles a tick later.
 */
function subscribeSystem(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const readSystemPrefersDark = (): boolean =>
  window.matchMedia(DARK_QUERY).matches;

const systemServerSnapshot = (): boolean => false;

/**
 * The scheme in force, and a setter that pins one.
 *
 * `useSyncExternalStore` twice rather than `useState` seeded from storage, because
 * both sources ARE external — `localStorage` and `matchMedia` — and because hydration
 * has to render what the server rendered before it may show the real values.
 *
 * The effect below only APPLIES the resolved scheme to the document. It touches the
 * DOM, not state: keeping the media query in a store rather than in an effect is what
 * leaves it with that single job.
 */
export function useScheme(): readonly [Scheme, (next: Scheme) => void] {
  const choice = useSyncExternalStore(
    subscribe,
    readChoice,
    choiceServerSnapshot,
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystem,
    readSystemPrefersDark,
    systemServerSnapshot,
  );

  const scheme = resolveScheme(choice, systemPrefersDark);

  useEffect(() => {
    applyScheme(document.documentElement, scheme);
  }, [scheme]);

  const setScheme = useCallback((next: Scheme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage refused (private mode, quota): the choice still applies for this
      // page through the event below; it just will not survive a reload.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [scheme, setScheme] as const;
}

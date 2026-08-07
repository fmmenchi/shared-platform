import { useCallback, useMemo, useRef } from 'react';
import { useUiAdapters } from '../../i18n/provider.js';
import { byPrefix, isSearchKey, TYPEAHEAD_WINDOW } from './menu.keyboard.js';
import type { Descendant } from '../../primitives/use-descendants.types.js';
import type { MenuItemData } from './menu.context.js';

/**
 * TYPING TO REACH A COMMAND, which a menu and a menubar owe identically — the
 * APG asks for it on both, and the rules that make it work are the same rules.
 *
 * Here rather than copied into each, because none of what makes it correct is
 * obvious enough to survive being written twice: the window, the collator, when
 * Space belongs to the search, and when the keystroke is not the menu's at all.
 */
export function useTypeahead() {
  const query = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The locale is an adapter the design system already requires, and typing is
  // the one place a component has to compare two strings the way its user's
  // language does. Read tolerantly: a component that merely ASKS for an adapter
  // must not require the provider to exist.
  const locale = useUiAdapters()?.i18n.locale;
  const collator = useMemo(
    // `base` sensitivity is what makes "e" find "Élève": it settles case and
    // accents together, which no pair of lowercasing rules can.
    () => new Intl.Collator(locale, { usage: 'search', sensitivity: 'base' }),
    [locale],
  );

  /** A search does not outlive the surface it was typed into. */
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    query.current = '';
  }, []);

  /**
   * `undefined` when the key is NOT a search and belongs to whoever has the
   * focus — the caller must leave it alone. Otherwise the command the search
   * reached, or `null` when it reached none, which is still a key the caller
   * has taken.
   */
  const search = useCallback(
    (
      // Whatever `isSearchKey` needs to tell a character from a shortcut —
      // taken from it, so the two cannot disagree about what a keystroke is.
      event: Parameters<typeof isSearchKey>[0],
      items: Descendant<MenuItemData>[],
      from: number,
    ): HTMLElement | null | undefined => {
      if (!isSearchKey(event)) return undefined;

      // Searched BEFORE the key is committed, because whether Space belongs to
      // the search is the answer to that search: it does while the search still
      // finds something — `Copy link` cannot be reached without one — and
      // otherwise it is the command's own key. Asking instead whether a search
      // was merely RUNNING left a slow typist who pressed "d", "e", Space with
      // the focus unmoved and the command not run, because "de " matches
      // nothing.
      const next = query.current + event.key;
      const match = byPrefix(items, next, from, collator);
      if (event.key === ' ' && !match) return undefined;

      query.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        query.current = '';
      }, TYPEAHEAD_WINDOW);

      return match;
    },
    [collator],
  );

  return { search, clear };
}

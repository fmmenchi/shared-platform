import { describe, it, expect } from 'vitest';
import { byPrefix, inlineEnd, isSearchKey, step } from './menu.keyboard.js';
import type { MenuItemData } from './menu.context.js';
import type { Descendant } from '../../primitives/use-descendants.types.js';

/**
 * The menu's keyboard arithmetic, called directly.
 *
 * `menu.test.tsx` drives the same code with a real keyboard and is the better
 * test wherever it can reach — these are the cases it CANNOT reach, and they
 * are why this file exists: a harness will not deliver an astral `event.key`,
 * it cannot produce AltGr at all, and a multi-character search from "nothing
 * holds the focus" cannot be typed, because the first character always moves
 * the focus onto a command.
 */
const items = (
  ...labels: (string | { html: string; data?: Partial<MenuItemData> })[]
): Descendant<MenuItemData>[] =>
  labels.map((label, index) => {
    const element = document.createElement('button');
    const spec = typeof label === 'string' ? { html: label } : label;
    element.innerHTML = spec.html;
    return { element, data: { id: `i${index}`, ...spec.data } };
  });

const nameOf = (element: HTMLElement | null) => element?.textContent ?? null;

const key = (over: Partial<Parameters<typeof isSearchKey>[0]>) =>
  isSearchKey({
    key: 'a',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    getModifierState: () => false,
    ...over,
  });

describe('step', () => {
  const three = () => items('one', 'two', 'three');

  it('wraps in both directions', () => {
    expect(nameOf(step(three(), 2, 1))).toBe('one');
    expect(nameOf(step(three(), 0, -1))).toBe('three');
  });

  it('starts at an end when nothing holds the focus', () => {
    expect(nameOf(step(three(), -1, 1))).toBe('one');
    // The arithmetic that made the first version skip the last command: `-1`
    // is not "before the first" for a step that then wraps.
    expect(nameOf(step(three(), -1, -1))).toBe('three');
  });

  it('has nowhere to go in an empty menu, and stays put in a menu of one', () => {
    expect(step(items(), 0, 1)).toBeNull();
    expect(nameOf(step(items('only'), 0, 1))).toBe('only');
  });
});

describe('byPrefix', () => {
  const collator = new Intl.Collator(undefined, {
    usage: 'search',
    sensitivity: 'base',
  });
  const find = (
    all: Descendant<MenuItemData>[],
    query: string,
    from: number,
    locale?: string,
  ) =>
    nameOf(
      byPrefix(
        all,
        query,
        from,
        locale
          ? new Intl.Collator(locale, { usage: 'search', sensitivity: 'base' })
          : collator,
      ),
    );

  it('searches from the top when nothing holds the focus', () => {
    // UNTYPEABLE: to reach a multi-character search with `from === -1` the
    // first character would have to leave the focus where it was, and it never
    // does — it matches something and moves. Starting at "nowhere" instead of
    // at the top silently drops the LAST command, which is the only one here.
    const all = items('copy', 'cut', 'rename');
    expect(find(all, 'ren', -1)).toBe('rename');
  });

  it('takes a whole character at a time', () => {
    // The discriminating case is an ORDINARY key pressed at a name that starts
    // with an astral character: measured, the collator equates 𝐀 with "a" at
    // base sensitivity, so this command does answer to "a" — while a head
    // sliced by code unit is half a surrogate pair, which matches nothing. (A
    // test that typed 𝐀 itself would prove nothing: the two slices agree
    // wherever the name and what was typed are the same shape.)
    const all = items('𝐀rchive', 'rename');
    expect(find(all, 'a', -1)).toBe('𝐀rchive');
    expect(find(all, 'r', -1)).toBe('rename');
  });

  it('moves on for one character and refines for more', () => {
    const all = items('copy', 'copy link', 'cut');
    expect(find(all, 'c', 0)).toBe('copy link');
    expect(find(all, 'cu', 0)).toBe('cut');
    // Already on it, and still on it: a longer search may be refining.
    expect(find(all, 'co', 0)).toBe('copy');
  });

  it('falls back to the walk only when the whole query finds nothing', () => {
    expect(find(items('copy', 'copy link', 'cut'), 'cc', 0)).toBe('copy link');
    // A doubled letter that starts a word is a word, not a walk.
    expect(find(items('aanmaken', 'archiveren'), 'aa', 0)).toBe('aanmaken');
  });

  it('compares the way a language does', () => {
    expect(find(items('ranger', 'élève'), 'e', 0)).toBe('élève');
    expect(find(items('ranger', 'élève'), 'R', 0)).toBe('ranger');
    expect(find(items('ładuj', 'zapisz'), 'l', 0, 'pl')).toBe('ładuj');
    // …and keeps apart what a language keeps apart: in Turkish these are two
    // different letters, which no pair of lowercasing rules can express.
    expect(find(items('ıptal', 'kaydet'), 'i', 0, 'tr')).toBeNull();
  });

  it('matches the name, not the markup', () => {
    // Decoration is in the text and not in the name, and a screen reader goes
    // on calling this command "delete".
    const decorated = items('<span aria-hidden="true">🗑</span>delete');
    expect(byPrefix(decorated, 'd', -1, collator)).toBe(decorated[0]?.element);

    // A command labelled only by an icon has no text at all. Asserted against
    // the ELEMENT, because its text is the empty string either way.
    const labelled = items('<svg></svg>');
    labelled[0]?.element.setAttribute('aria-label', 'archive');
    expect(byPrefix(labelled, 'a', -1, collator)).toBe(labelled[0]?.element);

    const declared = items({ html: 'x', data: { textValue: 'duplicate' } });
    expect(byPrefix(declared, 'd', -1, collator)).toBe(declared[0]?.element);
    expect(byPrefix(declared, 'x', -1, collator)).toBeNull();
  });

  it('has nothing to answer with in an empty menu', () => {
    expect(find(items(), 'a', -1)).toBeNull();
    expect(find(items('one'), 'z', 0)).toBeNull();
  });
});

describe('inlineEnd', () => {
  it('puts a submenu where the reader is going, and names the keys for it', () => {
    // UNTESTABLE through the rendered surface: `flip()` moves it when there is
    // no room, so on a phone-width viewport a right-hand submenu ends up on the
    // left whatever was asked for — measured, a hardcoded LTR placement passed
    // an RTL test for that reason alone.
    expect(inlineEnd('ltr')).toEqual({
      placement: 'right-start',
      forward: 'ArrowRight',
      back: 'ArrowLeft',
    });
    expect(inlineEnd('rtl')).toEqual({
      placement: 'left-start',
      forward: 'ArrowLeft',
      back: 'ArrowRight',
    });
  });
});

describe('isSearchKey', () => {
  it('takes a printable character', () => {
    expect(key({ key: 'a' })).toBe(true);
    expect(key({ key: ' ' })).toBe(true);
    expect(key({ key: '𝐀' })).toBe(true);
    expect(key({ key: 'Enter' })).toBe(false);
    expect(key({ key: 'ArrowDown' })).toBe(false);
  });

  it('leaves the browser its shortcuts', () => {
    expect(key({ key: 'a', metaKey: true })).toBe(false);
    expect(key({ key: 'a', ctrlKey: true })).toBe(false);
    expect(key({ key: 'a', altKey: true })).toBe(false);
    // Shift is a capital letter, not a shortcut.
    expect(key({ key: 'A' })).toBe(true);
  });

  it('lets AltGr through, however the platform reports it', () => {
    // UNPRODUCIBLE by this harness: `{AltGraph>}` sets neither modifier, so a
    // test written with it passes with the guard removed — measured.
    expect(key({ key: 'ą', getModifierState: (k) => k === 'AltGraph' })).toBe(
      true,
    );
    // Windows says Ctrl+Alt and nothing else. No web shortcut uses that pair.
    expect(key({ key: 'ą', ctrlKey: true, altKey: true })).toBe(true);
  });
});

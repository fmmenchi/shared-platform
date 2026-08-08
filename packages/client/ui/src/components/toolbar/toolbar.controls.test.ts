import { describe, it, expect, afterEach } from 'vitest';
import { canHoldFocus, takesArrows } from './toolbar.controls.js';

/**
 * Pure, so both are tested without a toolbar around them — the same reason
 * `roving.ts` is not inside the menu. What they decide is whether the bar keeps
 * its hands off the arrow keys, and which controls the arrows may land on;
 * getting either wrong is invisible until somebody cannot move a caret, or
 * cannot reach the bar at all.
 */
const made: Element[] = [];

const el = (html: string): Element => {
  const host = document.createElement('div');
  host.innerHTML = html;
  const node = host.firstElementChild as Element;
  document.body.append(host);
  made.push(host);
  return node;
};

afterEach(() => {
  made.splice(0).forEach((node) => node.remove());
});

describe('takesArrows', () => {
  it('says no to the controls a toolbar is made of', () => {
    expect(takesArrows(el('<button type="button">Bold</button>'))).toBe(false);
    expect(takesArrows(el('<a href="#x">Link</a>'))).toBe(false);
    expect(takesArrows(el('<input type="checkbox" />'))).toBe(false);
    expect(takesArrows(el('<input type="file" />'))).toBe(false);
    expect(takesArrows(el('<input type="color" />'))).toBe(false);
    expect(takesArrows(el('<div role="button">Bold</div>'))).toBe(false);
  });

  it('says yes to a caret', () => {
    expect(takesArrows(el('<input type="text" />'))).toBe(true);
    expect(takesArrows(el('<input type="search" />'))).toBe(true);
    expect(takesArrows(el('<input type="email" />'))).toBe(true);
    expect(takesArrows(el('<textarea></textarea>'))).toBe(true);
    expect(takesArrows(el('<div contenteditable="true">text</div>'))).toBe(
      true,
    );
  });

  it('says yes to a stepper, a thumb and a list', () => {
    expect(takesArrows(el('<input type="number" />'))).toBe(true);
    expect(takesArrows(el('<input type="range" />'))).toBe(true);
    expect(takesArrows(el('<input type="date" />'))).toBe(true);
    expect(takesArrows(el('<select><option>a</option></select>'))).toBe(true);
  });

  it('says yes when the role says so and the element does not', () => {
    // A control somebody built rather than borrowed. The role is the only thing
    // that says what its arrows do.
    expect(takesArrows(el('<div role="slider" tabindex="0"></div>'))).toBe(
      true,
    );
    expect(takesArrows(el('<div role="spinbutton" tabindex="0"></div>'))).toBe(
      true,
    );
    expect(takesArrows(el('<div role="combobox" tabindex="0"></div>'))).toBe(
      true,
    );
    // A radio group's arrows are the platform's, and a toolbar that took them
    // would break a group it did not build — so the native one and the built
    // one have to answer the SAME. They did not in the first version of this
    // file, which is exactly the kind of split a table of two lists invites.
    expect(takesArrows(el('<input type="radio" />'))).toBe(true);
    expect(takesArrows(el('<div role="radio" tabindex="0"></div>'))).toBe(true);
  });

  it('treats an unknown input type the way the browser does', () => {
    // `type` reflects to `text` for anything it does not recognise, and the
    // control it paints is a text field — so the answer has to match.
    expect(takesArrows(el('<input type="wat" />'))).toBe(true);
    expect(takesArrows(el('<input />'))).toBe(true);
  });

  it('answers for nothing at all', () => {
    // `document.activeElement` is null in a document nothing has focused.
    expect(takesArrows(null)).toBe(false);
  });
});

describe('canHoldFocus', () => {
  it('says no to a natively disabled control', () => {
    // The distinction the tab list never had to draw. `aria-disabled` is
    // focusable and walked ONTO; the native attribute is not focusable at all,
    // so a ring that lands on it is a ring that has stopped.
    expect(
      canHoldFocus(el('<button type="button" disabled>Bold</button>')),
    ).toBe(false);
    expect(canHoldFocus(el('<input type="text" disabled />'))).toBe(false);
    expect(canHoldFocus(el('<select disabled></select>'))).toBe(false);
  });

  it('says yes to an aria-disabled one', () => {
    // Focusable and refusing to activate — the APG's "focusable but cannot be
    // activated". A control the arrows skip is one the reader is never told
    // exists.
    expect(
      canHoldFocus(el('<button type="button" aria-disabled="true">B</button>')),
    ).toBe(true);
  });

  it('says yes to an ordinary control', () => {
    expect(canHoldFocus(el('<button type="button">Bold</button>'))).toBe(true);
    expect(canHoldFocus(el('<a href="#x">Link</a>'))).toBe(true);
    expect(canHoldFocus(el('<div role="button" tabindex="0"></div>'))).toBe(
      true,
    );
  });
});

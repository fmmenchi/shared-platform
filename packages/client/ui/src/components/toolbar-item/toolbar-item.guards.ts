import { useEffect } from 'react';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';

/**
 * What the tab stop may be written onto: something a user can actually reach.
 *
 * DELIBERATELY NOT `[tabindex]`, which is the obvious way to write this and is
 * circular here — the toolbar writes that attribute itself, before this check
 * runs, so every wrapper it had just broken would answer "focusable" and the
 * guard would never fire. A control somebody BUILT says what it is with a role
 * instead, which is the question below.
 */
const NATIVE = 'a[href], button, input, select, textarea, [contenteditable]';

/**
 * The two ways a `ToolbarItem` fails in SILENCE, and they are the two most
 * likely things a consumer will write.
 *
 * `isValidElement` is the wrong question and the first version asked only that.
 * It is TRUE for a fragment, and true for a component that quietly ignores the
 * `ref` it is handed — which in React 19 is an ordinary prop, so nothing else
 * complains either. In both cases the control is never registered: it keeps its
 * natural tab stop, the bar walks past it, and the toolbar's one promise is
 * broken with nothing logged anywhere.
 *
 * Both are only answerable from the DOM, one task later — see `deferDevCheck`,
 * and `tooltip.guards.ts`, which guards the same clone contract the same way.
 *
 * The named cases behind the first message, all verified against the package:
 * `<Tooltip>` and `<Menu>` render no element of their own and take no `ref`, so
 * a control wrapped in either inside a `ToolbarItem` never arrives. The way
 * round is to put `ToolbarItem` on the thing that IS the control —
 * `<Tooltip><ToolbarItem><Button/></ToolbarItem></Tooltip>`, and
 * `<Menu><ToolbarItem><MenuTrigger/></ToolbarItem><MenuContent/></Menu>` —
 * which works because `ToolbarItem` forwards what it is given.
 */
export function useToolbarItemWarnings(node: HTMLElement | null): void {
  useEffect(() => {
    return deferDevCheck(() => {
      if (!node) {
        console.warn(
          'ToolbarItem: the control never received a ref, so it is not on the ' +
            "toolbar's ring — it keeps its own tab stop and the arrows walk " +
            'past it. `children` must be a SINGLE element that forwards its ' +
            '`ref` to the DOM node it renders: not a fragment, and not a ' +
            'component that drops the prop. A `Tooltip` or a `Menu` renders no ' +
            'element of its own — put the `ToolbarItem` inside it, around the ' +
            'control itself.',
        );
        return;
      }

      // Native, or something carrying a role — a control a consumer built out
      // of a `<div>` is legitimate, and its role is what says so.
      if (node.matches(NATIVE) || node.getAttribute('role') !== null) return;
      console.warn(
        'ToolbarItem: the ref landed on an element that cannot be focused, so ' +
          'the toolbar has put its tab stop on something with no role and no ' +
          'name — and the real control inside it still has a tab stop of its ' +
          'own. This is what a wrapper component does: `ChoiceField`, ' +
          '`InputGroup` and a plain `<label>` all forward their ref to a ' +
          '`<div>`. Wrap the control itself.',
      );
    });
  }, [node]);
}

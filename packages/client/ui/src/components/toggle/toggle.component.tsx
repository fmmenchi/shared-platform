import type { MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { Button } from '../button/button.component.js';
import { useControlled } from '../../primitives/use-controlled.js';
import type { ToggleProps } from './toggle.types.js';
import styles from './toggle.module.css';

/**
 * A button that STAYS PRESSED — bold, italic, "show the grid" — applying to
 * whatever is selected right now. It carries `aria-pressed`, so assistive tech
 * announces the state as part of the button rather than as a separate control.
 *
 * THE BOUNDARY, because these three are the most confused trio in any design
 * system and the mistake is invisible until someone uses a screen reader
 * (ADR-0024):
 *
 * - **Toggle** — a button that stays pressed. It acts on the CURRENT CONTEXT
 *   (the selection, this view), immediately, and submits nothing: it is
 *   `type="button"` and has no form value.
 * - **`Switch`** — a SETTING that applies the moment you flip it and is still
 *   true tomorrow. `role="switch"` on a checkbox input, so it has a value and
 *   a form can carry it.
 * - **`Checkbox`** — INCLUSION IN A SET, submitted with the form. Its effect
 *   waits for the submit, and it is the only one of the three that SHIPS a
 *   third state (`checked="indeterminate"`). ARIA does define
 *   `aria-pressed="mixed"` — a bold button over a part-bold selection is a
 *   real state — and `pressed` can take it the day something needs it, the
 *   same shape `checked` already uses. Nothing does yet.
 *
 * The field test that survives an argument: does it act on *this thing here*
 * (Toggle), does it change a preference that outlives the page (Switch), or is
 * it one of several things you are including in what you send (Checkbox)?
 *
 * THE STATE IS OURS TO HOLD, which is the same reading of this package's rule
 * that `Tabs` records: the DOM keeps the state of controls the BROWSER paints,
 * and `aria-pressed` is painted by nobody. There is no second copy to disagree
 * with, so `useControlled` is the whole implementation.
 *
 * It composes `Button` rather than redrawing one (as `DialogClose` does), so
 * the sizes, the 44px coarse-pointer target, the focus ring, the icon slots and
 * the pending state are the ones already tested there.
 */
function Toggle(props: ToggleProps) {
  // NO DEFAULTS IN THIS PATTERN — a default in a destructuring pattern makes
  // the React Compiler abandon the whole component, silently and with lint
  // green (measured on Checkbox, visible in the shipped bundle).
  const {
    pressed,
    defaultPressed,
    onPressedChange,
    className,
    onClick,
    ...rest
  } = props;

  const [on, setOn] = useControlled<boolean>({
    value: pressed,
    defaultValue: defaultPressed ?? false,
    onChange: onPressedChange,
    name: 'Toggle',
  });

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Their handler first, and `preventDefault` calls the press off — the same
    // contract `DialogClose` offers, and the only way to veto a press without
    // making the state controlled just to refuse one.
    const result = onClick?.(event) as unknown;
    // THE UPDATER, not `!on` — the render value this closure captured.
    // `useControlled`'s own doc records this exact shape as the defect the
    // updater was introduced for: two calls in one tick both compute from the
    // same base and the first one vanishes. Two presses in one tick are real —
    // two synchronous `.click()`s under React's batching, or a consumer's key
    // handler forwarding a click beside the native one — and left the button
    // stuck after an even number of presses, with `onPressedChange` firing
    // twice with the same value.
    if (!event.defaultPrevented) setOn((prev) => !prev);
    // Handed back so a Toggle whose handler is `async` still gets Button's
    // self-managed pending state; swallowing it would quietly drop a feature
    // the props promise.
    return result;
  };

  return (
    <Button
      className={cn(styles.toggle, className)}
      {...rest}
      // AFTER the spread, all three: these are the component's own claims about
      // the element rather than defaults a caller may edit. The types already
      // remove them, but a JS consumer has no types, and `type="submit"` in
      // particular would turn a toolbar button into one that posts the page.
      variant="ghost"
      type="button"
      aria-pressed={on}
      onClick={handleClick}
    />
  );
}

export { Toggle };

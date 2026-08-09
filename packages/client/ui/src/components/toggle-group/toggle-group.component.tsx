import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { ToggleGroupContext } from './toggle-group.context.js';
import type { ToggleGroupContextValue } from './toggle-group.context.js';
import type { ToggleGroupProps } from './toggle-group.types.js';
import styles from './toggle-group.module.css';

/**
 * ONE of a small set of options, drawn as a row of buttons — text alignment,
 * a chart's range, a view switcher.
 *
 * IT IS A RADIO GROUP (ADR-0025), and that is the decision rather than an
 * implementation detail. ADR-0024 left this open with the sentence that settles
 * it: "exactly one of these" is a radio group's question, so a row of pressed
 * buttons is the wrong answer to it — `aria-pressed` says a button is on, not
 * that its siblings are therefore off. Each segment is a native
 * `<input type="radio">` with the visible button drawn on its `<label>`, so the
 * platform gives us the whole of the pattern for free: arrow keys that move AND
 * select, one tab stop for the group, `form.reset()`, a submitted value, and
 * the "3 of 5" a screen reader announces.
 *
 * WHAT THIS IS NOT is a group of `Toggle`s. Many-of-many already works and
 * needs no component: a `Toolbar` walks arbitrary controls with the arrows and
 * each `Toggle` keeps its own `aria-pressed` — bold, italic, underline, three
 * independent answers. Building a second thing for that would be a component
 * earning its place by symmetry, which ADR-0016 does not accept.
 *
 * THE STATE STAYS IN THE DOM, so an uncontrolled group hands the item
 * `defaultChecked` and never `checked`. A React copy would cost exactly what it
 * cost the text inputs: `form.reset()` becomes a no-op, because React
 * re-renders its stale value straight back.
 */
function ToggleGroup(props: ToggleGroupProps) {
  const {
    label,
    name,
    value,
    defaultValue,
    onValueChange,
    className,
    children,
    ...rest
  } = props;

  // An EMPTY label only. Absent is legitimate — the set is named by whatever
  // wraps it, and a group cannot see its own `<fieldset>`, so warning on
  // `undefined` would cry wolf at the one anatomy that is correct.
  useDevWarning(
    label !== undefined && label.trim() === '',
    'ToggleGroup: `label` is an empty string, so the set is announced as just "group". Leave it out to be named by a surrounding <Fieldset>, or give it a name.',
  );
  useDevWarning(
    name.trim() === '',
    'ToggleGroup: `name` is empty, so the options do not pair — the platform will treat each as its own group and the arrows will not move between them.',
  );
  // THE WARNING WE TOOK AWAY, put back. Every item carries an `onChange` of
  // ours, so React can no longer see that the consumer forgot theirs and its
  // own "controlled without onChange" warning never fires — the exact silence
  // `Checkbox` records as the reason it refuses to wrap a handler. Controlled
  // with nothing listening is a set that cannot move and says nothing about it.
  // A native `onChange` on the group counts as listening, and that is not a
  // loophole: `change` bubbles from the option the user picked, so a caller
  // driving the set from `event.target.value` hears every pick. It is how the
  // bound component listens, since a form adapter's bag is native props.
  useDevWarning(
    value !== undefined &&
      onValueChange === undefined &&
      rest.onChange === undefined,
    'ToggleGroup: `value` is set but nothing is listening, so the set is frozen — every pick is reported to nobody and the selection never changes. Pass `onValueChange` (or a native `onChange`), or use `defaultValue` and let the DOM keep it.',
  );

  // No hand-memoization: the React Compiler keys this on the values it is built
  // from, which is the honest dependency and the package's rule.
  const context: ToggleGroupContextValue = {
    name,
    value,
    defaultValue,
    controlled: value !== undefined,
    select: (next) => onValueChange?.(next),
  };

  return (
    <div
      className={cn(styles.group, className)}
      {...rest}
      // After the spread, and TOGETHER: the role goes with the name. Named from
      // outside — by a `Fieldset`'s legend — this wrapper is not a group of its
      // own: the radios are already grouped by the fieldset and paired by
      // `name`, so a second, nameless `radiogroup` would only be announced.
      role={label === undefined ? undefined : 'radiogroup'}
      aria-label={label}
    >
      <ToggleGroupContext.Provider value={context}>
        {children}
      </ToggleGroupContext.Provider>
    </div>
  );
}

export { ToggleGroup };

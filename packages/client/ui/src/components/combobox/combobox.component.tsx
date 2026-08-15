import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useControlled } from '../../primitives/use-controlled.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { useMessages } from '../../i18n/provider.js';
import { comboboxVariants } from './combobox.variants.js';
import { comboboxMessages } from './combobox.messages.js';
import { matches } from './combobox.filter.js';
import type { ComboboxProps } from './combobox.types.js';
import styles from './combobox.module.css';

/**
 * Choose one of many, by typing.
 *
 *     <Combobox name="city" items={cities} getKey={(c) => c.id} getLabel={(c) => c.name} />
 *
 * THE FIRST CONTROL THIS PACKAGE DRAWS ITSELF, and ADR-0028 is where the price
 * is argued. `Select` keeps the trade it was built for — the box is ours, the
 * list is the browser's — and stays the answer for a short list of plain
 * options. This exists for the four things a `<select>` cannot do at all:
 * search, several-of-many with chips, rows that are not strings, and a value
 * that is not in the list yet. `<input list>` + `<datalist>` is the platform's
 * own answer to the FIRST of those alone, and where that is all a consumer
 * needs it remains the better one; this component does not replace it.
 *
 * THE VISIBLE FIELD HOLDS THE QUERY, NOT THE VALUE. That is the whole shape of
 * the thing: a person types "mil" and means Milan, whose key is `42`. So the
 * choice rides on a hidden native carrier beside the field, which is what keeps
 * `FormData`, `form.reset()` and every form binding working on an ordinary
 * field. What it does not keep is ADR-0013's other guarantee: with the bundle
 * unloaded there is no list and no filtering, so this is the first control here
 * that needs JavaScript to work. Scoped to this component, authorised in the
 * ADR, and stated in the docs where a consumer chooses it.
 *
 * FOCUS NEVER LEAVES THE FIELD. The list is a `role="listbox"` in the top layer
 * and the active row is pointed at with `aria-activedescendant` — not with
 * focus, and therefore not with the `roving` primitive that `Menu`, `Tabs` and
 * `Toolbar` use. That is ARIA 1.2's combobox pattern and it is why the arrows
 * can move a highlight while the caret stays where the person is typing.
 */
function Combobox<T>(props: ComboboxProps<T>) {
  const {
    items,
    getKey,
    getLabel,
    renderItem,
    filter,
    value,
    defaultValue = null,
    onValueChange,
    query,
    defaultQuery = '',
    onQueryChange,
    open,
    defaultOpen = false,
    onOpenChange,
    name,
    size,
    className,
    ref,
    onKeyDown,
    onBlur,
    ...rest
  } = props;

  const t = useMessages(comboboxMessages);
  const listId = useId();
  const optionId = (index: number) => `${listId}-${String(index)}`;
  // THE FIELD IS HELD IN STATE, not in a ref, and that is the Rules of React
  // rather than taste: `useAnchored` takes the anchor as a VALUE, so reading
  // `ref.current` during render to hand it over is exactly the access the
  // compiler refuses ("Cannot access refs during render"). A callback ref makes
  // the node a render-safe value, which is what `Tooltip` and `NavGroup`
  // already do for the same primitive. The ref beside it stays for the two
  // imperative things — focusing after a pick, and merging the caller's.
  const [anchor, setAnchor] = useState<HTMLInputElement | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const surface = useRef<HTMLDivElement>(null);

  const [chosen, setChosen] = useControlled<string | null>({
    value,
    defaultValue,
    onChange: onValueChange,
    name: 'Combobox',
  });
  const [typed, setTyped] = useControlled<string>({
    value: query,
    defaultValue: defaultQuery,
    onChange: onQueryChange,
    name: 'Combobox',
  });
  const [showing, setShowing] = useControlled<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: 'Combobox',
  });
  // The HIGHLIGHT is ours and nobody else's: it is drawing state with no DOM
  // home — an option is not focused — and a consumer holding it would own a
  // second copy of something that changes on every arrow key.
  const [active, setActive] = useState(0);

  // The list, after the consumer's question has been asked of each item. A
  // `false` filter means the items ARE the answer already (a server searched),
  // and asking twice is what empties a list that should have rows in it.
  const shown =
    filter === false || typed === ''
      ? items
      : items.filter((item) =>
          filter ? filter(item, typed) : matches(getLabel(item), typed),
        );

  useAnchored(anchor, surface, {
    open: showing,
    placement: 'bottom-start',
    offset: 4,
    // A field scrolled out of view under an open list leaves the list pointing
    // at nothing, and the top layer is clipped by nothing.
    onAnchorLost: () => setShowing(false),
  });

  // The platform opens and closes this too — Escape, a click outside, another
  // popover taking the top layer — and every one of those arrives as `toggle`.
  //
  // `setShowing` IS PASSED DIRECTLY, and an inline arrow here was a real defect
  // rather than a style point: the primitive says `report` must be stable
  // because it is a subscription dependency AND its cleanup reports closed on
  // the way past. A new identity every render therefore announced the surface
  // shut on every render — measured, it made Enter a no-op (the handler saw a
  // closed list), left the list covering the submit button, and never told a
  // controlled parent anything. The compiler memoises `useControlled`'s setter,
  // so this one is stable by construction.
  useOpenMirror(surface, setShowing);

  // AND THE OTHER DIRECTION. The mirror hears the platform; this asks it — for
  // `defaultOpen`, for a controlled `open`, and for the component's own calls.
  // Guarded by what the element actually is, so the two cannot fight: the
  // effect only acts when the DOM disagrees with the state.
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const shown = node.matches(':popover-open');
    if (showing && !shown) node.showPopover();
    if (!showing && shown) node.hidePopover();
  }, [showing]);

  const show = (next: boolean) => {
    setShowing(next);
  };

  const pick = (index: number) => {
    const item = shown[index];
    if (!item) return;
    setChosen(getKey(item));
    setTyped(getLabel(item));
    show(false);
    field.current?.focus();
  };

  const move = (delta: number) => {
    if (shown.length === 0) return;
    setActive((current) => {
      const next = current + delta;
      // Wraps, which is what a list of a few rows wants and what the APG's own
      // example does. A long list is the consumer's to cap.
      return next < 0 ? shown.length - 1 : next % shown.length;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!showing) {
          show(true);
          setActive(0);
          return;
        }
        move(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Home':
      case 'End': {
        if (!showing) return;
        event.preventDefault();
        setActive(event.key === 'Home' ? 0 : shown.length - 1);
        return;
      }
      case 'Enter': {
        if (!showing) return;
        // Held back from the form: Enter on an open list chooses a row, and a
        // submit here would send the form while the person was still picking.
        event.preventDefault();
        pick(active);
        return;
      }
      case 'Escape': {
        // Closed, it clears — the APG's behaviour, and the only way back to
        // "nothing chosen" from the keyboard alone.
        if (showing) show(false);
        else {
          setTyped('');
          setChosen(null);
        }
        return;
      }
      default:
    }
  };

  return (
    <div className={styles.root}>
      <input
        {...rest}
        ref={mergeRefs(field, setAnchor, ref)}
        className={cn(comboboxVariants({ size }), className)}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={showing}
        aria-controls={listId}
        // `list`, never `both`: inline completion writes into the field as you
        // type, which fights an IME mid-composition and fights a value that is
        // allowed not to be in the list at all.
        aria-autocomplete="list"
        aria-activedescendant={
          showing && shown.length > 0 ? optionId(active) : undefined
        }
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
          setActive(0);
          if (!showing) show(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          onBlur?.(event);
          // The surface is in the top layer and light-dismissed by the
          // platform, so leaving the field is not itself a reason to close —
          // but focus moving somewhere outside both is.
          if (!surface.current?.contains(event.relatedTarget)) show(false);
        }}
      />
      {/* THE CARRIER. Hidden, native, and the only reason a form sees this
          field at all: the visible input above holds the query. */}
      {name === undefined ? null : (
        <input type="hidden" name={name} value={chosen ?? ''} />
      )}
      <div
        ref={surface}
        id={listId}
        role="listbox"
        // `auto`, so the platform gives the top layer AND the light dismiss.
        // Nothing inside is autofocused, which is what keeps the caret in the
        // field — the combobox pattern's one hard requirement.
        popover="auto"
        className={styles.surface}
      >
        {shown.map((item, index) => (
          <div
            key={getKey(item)}
            id={optionId(index)}
            role="option"
            aria-selected={getKey(item) === chosen}
            // Truthful even when a consumer renders a window of a long list:
            // without these a virtualised listbox announces "1 of 20" while the
            // reader walks five thousand records.
            aria-setsize={shown.length}
            aria-posinset={index + 1}
            data-active={index === active ? '' : undefined}
            className={styles.option}
            // `mousedown`, not `click`: the field must not lose focus first,
            // and a click on a row is a pick rather than a focus change.
            onMouseDown={(event) => {
              event.preventDefault();
              pick(index);
            }}
            onMouseEnter={() => setActive(index)}
          >
            {renderItem ? renderItem(item) : getLabel(item)}
          </div>
        ))}
        {shown.length === 0 ? (
          <div className={styles.empty}>{t('empty')}</div>
        ) : null}
      </div>
      {/* Filtering is otherwise silent: the rows change and a screen-reader
          user is told nothing at all. */}
      <VisuallyHidden role="status">
        {showing ? t('results', { count: shown.length }) : ''}
      </VisuallyHidden>
    </div>
  );
}

export { Combobox };

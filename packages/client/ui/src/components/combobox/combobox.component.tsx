import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { setNativeValue } from '../../primitives/set-native-value.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { useFieldControl } from '../field/field.context.js';
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
 * options. This exists for what a `<select>` cannot do: search, rows that are
 * not strings, and (next) several-of-many with chips. `<input list>` +
 * `<datalist>` is the platform's own answer to the first of those alone, and
 * where that is enough it remains the better one.
 *
 * THE VISIBLE FIELD HOLDS THE QUERY, NOT THE VALUE. A person types "mil" and
 * means Milan, whose key is `42`. So the choice rides on a CARRIER beside the
 * field — and the carrier is `DateInput`'s, not a `type="hidden"` of its own,
 * because that difference was measured in this repo before: a hidden input is
 * in value mode "default", so `form.reset()` restores its current value onto
 * itself and the field comes back from a reset still holding the old choice. It
 * is a text input hidden by CSS, out of the accessibility tree and out of the
 * tab order, and still FOCUSABLE — react-hook-form reads `.value` off the node
 * its ref was given, and `FormErrorSummary` finds a field by `name` and focuses
 * it. Both land there.
 *
 * FOCUS NEVER LEAVES THE VISIBLE FIELD. The list is a `role="listbox"` in the
 * top layer and the active row is pointed at with `aria-activedescendant` — not
 * with focus, and therefore not with the `roving` primitive that `Menu`, `Tabs`
 * and `Toolbar` use. That is ARIA 1.2's combobox pattern.
 *
 * MANUAL SELECTION, which is what `aria-autocomplete="list"` declares: opening
 * the list highlights NOTHING, and `Enter` commits only a row the user moved
 * to. The first version highlighted row 0 on every keystroke, so someone typing
 * "man" and pressing Enter to submit the form got "Manchester" instead — the
 * destructive direction of the mistake ADR-0028 §6 refuses free text over.
 */
function Combobox<T>(props: ComboboxProps<T>) {
  const {
    items,
    getKey,
    getLabel,
    renderItem,
    filter,
    freeText = false,
    onCreate,
    canCreate,
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
    form,
    size,
    className,
    ref,
    carrierRef,
    onKeyDown,
    onBlur,
    onChange,
    onClick,
    disabled,
    readOnly,
    ...rest
  } = props;

  const t = useMessages(comboboxMessages);
  const listId = useId();
  const optionId = (index: number) => `${listId}-${String(index)}`;
  const [anchor, setAnchor] = useState<HTMLInputElement | null>(null);
  const visible = useRef<HTMLInputElement>(null);
  const carrier = useRef<HTMLInputElement>(null);
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
  // `null` IS THE OPENING STATE, not `0` — see the note above. The highlight is
  // ours and nobody else's: drawing state with no DOM home, since an option is
  // never focused.
  const [active, setActive] = useState<number | null>(null);
  // WAS THE QUERY TYPED, or is it the label of what was picked? Without this the
  // list reopens filtered by its own answer: choose "Milano" and the only row
  // left is Milano, which reads to a screen reader as one result — as though
  // the other cities had gone.
  const [searching, setSearching] = useState(false);
  // THE CARRIER'S DEFAULT IS A ONE-SHOT, captured at mount and never updated.
  // Bound to the live choice it would defeat the very thing the carrier exists
  // for: React re-syncs `defaultValue` to the current value on every update, so
  // `form.reset()` would restore the field to what it already holds. Every
  // later write goes through `setNativeValue` instead, which moves the value
  // and leaves the default where the form can reset back to it.
  const [seed] = useState(() => defaultValue ?? value ?? '');

  // Opt-in `Field` wiring, exactly as every other control in this package does:
  // inside a `<Field>` this picks up the id the label points at, the
  // `aria-describedby` its hint and error register into, and `aria-invalid`.
  // Without it the label pointed at an id no element carried and the combobox
  // had no accessible name at all.
  const fieldProps = useFieldControl(rest);

  useDevWarning(
    name === undefined && form !== undefined,
    'Combobox: `form` was given but `name` was not, so nothing is submitted — the carrier that holds the choice is only rendered when there is a name to submit it under.',
  );

  // WHAT THE FIELD READS when nothing has been typed: the label of the chosen
  // item. Without this bridge a seeded or controlled `value` rendered an EMPTY
  // box that submitted a key — the user saw "nothing chosen" while the form
  // carried `42`.
  const selected = items.find((item) => getKey(item) === chosen);
  const text = searching || selected === undefined ? typed : getLabel(selected);

  const shown =
    !searching || filter === false || typed === ''
      ? items
      : items.filter((item) =>
          filter ? filter(item, typed) : matches(getLabel(item), typed),
        );

  // THE CREATE ROW IS A ROW, and that is the whole design: offered as an option
  // at the end of the list, it inherits the keyboard, the highlight and the
  // announcement that already exist. A button beside the field would be a
  // second code path for every one of those (ADR-0028).
  //
  // WHEN it appears is the consumer's — `canCreate` — with a default that is
  // the case everybody means: something was typed, and no row already says it.
  const creatable =
    onCreate !== undefined &&
    typed !== '' &&
    (canCreate
      ? canCreate(typed, shown)
      : !shown.some(
          (item) =>
            getLabel(item).toLocaleLowerCase() === typed.toLocaleLowerCase(),
        ));
  // One list for the keyboard to walk: the rows, then the offer.
  const rows = creatable ? shown.length + 1 : shown.length;

  // CLAMPED AT RENDER, because `items` change from outside and nothing in here
  // hears about it. Left alone, a highlight held past the end of a shorter list
  // pointed `aria-activedescendant` at an id that did not exist (a broken IDREF,
  // WCAG 4.1.2) and made `Enter` a silent no-op — in the server-search flow the
  // docs themselves recommend.
  const highlighted = active !== null && active < rows ? active : null;

  useAnchored(anchor, surface, {
    open: showing,
    placement: 'bottom-start',
    offset: 4,
    onAnchorLost: () => setShowing(false),
  });

  // A GENUINELY STABLE `report`, through a ref — and the comment this replaces
  // was wrong, which is worth recording because it read as reasoning. It
  // claimed the React Compiler memoises `useControlled`'s setter "by
  // construction"; compiled with this build's own preset, that memo block
  // depends on the CURRENT VALUE, so the setter's identity changes on every
  // open↔close transition. `useOpenMirror` lists `report` in its deps, so it
  // re-subscribed on exactly those transitions — and its cleanup reports closed
  // on the way past while its setup re-reads a DOM the sync effect below has
  // not caught up with yet. The state was resurrected to open, the list
  // reopened, and the suite flaked roughly one cold run in five. Every other
  // consumer of these primitives memoises explicitly; this now does too.
  const latest = useRef(setShowing);
  // Written in an EFFECT and not in render: the compiler refuses a ref write
  // during render, and it is right to — this is bookkeeping, not something the
  // render depends on.
  useEffect(() => {
    latest.current = setShowing;
  }, [setShowing]);
  const report = useCallback((next: boolean) => {
    latest.current(next);
  }, []);
  useOpenMirror(surface, report);

  // And the other direction — `defaultOpen`, a controlled `open`, and this
  // component's own calls.
  //
  // NO DEPENDENCY ARRAY, deliberately. Keyed on `showing` alone, a controlled
  // parent that refuses a close left the DOM shut and the state open with
  // nothing to re-run the effect: the list could never be shown again and
  // `aria-expanded` lied for the rest of the session. Run every commit it is a
  // `matches()` call against a node we already hold, and the DOM can never stay
  // diverged for longer than one render.
  useEffect(() => {
    const node = surface.current;
    // The popover API is the floor this package declares, but not every engine
    // at that floor has it — Firefox shipped it in 125 against a stated 121 —
    // and `:popover-open` is an INVALID SELECTOR where it is missing, so
    // `matches()` throws from inside a passive effect and takes the tree with
    // it. `Tooltip` and `ToastRegion` both guard exactly this, the second with
    // the note that unguarded it "took the whole page down".
    if (!node || !('showPopover' in node)) return;
    const shownNow = node.matches(':popover-open');
    if (showing && !shownNow) node.showPopover();
    if (!showing && shownNow) node.hidePopover();
  });

  // KEEP THE HIGHLIGHT ON SCREEN. The list scrolls at nine rows, and the
  // highlight is an attribute rather than focus — so nothing scrolls it into
  // view for us, and a keyboard user walking past row nine watched a list that
  // appeared frozen. `nearest` leaves a row that is already visible alone.
  useEffect(() => {
    if (highlighted === null) return;
    document
      .getElementById(`${listId}-${String(highlighted)}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, listId]);

  // THE CHOICE ONTO THE CARRIER, through the prototype setter so a real `input`
  // event follows it. A React `value` prop would update the DOM and tell nobody:
  // a ref-based binding reads the node and would never learn the choice had
  // changed, which is the whole job the carrier exists for.
  useEffect(() => {
    const node = carrier.current;
    if (!node) return;
    // WITH FREE TEXT ON, what was typed IS the value once nothing is chosen —
    // that is the whole of the option. Off, an unmatched query submits nothing,
    // which is what makes this a chooser.
    const next = chosen ?? (freeText ? typed : '');
    if (node.value !== next) setNativeValue(node, next);
  }, [chosen, freeText, typed]);

  const editable = disabled !== true && readOnly !== true;

  const show = (next: boolean) => {
    if (!editable && next) return;
    setShowing(next);
  };

  const pick = (index: number) => {
    if (!editable) return;
    // The last row, when there is an offer, is the offer. The component reports
    // the intent and nothing else: what creating MEANS — a request, an optimistic
    // row, a dialog — is the consumer's, and guessing at it here would be a
    // second owner of their data.
    if (creatable && index === shown.length) {
      onCreate?.(typed);
      setSearching(false);
      setActive(null);
      setShowing(false);
      visible.current?.focus();
      return;
    }
    const item = shown[index];
    if (!item) return;
    setChosen(getKey(item));
    setTyped(getLabel(item));
    setSearching(false);
    setActive(null);
    setShowing(false);
    visible.current?.focus();
  };

  const move = (delta: number) => {
    if (rows === 0) return;
    setActive((current) => {
      // From nothing, a step down lands on the first row and a step up on the
      // last — which is what makes "open, then press up" reach the end. The
      // offer to create is the last row, so the same arithmetic reaches it.
      if (current === null) return delta > 0 ? 0 : rows - 1;
      const next = current + delta;
      return next < 0 ? rows - 1 : next % rows;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !editable) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!showing) {
          setShowing(true);
          setActive(null);
          return;
        }
        move(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        // ONLY A ROW THE USER MOVED TO. With nothing highlighted this key is
        // not ours: it belongs to the form, and taking it stopped people
        // submitting with the keyboard.
        if (!showing || highlighted === null) return;
        event.preventDefault();
        pick(highlighted);
        return;
      }
      case 'Escape': {
        // `Home` and `End` ARE DELIBERATELY ABSENT. They belong to the text
        // field a person is typing in — taking them moved the highlight instead
        // of the caret, which is the one thing a text box must never do.
        //
        // Stopped here either way: a `Combobox` inside a `Dialog` otherwise
        // lost its value on the same keystroke that dismissed the dialog, and
        // the user never saw it happen.
        event.stopPropagation();
        if (showing) {
          setShowing(false);
          return;
        }
        setTyped('');
        setChosen(null);
        setSearching(false);
        return;
      }
      default:
    }
  };

  return (
    <div className={styles.root}>
      <input
        {...rest}
        {...fieldProps}
        ref={mergeRefs(visible, setAnchor, ref)}
        className={cn(comboboxVariants({ size }), className)}
        type="text"
        role="combobox"
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showing && highlighted !== null ? optionId(highlighted) : undefined
        }
        value={text}
        onChange={(event) => {
          setTyped(event.target.value);
          setSearching(true);
          setActive(null);
          setShowing(true);
          // A CHOICE THE TEXT NO LONGER SAYS IS A LIE. Picked "Milano" and then
          // typed over it, the field read the new text while the carrier still
          // held the old key: the user saw one thing and the form sent another.
          // With free text on the value simply follows the text instead (see
          // the carrier below), so clearing it here is right in both modes.
          if (chosen !== null) setChosen(null);
        }}
        onClick={(event) => {
          onClick?.(event);
          // A POINTER NEEDS A WAY IN. Without this the list opened only by
          // typing or by an arrow key, so a touch or switch user facing an
          // empty field could never see the options — on the very platform the
          // centred branch in the stylesheet exists for.
          if (!event.defaultPrevented) show(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          // `relatedTarget` is `null` for a click on something unfocusable —
          // the surface's own padding, its scrollbar — and `contains(null)` is
          // false, so closing on that read every such click as "focus left
          // both". Measured: dragging the scrollbar closed the list and dumped
          // focus on `<body>` mid-drag. The platform is the authority on a
          // click inside its own popover; this only answers for focus moving to
          // another element.
          const next = event.relatedTarget;
          if (next !== null && !surface.current?.contains(next)) show(false);
        }}
      />
      {/*
        THE CARRIER — `DateInput`'s, reused rather than re-derived: a text input
        hidden by CSS, out of the tree and out of the tab order, and still
        focusable. `name` and `form` live HERE, on the node that actually
        contributes to the form; the visible field has no name and would
        associate nothing.
      */}
      {name === undefined ? null : (
        <input
          ref={mergeRefs(carrier, carrierRef)}
          data-carrier=""
          className={styles.carrier}
          type="text"
          name={name}
          form={form}
          defaultValue={seed}
          // `onChange` AND `onBlur` BELONG HERE, with the name and the value —
          // the routing `DateInput` already settled. A binding's handler reads
          // the field off the event target, and on the visible input it would
          // hear a KEYSTROKE OF THE QUERY and read a node with no name: the
          // library learned the search text and never learned the choice. The
          // query has its own report, `onQueryChange`.
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="off"
          readOnly
          // Disabled together: a disabled control is not submitted, and left
          // enabled the carrier would keep posting a value for a field the user
          // was told they cannot touch.
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onFocus={(event) => {
            visible.current?.focus();
            // If the hop failed, hold no focus at all rather than hold it here.
            if (document.activeElement === event.currentTarget) {
              event.currentTarget.blur();
            }
          }}
        />
      )}
      <div ref={surface} popover="auto" className={styles.surface}>
        <div
          id={listId}
          role="listbox"
          // NAMED, because on iOS VoiceOver `aria-activedescendant` is not
          // supported at all and touch exploration is the only way through the
          // rows — into what would otherwise be an unnamed "list box".
          aria-label={t('list')}
          className={styles.list}
        >
          {shown.map((item, index) => (
            <div
              key={getKey(item)}
              id={optionId(index)}
              role="option"
              aria-selected={getKey(item) === chosen}
              aria-setsize={rows}
              aria-posinset={index + 1}
              data-active={index === highlighted ? '' : undefined}
              className={styles.option}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(index);
              }}
              onMouseEnter={() => setActive(index)}
            >
              {renderItem ? renderItem(item) : getLabel(item)}
            </div>
          ))}
          {/* THE OFFER IS AN OPTION, and lives inside the listbox with the
              rest: that is what gives it the arrows, the highlight and the
              announcement without a line of its own. Outside, it would be
              content a `listbox` may not own AND a target only a pointer could
              reach. */}
          {creatable ? (
            <div
              id={optionId(shown.length)}
              role="option"
              aria-selected={false}
              aria-setsize={rows}
              aria-posinset={rows}
              data-active={highlighted === shown.length ? '' : undefined}
              data-create=""
              className={styles.option}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(shown.length);
              }}
              onMouseEnter={() => setActive(shown.length)}
            >
              {t('create', { query: typed })}
            </div>
          ) : null}
        </div>
        {/* OUTSIDE the listbox: ARIA 1.2 lets a `listbox` own `option` and
            `group` and nothing else, so a message inside it was invalid — and
            unreachable anyway, since focus never enters the list. */}
        {rows === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
      </div>
      {/*
        The count, for a change nobody can see. It carries the QUERY as well,
        and that is not decoration: two different searches that both leave one
        row produced a byte-identical string, React committed no mutation, and
        the region said nothing at all.
      */}
      <div role="status" aria-live="polite" className={styles.status}>
        {showing && searching
          ? t('results', { count: shown.length, query: typed })
          : ''}
      </div>
    </div>
  );
}

export { Combobox };

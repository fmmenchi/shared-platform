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
import { useCarrierSync } from '../../primitives/use-carrier-sync.js';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { useFieldControl } from '../field/field.context.js';
import { useMessages } from '../../i18n/provider.js';
import { comboboxVariants } from './combobox.variants.js';
import { comboboxMessages } from './combobox.messages.js';
import { matches, says } from './combobox.filter.js';
import type { ComboboxProps } from './combobox.types.js';
import styles from './combobox.module.css';

/**
 * WHERE THE HIGHLIGHT IS — a row of the filtered list, or the offer to create.
 *
 * A union rather than an index, and that is a fix rather than taste. Identified
 * as "the last position", the offer was whatever sat at `shown.length` WHEN THE
 * KEY WAS PRESSED: in the server-search flow the docs recommend, a response
 * landing between the arrow and the `Enter` grew the list, and the position the
 * user had highlighted was by then a real city they had never seen. Named, it
 * cannot be mistaken for a row no matter what the list does underneath.
 */
type Spot = number | 'create';

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
 * field — a text input hidden by CSS, out of the accessibility tree and out of
 * the tab order, and still FOCUSABLE, because react-hook-form reads `.value` off
 * the node its ref was given and `FormErrorSummary` finds a field by `name` and
 * focuses it. Not a `type="hidden"`: a hidden input is in value mode "default",
 * so `form.reset()` restores its current value onto itself and the field comes
 * back from a reset still holding the old choice.
 *
 * AND THE CARRIER IS TWO-WAY, which the first version got wrong in a way worth
 * recording, because the markup was right and the machinery was missing. Copied
 * attribute for attribute from `DateInput` and pushed to but never read from, a
 * `defaultValues: { city: '2' }` was WIPED ON MOUNT — react-hook-form assigns the
 * node in the commit phase, the component's push ran after it and wrote `''` over
 * the top — and `form.reset()` moved the DOM while the box went on showing the
 * choice that had just been discarded. `useCarrierSync` is the three doors a
 * write can arrive through, extracted from `DateInput` where they were measured.
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
 * destructive direction of the mistake ADR-0028 §6 refuses free text over. The
 * pointer is held to the same rule: hovering a row PAINTS it and does not arm
 * `Enter`, so reading the list with the mouse and submitting with the keyboard
 * cannot commit the row the cursor happens to rest on.
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
  const optionId = (spot: Spot) =>
    `${listId}-${spot === 'create' ? 'create' : String(spot)}`;
  const [anchor, setAnchor] = useState<HTMLInputElement | null>(null);
  const [carrier, setCarrier] = useState<HTMLInputElement | null>(null);
  const visible = useRef<HTMLInputElement>(null);
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
  const [active, setActive] = useState<Spot | null>(null);
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
  const [createdNothing, setCreatedNothing] = useState(false);
  // A ONE-SHOT LINE FOR THE LIVE REGION, held until the next keystroke. Only
  // the offer needs one — see the note in the catalogue.
  const [announced, setAnnounced] = useState('');

  // Opt-in `Field` wiring, exactly as every other control in this package does:
  // inside a `<Field>` this picks up the id the label points at, the
  // `aria-describedby` its hint and error register into, and `aria-invalid`.
  // Without it the label pointed at an id no element carried and the combobox
  // had no accessible name at all.
  const fieldProps = useFieldControl(rest);

  useDevWarning(
    name === undefined && (form !== undefined || carrierRef !== undefined),
    'Combobox: `form` or `carrierRef` was given but `name` was not, so the carrier that holds the choice is never rendered — nothing is submitted and the ref is never called.',
  );
  useDevWarning(
    name === undefined && (onChange !== undefined || onBlur !== undefined),
    'Combobox: `onChange`/`onBlur` belong to the carrier, which is only rendered when there is a `name` to submit under — so neither will ever fire. What the user TYPES is reported by `onQueryChange`, and what they CHOOSE by `onValueChange`.',
  );
  useDevWarning(
    createdNothing,
    'Combobox: `onCreate` returned nothing, so the field shows the new text while the form holds no value for it. Return the new key from `onCreate` to adopt it, control `value` and set it yourself, or turn on `freeText` so the text itself is the value.',
  );

  // WHAT THE FIELD READS when nothing has been typed: the label of the chosen
  // item. Without this bridge a seeded or controlled `value` rendered an EMPTY
  // box that submitted a key — the user saw "nothing chosen" while the form
  // carried `42`. It is also why a controlled `query` does not always reach the
  // box: once something is chosen and the user is not searching, the LABEL is
  // what the field says. A parent driving a server search off `query` reads its
  // own state; the box shows the choice.
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
  // "NO RECORD ALREADY SAYS THIS" IS NOT NEGOTIABLE, and `canCreate` REFINES it
  // rather than replacing it — the correction of a real defect, not a change of
  // taste. Replacing, the documented example (`(query) => query.length >= 5`)
  // offered `Create “Torino”` in a list where Torino was two rows above and
  // marked as selected, because a consumer adding a length rule cannot be
  // expected to re-implement a duplicate check they were never told they had
  // taken over.
  //
  // ASKED OF `items` AND NOT OF `shown`, which is the other half of the same
  // defect: a query the filter rejects leaves an empty list, and a check against
  // an empty list passes trivially. `Milano ` with a trailing space showed
  // nothing but the offer to create it.
  const creatable =
    onCreate !== undefined &&
    typed.trim() !== '' &&
    !items.some((item) => says(getLabel(item), typed)) &&
    (canCreate ? canCreate(typed, shown) : true);
  // One list for the keyboard to walk: the rows, then the offer.
  const rows = creatable ? shown.length + 1 : shown.length;

  // CLAMPED AT RENDER, because `items` change from outside and nothing in here
  // hears about it. Left alone, a highlight held past the end of a shorter list
  // pointed `aria-activedescendant` at an id that did not exist (a broken IDREF,
  // WCAG 4.1.2) and made `Enter` a silent no-op — in the server-search flow the
  // docs themselves recommend.
  const highlighted: Spot | null =
    active === 'create'
      ? creatable
        ? 'create'
        : null
      : active !== null && active < shown.length
        ? active
        : null;

  // A GENUINELY STABLE `report`, through a ref — and the comment this replaces
  // was wrong, which is worth recording because it read as reasoning. It
  // claimed the React Compiler memoises `useControlled`'s setter "by
  // construction"; compiled with this build's own preset, that memo block
  // depends on the CURRENT VALUE, so the setter's identity changes on every
  // open↔close transition. `useOpenMirror` lists `report` in its deps, so it
  // re-subscribed on exactly those transitions — and its cleanup reports closed
  // on the way past while its setup re-reads a DOM the sync effect below has
  // not caught up with yet. The state was resurrected to open, the list
  // reopened, and the suite flaked roughly one cold run in five.
  const latest = useRef(setShowing);
  // Written in an EFFECT and not in render: the compiler refuses a ref write
  // during render, and it is right to — this is bookkeeping, not something the
  // render depends on.
  useEffect(() => {
    latest.current = setShowing;
  }, [setShowing]);
  // WHAT WE LAST TOLD THE PLATFORM. `useOpenMirror`'s contract is that nothing
  // using it commands the surface, and this component breaks that contract on
  // purpose: it both commands and listens, because the list has no declarative
  // trigger and is opened by typing. The cost of breaking it is an echo — our
  // own `hidePopover()` comes back as a `toggle`, so `onOpenChange(false)` fired
  // TWICE on every close and a spurious `onOpenChange(true)` fired at mount for
  // a `defaultOpen` nobody had requested. Reporting only what we did not ask for
  // leaves the platform's own dismissals — Esc, a click outside, another popover
  // taking the top layer — reported exactly once.
  const commanded = useRef(defaultOpen);
  const report = useCallback((next: boolean) => {
    if (commanded.current === next) return;
    latest.current(next);
  }, []);
  useOpenMirror(surface, report);

  // MEMOISED like every other consumer of this primitive, and for the reason
  // the mirror above documents: `useAnchored` lists this in its effect deps, and
  // an inline arrow closing over an unstable setter re-subscribed on every
  // open↔close. Its cleanup removes `--anchored-x/y`, and the re-measure is a
  // promise — so the open list fell back to the stylesheet's off-screen default
  // and flicked back, and `autoUpdate` was torn down and rebuilt each time.
  const dismiss = useCallback(() => {
    latest.current(false);
  }, []);
  useAnchored(anchor, surface, {
    open: showing,
    placement: 'bottom-start',
    offset: 4,
    onAnchorLost: dismiss,
  });

  // And the other direction — `defaultOpen`, a controlled `open`, and this
  // component's own calls.
  //
  // NO DEPENDENCY ARRAY, deliberately, though not for the reason first given
  // here: a controlled parent that refuses a close produces no commit at all, so
  // nothing re-runs this either way and the earlier justification was simply
  // wrong. What running every commit DOES buy is the case that does commit for
  // another reason — a keystroke, an `items` change, a re-render from above —
  // after which the DOM and the state agree again. It is a `matches()` call
  // against a node already in hand.
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
    commanded.current = showing;
    if (showing && !shownNow) node.showPopover();
    if (!showing && shownNow) node.hidePopover();
  });

  // KEEP THE HIGHLIGHT ON SCREEN. The list scrolls at nine rows, and the
  // highlight is an attribute rather than focus — so nothing scrolls it into
  // view for us, and a keyboard user walking past row nine watched a list that
  // appeared frozen. `nearest` leaves a row that is already visible alone.
  const highlightId = highlighted === null ? null : optionId(highlighted);
  useEffect(() => {
    if (highlightId === null) return;
    document.getElementById(highlightId)?.scrollIntoView({ block: 'nearest' });
  }, [highlightId]);

  // THE CHOICE ONTO THE CARRIER, through the prototype setter so a real `input`
  // event follows it. A React `value` prop would update the DOM and tell nobody:
  // a ref-based binding reads the node and would never learn the choice had
  // changed, which is the whole job the carrier exists for.
  //
  // WITH FREE TEXT ON, what was typed IS the value once nothing is chosen — that
  // is the whole of the option, and it means the carrier's `onChange` fires per
  // KEYSTROKE in that mode. Off, an unmatched query submits nothing, which is
  // what makes this a chooser.
  const carried = chosen ?? (freeText ? typed : '');
  // WHAT WE LAST SAID, in a ref rather than in a closure — and the suite is what
  // proved it has to be. `setNativeValue` dispatches its `input` event
  // SYNCHRONOUSLY, so the listener below runs inside this effect, while the
  // effect that refreshes a closure has not run yet: read there, the guard
  // compared the new value against the PREVIOUS render's, called the component's
  // own write an external one, and emptied the field. Typing over a choice
  // cleared the box instead of keeping the text.
  //
  // It is also what keeps this effect from fighting a write that landed before
  // the component was listening: at mount `carried` and `pushed` agree, so
  // nothing is written over react-hook-form's `defaultValues`, and the adoption
  // below is free to follow it instead.
  const pushed = useRef(seed);
  useEffect(() => {
    if (carrier === null) return;
    if (carried === pushed.current) return;
    pushed.current = carried;
    if (carrier.value !== carried) setNativeValue(carrier, carried);
  }, [carrier, carried]);

  // AND THE OTHER DIRECTION. Everything that writes this node from outside —
  // `defaultValues` in the commit phase, `setValue`, a controlled adapter's bare
  // assignment, `form.reset()` — arrives here, and the component follows it
  // instead of overwriting it on the next commit.
  useCarrierSync(carrier, (incoming) => {
    // OUR OWN WRITE, ECHOED BACK. `setNativeValue` dispatches a real `input`
    // event, which is the point of it; without this guard that event would be
    // read as an external write on every keystroke in free-text mode. Asked of
    // the ref and not of `carried` — see the note above it.
    if (incoming === pushed.current) return;
    pushed.current = incoming;
    const match = items.find((item) => getKey(item) === incoming);
    setSearching(false);
    if (match !== undefined) {
      setChosen(incoming);
      setTyped(getLabel(match));
      return;
    }
    if (incoming === '') {
      setChosen(null);
      setTyped('');
      return;
    }
    if (freeText) {
      setChosen(null);
      setTyped(incoming);
      return;
    }
    // A KEY WITH NO ROW YET. The value is real — the form holds it — so it is
    // kept and the box stays empty until `items` catch up, which is exactly
    // what an async list does. Dropping it here would silently disagree with
    // the form the moment a binding seeded a key the first page had not loaded.
    setChosen(incoming);
    setTyped('');
  });

  const editable = disabled !== true && readOnly !== true;

  const show = (next: boolean) => {
    if (!editable && next) return;
    setShowing(next);
  };

  const close = () => {
    setSearching(false);
    setActive(null);
    setShowing(false);
    visible.current?.focus();
  };

  const pick = (spot: Spot) => {
    if (!editable) return;
    if (spot === 'create') {
      // WHAT CREATING MEANS is the consumer's — a request, an optimistic row, a
      // dialog — and guessing at it here would be a second owner of their data.
      // What the CONTROL owes is that the field and the form agree afterwards,
      // and the first version broke exactly that: it reported the intent and
      // left `chosen` null, so the box read "Bologna" over a form submitting an
      // empty string. Returning the new key is how a consumer closes that in
      // one line; free text closes it by making the text the value; a
      // controlled `value` closes it from above. Nothing at all is a warning.
      const created = onCreate?.(typed);
      if (typeof created === 'string') {
        setChosen(created);
        // The row for it may not exist yet, so the query stays as the label
        // until `items` catch up — at which point the bridge above takes over.
        setTyped(typed);
      } else if (!freeText && value === undefined) {
        setCreatedNothing(true);
      }
      setAnnounced(t('created', { query: typed }));
      close();
      return;
    }
    const item = shown[spot];
    if (!item) return;
    setChosen(getKey(item));
    setTyped(getLabel(item));
    close();
  };

  const move = (delta: number) => {
    if (rows === 0) return;
    setActive((current) => {
      // FROM THE CLAMPED POSITION, not the raw one. The render clamps a stale
      // highlight to nothing, but this used to read the state: with `active` at
      // 7 and the list down to 3 rows, `aria-activedescendant` correctly
      // disappeared and `ArrowDown` then computed `8 % 3` and landed on the
      // THIRD row — the same "commit a row you never looked at" the manual
      // selection rule exists to prevent, through the other door.
      const from =
        current === 'create'
          ? creatable
            ? shown.length
            : null
          : current !== null && current < shown.length
            ? current
            : null;
      // From nothing, a step down lands on the first row and a step up on the
      // last — which is what makes "open, then press up" reach the end. The
      // offer to create is the last row, so the same arithmetic reaches it.
      const next =
        from === null
          ? delta > 0
            ? 0
            : rows - 1
          : from + delta < 0
            ? rows - 1
            : (from + delta) % rows;
      return creatable && next === shown.length ? 'create' : next;
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
        // STOPPED ONLY WHEN THERE IS SOMETHING TO PROTECT. A `Combobox` inside a
        // `Dialog` otherwise lost its value on the same keystroke that dismissed
        // the dialog — but stopping it unconditionally was the opposite defect:
        // an untouched combobox with the focus swallowed every Escape and the
        // dialog could not be dismissed at all.
        if (showing) {
          event.stopPropagation();
          setShowing(false);
          return;
        }
        if (typed === '' && chosen === null) return;
        event.stopPropagation();
        setTyped('');
        setChosen(null);
        setSearching(false);
        return;
      }
      default:
    }
  };

  return (
    // NO WRAPPER ELEMENT. It was a `<div style="display: contents">`, which is
    // transparent to LAYOUT and not to SELECTORS — so inside an `InputGroup` the
    // field was not `.group > input`, none of the group's resets reached it, and
    // the result was a second bordered box inside the group's own while the
    // group never rang, never showed invalid and never showed disabled. A
    // fragment is transparent to both.
    <>
      <input
        // BEFORE the spreads, so a consumer can still say otherwise. A token is
        // a claim about what the field holds, and WCAG 1.3.5 (Identify Input
        // Purpose) is unsatisfiable without one — a city or country combobox
        // being the canonical case. Hard-coded after the spread, as it shipped,
        // `autocomplete="country-name"` compiled, typechecked and did nothing.
        autoComplete="off"
        {...rest}
        {...fieldProps}
        ref={mergeRefs(visible, setAnchor, ref)}
        className={cn(comboboxVariants({ size }), className)}
        type="text"
        role="combobox"
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
          setAnnounced('');
          // A CHOICE THE TEXT NO LONGER SAYS IS A LIE. Picked "Milano" and then
          // typed over it, the field read the new text while the carrier still
          // held the old key: the user saw one thing and the form sent another.
          // With free text on the value simply follows the text instead (see
          // the carrier below), so clearing it here is right in both modes.
          //
          // CONTROLLED, this can only ASK: `useControlled` calls back and the
          // parent decides. A parent that only ever sets a valid key keeps the
          // stale one, and the divergence is theirs to close.
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
        THE CARRIER — `DateInput`'s, and now its machinery too (see the header).
        `name` and `form` live HERE, on the node that actually contributes to the
        form; the visible field has no name and would associate nothing.
      */}
      {name === undefined ? null : (
        <input
          ref={mergeRefs(setCarrier, carrierRef)}
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
                // The field keeps the focus: without this the mousedown blurred
                // it, and `aria-activedescendant` on a field nobody is in
                // points at nothing.
                event.preventDefault();
                pick(index);
              }}
            >
              {renderItem ? renderItem(item) : getLabel(item)}
            </div>
          ))}
          {/* THE OFFER IS AN OPTION, and lives inside the listbox with the
              rest: that is what gives it the arrows, the highlight and the
              announcement without a line of its own. Outside, it would be
              content a `listbox` may not own AND a target only a pointer could
              reach. It is a COMMAND wearing an option's role, which the docs
              say plainly — every mainstream library makes the same trade, and
              the compensation owed for it is that activating it announces
              what happened. */}
          {creatable ? (
            <div
              id={optionId('create')}
              role="option"
              aria-selected={false}
              aria-setsize={rows}
              aria-posinset={rows}
              data-active={highlighted === 'create' ? '' : undefined}
              data-create=""
              className={styles.option}
              onMouseDown={(event) => {
                event.preventDefault();
                pick('create');
              }}
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

        COUNTING `rows`, WHICH INCLUDES THE OFFER — the same number
        `aria-setsize` gives, because they are the same list. Counting `shown`
        instead, the two contradicted each other out loud: with a brand-new
        value typed, every row announced "1 of 1" while the region said "0
        results", so the one action available was described as nothing to do.
      */}
      <div role="status" aria-live="polite" className={styles.status}>
        {announced !== ''
          ? announced
          : showing && searching
            ? t('results', { count: rows, query: typed })
            : ''}
      </div>
    </>
  );
}

export { Combobox };

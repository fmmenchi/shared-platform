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
import { useOptionBinding } from '../../form/option-binding.context.js';
import { comboboxVariants } from './combobox.variants.js';
import { comboboxMessages } from './combobox.messages.js';
import { matches, says } from './combobox.filter.js';
import type { ComboboxProps } from './combobox.types.js';
import { Tag } from '../tag/tag.component.js';
import { TagList } from '../tag-list/tag-list.component.js';
import styles from './combobox.module.css';

/** The empty selection, shared so an uncontrolled default never changes identity. */
const NO_KEYS: readonly string[] = Object.freeze([]);

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
    multiple = false,
    value,
    defaultValue,
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
  // THE FIELD'S BINDING, when a bound wrapper is providing one. Null everywhere
  // else, exactly like `SegmentedControlItem`'s — outside a wrapper the
  // carriers are drawn by this component as they always were.
  const optionBinding = useOptionBinding();
  const listId = useId();
  const optionId = (spot: Spot) =>
    `${listId}-${spot === 'create' ? 'create' : String(spot)}`;
  const [anchor, setAnchor] = useState<HTMLInputElement | null>(null);
  const [carrier, setCarrier] = useState<HTMLInputElement | null>(null);
  const visible = useRef<HTMLInputElement>(null);
  const surface = useRef<HTMLDivElement>(null);

  // THE TWO VALUE SHAPES, split once here so nothing below asks twice. The
  // props are a discriminated union and `multiple` is what discriminates them;
  // these casts are that fact restated where a destructure has already lost it.
  const many = multiple === true;
  const oneValue = many ? undefined : (value as string | null | undefined);
  const oneDefault = many
    ? null
    : ((defaultValue as string | null | undefined) ?? null);
  const manyValue = many ? (value as readonly string[] | undefined) : undefined;
  // WHAT THE BINDING ALREADY HOLDS, read once at mount. A bound field's starting
  // value is the form library's, not the call site's — and the option port
  // answers it the only way it can, per value: `option(key).checked`. Without
  // this the library held two keys while the control showed none, which is the
  // divergence the whole carrier arrangement exists to prevent.
  //
  // ONE PASS OVER `items`, at mount, and only when bound: the same list this
  // component already walks to filter on every keystroke.
  //
  // TWO LIMITS, both of them the port's rather than this component's, and both
  // worth knowing before relying on the seed. The order is `items`' order, not
  // the order the form holds the keys in — `option(value)` answers per value
  // and cannot be asked for an order. And the answer is read ONCE: items that
  // arrive later (a server search, a lazy list) are not re-asked, so a field
  // seeded from a list that was empty at mount stays empty. Pass the selection
  // yourself where either matters.
  const [seededByBinding] = useState<readonly string[] | undefined>(() => {
    if (!many || optionBinding === null) return undefined;
    // THE BINDING'S OWN ANSWER FIRST. It is the only one that can be right for
    // a key whose row has not been fetched, it needs no pass over `items`, and
    // it is the only one a ref-based library can give at all — its option bag
    // carries no `checked`.
    if (optionBinding.values !== undefined) return optionBinding.values;
    return items
      .filter((item) => {
        // BOTH ANSWERS, because the port allows both: a controlled adapter
        // says `checked` and an uncontrolled one says `defaultChecked`. Asking
        // only the first left three of the five with an empty seed — and an
        // empty seed is worse than none, because the reader's first pick then
        // hands `setValues` a list that does not contain the keys the form was
        // already holding, and they are gone.
        const answer = optionBinding.option(getKey(item));
        return answer.checked === true || answer.defaultChecked === true;
      })
      .map(getKey);
  });
  const manyDefault = many
    ? ((defaultValue as readonly string[] | undefined) ??
      seededByBinding ??
      NO_KEYS)
    : NO_KEYS;

  const [chosen, setChosen] = useControlled<string | null>({
    value: oneValue,
    defaultValue: oneDefault,
    onChange: many
      ? undefined
      : (onValueChange as ((next: string | null) => void) | undefined),
    name: 'Combobox',
  });
  // SEVERAL OF MANY, as an ordered list of keys. Both selections are declared
  // whatever the mode: a hook cannot be conditional, and the one that is not in
  // play is seeded empty and never written.
  const [picked, setPicked] = useControlled<readonly string[]>({
    value: manyValue,
    defaultValue: manyDefault,
    onChange: many
      ? (onValueChange as ((next: readonly string[]) => void) | undefined)
      : undefined,
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
  const [seed] = useState(() => oneDefault ?? oneValue ?? '');
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
  // IN MULTIPLE MODE THE BOX IS ALWAYS THE QUERY. There is no one label to show
  // — a chosen key is drawn as a tag under the field, and writing the last pick
  // into the box would make the next search start from somebody else's word.
  const text = many
    ? typed
    : searching || selected === undefined
      ? typed
      : getLabel(selected);

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

  /**
   * THE ONE PLACE THE SELECTION MOVES, so the binding is never told half of a
   * change. A carrier that unmounts sends no event of its own — that is the
   * whole reason `setValues` exists on the port — so the list is handed over
   * whole, in the order it is drawn in.
   */
  const choose = (next: readonly string[]) => {
    setPicked(next);
    optionBinding?.setValues?.(next);
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
      if (typeof created === 'string' && many) {
        // ADDED TO THE SET, and the query clears the way a pick does: the next
        // thing typed is a new search, not an edit of the last creation.
        choose(picked.includes(created) ? picked : [...picked, created]);
        setTyped('');
        setAnnounced(t('created', { query: typed }));
        return;
      }
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
    if (many) {
      // A TOGGLE, and the list STAYS OPEN. Picking several things out of one
      // list means picking them one after another, and a list that closed on
      // every pick would have to be reopened between each — which is also why
      // the row keeps `aria-selected` rather than disappearing.
      const key = getKey(item);
      choose(
        picked.includes(key)
          ? picked.filter((held) => held !== key)
          : [...picked, key],
      );
      // The query goes, so the next keystroke searches the whole list again
      // rather than the one word already spent.
      setTyped('');
      return;
    }
    setChosen(getKey(item));
    setTyped(getLabel(item));
    close();
  };

  /** Take one key out of the selection — what a tag's ✕ does. */
  const drop = (key: string) => {
    choose(picked.filter((held) => held !== key));
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
        // THE PLATFORM'S OWN STATE, not our mirror of it — the package's first
        // rule about facts. A mirror can go stale; `:popover-open` cannot.
        const open = surface.current?.matches(':popover-open') ?? showing;
        if (open) {
          event.stopPropagation();
          setShowing(false);
          return;
        }
        // ESCAPE NEVER TAKES A SET AWAY, and that is a decision rather than a
        // gap. On one value it clears the field, which is what Escape does to a
        // text box and is one pick to redo. A set is not a text box: six
        // choices made one at a time would go on a keystroke people press to
        // dismiss things, with nothing to undo it. The tags are how a set is
        // emptied — one ✕ at a time, each of them reversible by picking again.
        //
        // It is also what a measurement asked for. Against the BUILT package —
        // the ports suite is the only thing that consumes `dist` — three picks
        // then one Escape came back with nothing chosen, because this branch
        // ran when the list was in fact open. Reading the platform above closes
        // that door; not clearing a set closes the corridor.
        if (many) return;
        if (typed === '' && chosen === null) return;
        event.stopPropagation();
        setTyped('');
        setChosen(null);
        setSearching(false);
        return;
      }
      case 'Backspace': {
        // THE LAST TAG, and only from an EMPTY box. Backspace belongs to the
        // text a person is typing; taking it while there is any would delete a
        // choice instead of a character, which is the same rule `Home` and
        // `End` are refused under two cases up. Every combobox with chips does
        // this, and it is the only way to undo the last pick without a pointer.
        if (!many || typed !== '' || picked.length === 0) return;
        event.preventDefault();
        drop(picked[picked.length - 1] as string);
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
      {/*
        THE CHOICES, AS TAGS — ABOVE the field, and outside it rather than
        inside, both for structural reasons rather than taste.

        ABOVE, because the list opens BELOW the field it is anchored to: drawn
        underneath, the tags sat behind the open surface and a pointer could not
        reach a single ✕ while the list was up. Measured — the test for it timed
        out on an element the browser reported as never stable, which is what
        "covered" looks like from outside.

        OUTSIDE, because this component renders no wrapper on
        purpose (see below): a box around the tags and the input
        would put an element between `InputGroup` and its `.group > input`, and
        the group would stop resetting the field, stop ringing on focus and stop
        showing invalid — the exact defect the fragment exists to avoid. Inside
        the box is where this belongs the day the group can express it.

        `TagList` OWNS THE FOCUS a removal destroys: take out the third of six
        and the focus lands on the one that took its place rather than on
        `<body>`, which is the whole reason that component exists.

        The label is the item's, and falls back to the KEY when no row carries
        it — a selection can hold a key whose row has not been fetched, and a
        tag that drew nothing would be a value the reader cannot see or remove.
      */}
      {many && picked.length > 0 ? (
        <TagList label={t('chosen')} className={styles.tags}>
          {picked.map((key) => {
            const item = items.find((candidate) => getKey(candidate) === key);
            const label = item === undefined ? key : getLabel(item);
            return (
              <Tag
                key={key}
                name={label}
                onRemove={() => {
                  drop(key);
                  // The box keeps the focus: removing a choice is not leaving
                  // the control, and the reader is most likely to type next.
                  visible.current?.focus();
                }}
              >
                {label}
              </Tag>
            );
          })}
        </TagList>
      ) : null}
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
      {/*
        THE CARRIERS OF A SET — one per chosen key, which is the only way a list
        is encoded natively: `FormData.getAll(name)` reads them in document
        order, and this component draws them in the order the choices were made.

        CHECKBOXES, sr-only, never reachable: a `type="hidden"` is in value mode
        "default", so `form.reset()` restores it onto itself and the field comes
        back holding what it held before — the same reason the single carrier is
        a real control.
        
        THEY DRAW THE VALUE AND DO NOT REPORT IT. A library that keeps a store
        is told the whole list through the port's `setValues` (see `choose`),
        because a carrier that unmounts sends nothing at all. When a binding is
        in scope its bag is spread — that is what gives a ref-based library its
        `ref` and Conform its own props — and when there is none, the DOM owns
        the state and `defaultChecked` says so.
      */}
      {many && (name !== undefined || optionBinding !== null)
        ? picked.map((key) => (
            <input
              key={key}
              // The binding's own props first — its `name`, its `ref`, its
              // `onChange`. A ref-based library registers the node through
              // this, and a controlled one hears changes through it.
              {...(optionBinding === null
                ? { name, value: key }
                : optionBinding.option(key))}
              // AND OURS AFTER IT, because these three are not the binding's to
              // decide and it measurably gets two of them wrong:
              //
              // `type`, because an adapter answers it from the field TYPE a
              // consumer declared — Conform emits `radio` for anything not
              // declared `checkbox-group`, and a set of radios is mutually
              // exclusive: picking the second key would silently drop the
              // first.
              //
              // `checked`, because THE CARRIER'S EXISTENCE IS THE VALUE. Three
              // of the five ports answer neither `checked` nor `defaultChecked`
              // (react-hook-form's `register` bag carries no such thing), so
              // taken from the bag the box mounts OFF and the form submits
              // nothing at all. Where a store disagrees for a frame it is the
              // store that is behind: `choose` has already told it the whole
              // list.
              //
              // `readOnly`, so React does not warn about a checked box whose
              // bag brought no `onChange` — nobody can reach these anyway.
              type="checkbox"
              value={key}
              checked
              readOnly
              className={styles.carrier}
              tabIndex={-1}
              aria-hidden="true"
              form={form}
            />
          ))
        : null}
      {name === undefined || many ? null : (
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
          // SAID ON THE LISTBOX, which is where ARIA 1.2 puts it: a reader is
          // told the list takes several BEFORE walking it, rather than
          // inferring it from a row that stayed selected.
          aria-multiselectable={many ? true : undefined}
          // NAMED, because on iOS VoiceOver `aria-activedescendant` is not
          // supported at all and touch exploration is the only way through the
          // rows — into what would otherwise be an unnamed "list box".
          aria-label={t('list')}
          className={styles.list}
        >
          {/*
            THE ROWS EXIST ONLY WHILE THE LIST IS OPEN, and the LISTBOX ITSELF
            ALWAYS DOES. The split is the whole point: `aria-controls` on the
            field names `listId`, so removing the element would leave every
            combobox on a page pointing at an id that resolves to nothing —
            the defect `TabPanel` stays mounted to avoid, in the same words.
            The element is cheap; its rows are not.

            WHY IT IS WORTH A CONDITION. The surface is a `popover`, so the
            platform was already hiding these rows — but hidden is not absent,
            and the cost is paid at render and in bytes whatever the popover
            does with them afterwards. Measured on the theme builder's step
            three, which puts 168 of these on one page at 133 options each: the
            server-rendered HTML went from 2.0MB with a native `<select>` to
            9.8MB, for 22,344 rows that no one had opened.

            NOTHING DERIVED MOVES. `shown` and `rows` are still computed from
            the items every render, so the live region still counts what a
            search found, `aria-setsize` is still the whole list, and the empty
            message still knows it is empty. Only the DOM waits.
          */}
          {showing ? (
            <>
              {shown.map((item, index) => (
                <div
                  key={getKey(item)}
                  id={optionId(index)}
                  role="option"
                  aria-selected={
                    many
                      ? picked.includes(getKey(item))
                      : getKey(item) === chosen
                  }
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
            </>
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

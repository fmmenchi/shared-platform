import { useEffect, useRef } from 'react';
import { setNativeValue } from '../primitives/set-native-value.js';
import type {
  CarrierField,
  CarrierFieldOptions,
} from './use-carrier-field.types.js';

/**
 * THE CARRIER AND ITS THREE DOORS — a masked field's other half.
 *
 * A field that shows one thing and stores another has two nodes: the one the
 * user types into, and a named one beside it holding the canonical value, which
 * is what a form posts and what a form library binds to. Keeping them in step
 * is easy in the direction the user drives; the hard direction is everything
 * ELSE that writes the carrier without asking this component, and there are
 * exactly three ways that happens.
 *
 * All of it is here rather than in a component, because ADR-0027 says so: the
 * date family paid for this in defects, and a second copy would pay again.
 * `DateInput` and `TimeInput` differ in what a value MEANS — which is the whole
 * of `CarrierFieldOptions` — and in nothing else.
 */
export function useCarrierField<Value>(
  options: CarrierFieldOptions<Value>,
): CarrierField {
  const { label, seed, display } = options;

  const carrier = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const shown = useRef('');

  // THE LATEST OF EVERYTHING THE DOORS NEED, reachable from listeners that were
  // installed once.
  //
  // They are torn down only on a locale change, so a callback captured when
  // they were built would go stale the first time the consumer re-rendered —
  // and the consumer here is usually a picker holding the value in state, which
  // is exactly the thing that must not fall behind. Synced in an effect rather
  // than in render, because writing a ref during render is what the compiler
  // refuses and what tears under Strict Mode's double invocation.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  // Raised while this component writes its OWN carrier, so the doors below can
  // tell that write from an external one. They are indistinguishable at the
  // event level — both go through the prototype setter and dispatch `input` —
  // and the difference matters for exactly one case: an empty value. From
  // outside it means the value was CLEARED and the box must follow; from here
  // it means the digits under the caret do not name one yet, and wiping them
  // would delete what the user is in the middle of typing. Measured: without
  // this, one Backspace emptied the whole field.
  const writingOwn = useRef(false);
  const write = (iso: string) => {
    const element = carrier.current;
    if (element === null || element.value === iso) return;
    writingOwn.current = true;
    const wrote = setNativeValue(element, iso);
    writingOwn.current = false;
    if (!wrote && process.env.NODE_ENV !== 'production') {
      console.warn(
        `${label}: this environment has no \`value\` setter on HTMLInputElement.prototype, so the field cannot tell a form library what was typed.`,
      );
    }
  };

  // RE-DISPLAY WHEN THE LOCALE MOVES. React does not re-apply `defaultValue` to
  // a field the user has touched, so a live language switch — which ADR-0027
  // makes the supported way to re-locale a subtree — left `01/02/2000` on
  // screen under a `mm/dd/yyyy` hint, meaning one day to the reader and another
  // to the carrier, until the next keystroke silently swapped them.
  useEffect(() => {
    const element = field.current;
    if (element === null) return;
    const iso = carrier.current?.value ?? '';
    // A HALF-TYPED VALUE IS CLEARED rather than left behind. The carrier is
    // empty until the value is whole, so an early return here left `١٢/٠٨/` on
    // screen in the OLD locale's numerals — which the new locale's reader then
    // scores as no digits at all, so the next keystroke wiped everything typed.
    // There is nothing to redraw it from, and text in a numbering system the
    // field no longer speaks is worse than an empty field.
    if (iso === '') {
      if (element.value !== '' && shown.current !== '') {
        element.value = '';
        shown.current = '';
      }
      return;
    }
    element.value = display(iso);
    shown.current = element.value;
  }, [display]);

  // WHAT AN EXTERNAL WRITE OWES THE CONSUMER. The component's own keystroke
  // path reports for itself; these three doors did not report at all, so a
  // `DatePicker`'s grid — and any consumer holding the value in state — sat on
  // a value the field no longer held.
  //
  // AND ONLY WHEN IT ACTUALLY MOVED. A reset fires on every control in the
  // form, touched or not, so an untouched field announced the value it already
  // held — measured, an untouched seeded field reported `{1985,3,12}` on every
  // click of a reset button, and a `DatePicker` turned each one into a
  // `setPicked`, a `setMonth` and a call to the consumer. The keystroke path
  // keeps its own per-keystroke reporting and records what it said here, so the
  // two cannot disagree about what the consumer was last told.
  /**
   * TEXT THAT NAMES NOTHING IS AN INVALID CONTROL, and the platform is told so
   * rather than left to guess from an input that looks full.
   *
   * Cleared the moment the value is whole again, so a field is never left
   * refusing a submit it should allow.
   */
  const saySo = (text: string, iso: string) => {
    const target = field.current;
    if (target === null) return;
    target.setCustomValidity(
      text !== '' && iso === '' ? latest.current.incomplete : '',
    );
  };

  const reported = useRef(seed);
  const announce = (iso: string) => {
    if (iso === reported.current) return;
    reported.current = iso;
    latest.current.onValueChange?.(latest.current.parse(iso));
  };

  // WHAT EVERY EXTERNAL WRITE DOES, in one place, because the three doors below
  // differ only in how they are told.
  //
  // An empty carrier means two things, which the first version collapsed.
  // Half-typed, it means "no whole value yet" and the digits under the caret
  // must survive. CLEARED — `setValue(name, '')`, `writeDateInput(node, null)`,
  // a reset to an empty default — it means the value is gone, and leaving it on
  // screen was measured showing a date the form no longer held while the
  // consumer still held the old one. A whole value on screen is what tells them
  // apart: nobody is mid-edit on a complete one.
  const arrive = (iso: string, fromReset = false) => {
    const target = field.current;
    if (target === null) return;
    // OUR OWN WRITE IS NOT AN ARRIVAL. Every keystroke pushes the new value
    // onto the carrier, which dispatches `input`, which lands here — and the
    // field has already been drawn and the consumer already told by the handler
    // that did it. Measured after the first version of this helper: one typed
    // date reported TWICE, because the equality check that used to stop it had
    // moved to guard only the repaint. A grid pick reported once and typing
    // twice, so the two paths disagreed about the same event.
    if (writingOwn.current && !fromReset) return;
    if (iso === '') {
      const wasWhole = latest.current.isWholeShown(shown.current);
      if (!wasWhole && !fromReset) return;
      target.value = '';
      shown.current = '';
      saySo('', '');
      announce('');
      return;
    }
    // THE SAME GRAMMAR THE MASK USES, which is the point of `normalise`. An
    // assignment of `2026-08-12T00:00:00.000Z` — what `toISOString()` gives,
    // and what a consumer writes without thinking — used to fail the strict
    // parser and leave the field empty while the carrier held the instant.
    const canonical = latest.current.normalise(iso);
    if (canonical === null) {
      // AND SAY SO, because this is the one arrival that leaves the carrier
      // holding something the field cannot show. The setter has already
      // committed the assignment by the time this runs, so `setValue(name,
      // 'tomorrow')` left the form posting `tomorrow` beside a box still
      // showing the old value, reporting nothing to the consumer and warning
      // nobody — while the SEED path warns for that exact string. Reverting is
      // not this component's call: the write came from outside with intent, and
      // guessing at a repair for it would be worse than being loud.
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `${label}: the value ${JSON.stringify(iso)} was written to this field from outside and does not name anything it can show, so the box still holds what it held. The form will post it as it is.`,
        );
      }
      return;
    }
    // AND THE CARRIER IS BROUGHT WITH IT, through the component's own write, so
    // the form posts what the field is showing rather than what it was handed.
    // A date field holding an instant is the `Date`-versus-day conflation this
    // whole family exists to refuse — and `write` dispatches a real event, so
    // the library that sent the instant is told what it became instead of being
    // left disagreeing with the DOM.
    if (canonical !== iso) write(canonical);
    const text = latest.current.display(canonical);
    if (text === '') return;
    if (text !== target.value) target.value = text;
    // RECORDED WHETHER OR NOT THE REPAINT WAS NEEDED, and the difference is not
    // cosmetic. `shown` is what the deletion path reads as "the text before this
    // keystroke", and on a RESET the platform reverts the visible field on its
    // own — so by the time this door runs the box already says `text` and the
    // old code, which recorded only inside the repaint, left `shown` holding the
    // text that had just been thrown away. Measured on a field seeded
    // `1985-03-12`: type `01/01/2000`, reset — the box correctly returns to
    // `12/03/1985` — then one Backspace emptied the whole field, because the
    // deletion was mapped onto a string with nothing in common with it. The same
    // staleness made `isWholeShown` above answer about the discarded text, so an
    // external clear was refused and the box went on showing a value the form no
    // longer held.
    shown.current = text;
    saySo(text, canonical);
    announce(canonical);
  };

  useEffect(() => {
    const element = carrier.current;
    if (element === null) return;
    const own = Object.getOwnPropertyDescriptor(element, 'value');
    const proto = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );
    const set = own?.set ?? proto?.set;
    const get = own?.get ?? proto?.get;
    if (set === undefined || get === undefined) return;

    // AND WHATEVER WAS WRITTEN BEFORE THIS RAN. `register()`'s ref callback
    // fires in the COMMIT phase, so react-hook-form has already assigned the
    // node by the time this passive effect installs the descriptor — measured,
    // a `defaultValues` holding a datetime went straight past all three doors
    // and the field started empty while the form held the instant. Reading the
    // node once, here, is the only place that write can still be seen.
    const arrived = element.value;

    // FOLLOW THE CARRIER WHEN SOMETHING ELSE WRITES IT.
    //
    // A form library setting a value does not go through this component:
    // react-hook-form's `setValue` and `reset` assign straight onto the element
    // its `register()` ref was given, which is the carrier. That fires no
    // event, records no mutation, and — measured — triggers no render either,
    // since a binding that only calls `register()` subscribes to nothing. So no
    // effect can catch it: the carrier held the new value while the user went
    // on reading the old one, and the form submitted something that was never
    // on screen.
    //
    // The only thing that can see an assignment is the property being assigned
    // to. React has already installed its own `value` descriptor here for its
    // change tracker, so this WRAPS whatever is on the node rather than
    // replacing it — the tracker keeps working, and the original goes back on
    // unmount. Our own writes go through the prototype setter
    // (`setNativeValue`), so they do not come back round through this.
    Object.defineProperty(element, 'value', {
      configurable: true,
      enumerable: own?.enumerable ?? false,
      // Bound to the element rather than to `this`: the descriptor is installed
      // on this one node and nowhere else, and the React Compiler refuses a
      // file containing a `this` it cannot follow.
      get() {
        return get.call(element) as string;
      },
      set(next: unknown) {
        set.call(element, next);
        arrive(String(next));
      },
    });

    // AND THE OTHER DOOR: a write that arrives as an EVENT rather than as a
    // bare assignment. That is how anything outside the component sets this
    // field on purpose — `writeDateInput`, and therefore a `Calendar` in a
    // `Popover` "setting the field" as ADR-0027 says it does. It cannot use the
    // assignment path, because the only way to leave React's value tracker
    // stale enough to hear the change is the prototype setter, which by
    // definition steps over the property wrapped above.
    //
    // Guarded on the text actually differing, so the component's OWN writes —
    // which dispatch the same event on every keystroke — do not redraw the
    // field under the caret.
    const follow = () => arrive(element.value);
    element.addEventListener('input', follow);
    if (arrived !== '') arrive(arrived);

    // AND THE THIRD DOOR, which takes neither of the first two: `form.reset()`.
    // The platform reverts a control to its default without going through the
    // `value` property and without an `input` event, so nothing tells anyone
    // the value changed.
    //
    // READ ON A TASK, NOT A MICROTASK, and this is the correction that matters:
    // a microtask checkpoint runs as soon as the listener returns and the JS
    // stack is empty — which it IS when the browser runs the reset from a
    // button's activation behaviour, i.e. the only reset a user can perform.
    // Measured at the platform level, typing into a seeded field:
    //
    //     button click   listener: typed | microtask: typed | timeout: seed
    //     form.reset()   listener: typed | microtask: seed  | timeout: seed
    //
    // So the microtask version reported the value that had just been DISCARDED,
    // and drove a `DatePicker`'s grid to it. Only `form.reset()` from script
    // keeps the stack long enough for the microtask to land after the revert,
    // and that is the path the test happened to take.
    //
    // ON THE DOCUMENT, IN THE CAPTURE PHASE, rather than on `element.form`. A
    // listener bound to the form is bound to the form the carrier had WHEN THE
    // EFFECT RAN: the cleanup then reads `element.form` after React has
    // detached the node, gets `null`, and removes nothing — measured, a
    // `DateInput` unmounted from a surviving form leaked its listener and its
    // whole closure every time. A changed `form=` prop never rebuilt it either,
    // so resets went to the old form and not the new one, and a form rendered
    // in a later commit got no listener at all. The document is always there,
    // and the filter is the carrier's own membership, read at event time.
    const reset = (event: Event) => {
      // EITHER FORM, because with a `form=` attribute there are two. The
      // carrier carries the name and can be associated with a form it is not
      // inside — a portal, a dialog, a sticky footer — while the VISIBLE field
      // has no name and therefore belongs to whatever form it sits in. The
      // platform reverts each control through its own form, so filtering on the
      // carrier's alone missed the case that `form=` exists for: measured, a
      // `<form id="qui">` holding a field bound to `altrove`, typed into and
      // then reset, put the box back to the seed and left the carrier on the
      // typed value — so `altrove` would post a value that was not on screen,
      // which is this family's founding defect in a mirror.
      const owner = event.target;
      if (owner !== element.form && owner !== field.current?.form) return;
      setTimeout(() => {
        // A RESET CAN BE REFUSED, and this listener used to wipe the field
        // anyway. `preventDefault()` on the event — a page asking "are you
        // sure?" — cancels the revert, so the carrier still holds what it held
        // and the box should too; measured, a half-typed `01/01/` was emptied
        // by a reset the page had just called off.
        //
        // Read HERE rather than in the listener: this is capture phase on the
        // document, so it runs BEFORE the handler that would refuse, and the
        // flag is only true once the dispatch is over. The same task that makes
        // the revert visible makes the refusal visible.
        if (event.defaultPrevented) return;
        arrive(element.value, true);
      }, 0);
    };
    document.addEventListener('reset', reset, true);

    return () => {
      element.removeEventListener('input', follow);
      document.removeEventListener('reset', reset, true);
      if (own === undefined) {
        Reflect.deleteProperty(element, 'value');
      } else {
        Object.defineProperty(element, 'value', own);
      }
    };
  }, [display]);

  const record = (text: string, iso: string) => {
    shown.current = text;
    reported.current = iso;
    saySo(text, iso);
  };

  return { carrier, field, shown, write, record };
}

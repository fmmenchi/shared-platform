import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFieldControl } from '../field/field.context.js';
import type { SliderProps } from './slider.types.js';
import styles from './slider.module.css';

/**
 * The numeric value a range input resolves from these inputs, which arrive as
 * whatever the DOM or the props hold — strings, numbers, nothing. Each falls
 * back the way the platform does: `min` 0, `max` 100, and a missing value at
 * the MIDPOINT, which is where the browser itself puts the thumb of a
 * value-less range; the result is clamped into the range like the element
 * clamps its own. An empty range (`max <= min`) pins the value at `min`.
 */
function numericValue(value: unknown, min: unknown, max: unknown): number {
  const [lo, hi] = bounds(min, max);
  if (hi <= lo) return lo;
  return Math.min(Math.max(parse(value, (lo + hi) / 2), lo), hi);
}

/** One number out of whatever a prop or a DOM attribute holds. */
function parse(raw: unknown, fallback: number): number {
  const n =
    typeof raw === 'number'
      ? raw
      : parseFloat(typeof raw === 'string' ? raw : '');
  return Number.isFinite(n) ? n : fallback;
}

/** The resolved `[min, max]`, with the platform's 0 and 100 as fallbacks. */
function bounds(min: unknown, max: unknown): [number, number] {
  return [parse(min, 0), parse(max, 100)];
}

/** Where that value sits, as the percentage the track gradient stops at. */
function fillPercent(value: unknown, min: unknown, max: unknown): string {
  const [lo, hi] = bounds(min, max);
  if (hi <= lo) return '0%';
  return `${((numericValue(value, min, max) - lo) / (hi - lo)) * 100}%`;
}

/**
 * Everything the component derives from the value, written on the ELEMENT from
 * the element's OWN current state: the fill percentage the stylesheet reads,
 * and — when the consumer gave a formatter — the `aria-valuetext` that keeps
 * what is announced in step with what is shown. One function so the two facts
 * can never be repainted out of step with each other.
 */
function paint(
  node: HTMLInputElement,
  getValueText: ((value: number) => string) | undefined,
): void {
  node.style.setProperty(
    '--slider-fill',
    fillPercent(node.value, node.min, node.max),
  );
  if (getValueText) {
    node.setAttribute('aria-valuetext', getValueText(node.valueAsNumber));
  }
}

/**
 * Pick one value from a range — volume, a price cap — with the native
 * `<input type="range">`. Like `Input` it is transparent (ADR-0013): every
 * native attribute and `ref` passes through, and `onChange` is attached to the
 * element unchanged, so `min`/`max`/`step`, the keyboard and `form.reset()`
 * are all the platform's own.
 *
 * THE DOM HOLDS THE VALUE. The browser paints this control from its own state,
 * so a copy in React would buy nothing and cost the two measured things the
 * primitives doc records: `form.reset()` becomes a no-op, and the "controlled
 * without onChange" warning disappears if the handler is wrapped. What is ours
 * is derived — the filled part of the track, a percentage the stylesheet reads
 * as `--slider-fill`, and the spoken value when `getValueText` is given — and
 * both are written where the value lives, ON THE ELEMENT, never mirrored into
 * state (see the effects below).
 *
 * Label it with an external `<label htmlFor>` — a range input holds no text of
 * its own — or `aria-label`. Give the value units with `getValueText`; a
 * static `aria-valuetext` is passed through untouched, but on an UNCONTROLLED
 * slider it goes stale on the first drag and overrides the correct
 * `aria-valuenow`, so reserve it for controlled usage that re-renders it.
 */
function Slider(props: SliderProps) {
  // NOTE no defaults in this destructuring pattern: one makes the React
  // Compiler abandon the whole component, silently and with lint green
  // (measured on Checkbox, visible in the shipped bundle).
  const { className, style, ref, getValueText, ...rest } = props;
  const fieldProps = useFieldControl(rest);
  const el = useRef<HTMLInputElement>(null);

  // The fill and the spoken value at RENDER time, from the same props the
  // element renders from — controlled `value` when there is one, the
  // uncontrolled seed otherwise. For an uncontrolled slider this is a SEED,
  // and one that can go stale: it re-enters the style object on every render,
  // so a render where it CHANGED (a moved `min`, a new `defaultValue`) makes
  // React rewrite the property over the element listener's fresher value.
  // The effect below repairs exactly that.
  const fill = fillPercent(rest.value ?? rest.defaultValue, rest.min, rest.max);
  const valueText = getValueText
    ? getValueText(
        numericValue(rest.value ?? rest.defaultValue, rest.min, rest.max),
      )
    : undefined;

  // WHENEVER A RENDER MAY HAVE REWRITTEN THE PAINT, re-derive it from the
  // element — the value React just wrote from props is the seed, not the
  // fact, and the DOM may hold something else entirely: a dragged value the
  // seed knows nothing about, or one the browser silently CLAMPED when `max`
  // shrank (which fires no `input` event at all). Runs right after the
  // possibly-stale write, repaints from the element, and is a no-op when the
  // two agree — the controlled case.
  //
  // NO DEPENDENCY LIST, and that is the correction rather than a shortcut. The
  // list held `fill` and `valueText`, both derived from PROPS — which for an
  // uncontrolled slider never change when the value does, so a write that
  // dispatched no event was never repainted by any later render either: the
  // thumb sat at 80 and the track stayed filled to 30, permanently. Measured:
  // `el.value = '80'` then an unrelated ancestor re-render → `--slider-fill`
  // still `30%`; only an `input` event moved it.
  //
  // The write is first-party, not exotic: react-hook-form's `setValue` and
  // `reset` assign `ref.value` without dispatching, and this package ships
  // that binding with no `FormSlider` to route around it — while a NATIVE
  // `form.reset()` did repaint, because a listener exists for it. One gesture,
  // two behaviours.
  //
  // Running every commit costs one read and, when nothing moved, one identical
  // string written onto an element this component already writes to per
  // render.
  useEffect(() => {
    const node = el.current;
    if (node != null) paint(node, getValueText);
  });

  // Keeping the paint in step WITHOUT owning value state: a native `input`
  // listener re-reads the element and writes back onto it — on the element,
  // not in React state, so an uncontrolled drag costs zero renders and there
  // is no second copy to drift.
  useEffect(() => {
    const node = el.current;
    if (node == null) return;
    const repaint = () => paint(node, getValueText);
    const onInput = () => {
      // Immediately, so the fill tracks the thumb with no lag — and once more
      // a TASK later, because a CONTROLLED slider whose parent ignores the
      // change has its DOM value restored by React after the handlers run,
      // and the first paint faithfully painted the position the restore then
      // snapped back. A macrotask, not a microtask: measured here, the
      // restoration had not landed yet at microtask time and the stale
      // percentage stuck.
      repaint();
      setTimeout(repaint);
    };
    node.addEventListener('input', onInput);
    // `form.reset()` restores the value but fires NO `input` event — only
    // `reset`, on the FORM, and at dispatch time the old value is still in
    // the DOM (measured bug class on this package's own controls). So: read
    // after a microtask, once the reset has landed. The listener sits on the
    // DOCUMENT and matches `node.form` AT EVENT TIME, because the association
    // is not only the `form` prop: the referenced form can mount, unmount or
    // be replaced later, none of which touch the prop — a listener bound to
    // whatever `node.form` was when the effect ran would miss all of that.
    const doc = node.ownerDocument;
    const onReset = (event: Event) => {
      if (event.target !== node.form) return;
      queueMicrotask(repaint);
    };
    doc.addEventListener('reset', onReset);
    return () => {
      node.removeEventListener('input', onInput);
      doc.removeEventListener('reset', onReset);
    };
  }, [getValueText]);

  return (
    <input
      ref={mergeRefs(el, ref)}
      className={cn(styles.slider, className)}
      // Ours first, the consumer's spread after — the same precedence as
      // `className`. Render-time only, though: the property is private to the
      // stylesheet, and a consumer's pin in `style` outlives our render coat
      // but NOT the element listener, which writes the element's own style on
      // the first interaction.
      style={{ '--slider-fill': fill, ...style } as CSSProperties}
      {...fieldProps}
      // AFTER the spread, both. `type` is the component's identity rather
      // than a default a caller may edit — the types already remove it, but a
      // JS consumer has no types, and a form adapter's untyped bag can emit
      // `type` unconditionally (measured on Checkbox under Conform). And when
      // `getValueText` is given it OWNS `aria-valuetext` — a static one under
      // it would be the stale-override hazard the prop exists to end — while
      // without it the plain passthrough stands.
      type="range"
      aria-valuetext={valueText ?? props['aria-valuetext']}
    />
  );
}

export { Slider };

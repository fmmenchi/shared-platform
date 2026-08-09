import { isValidElement } from 'react';
import type { ElementType, ReactElement, ReactNode, Ref } from 'react';
import { cn } from '../util/cn.js';
import { mergeRefs } from './merge-refs.js';
import { useDevWarning } from './use-dev-warning.js';
import type { SlotProps } from './slot.types.js';

/** `onClick`, `onKeyDown`, … — anything React treats as an event handler. */
const isHandlerName = (name: string) =>
  name.startsWith('on') && name.charCodeAt(2) >= 65 && name.charCodeAt(2) <= 90;

type Props = Record<string, unknown>;

/**
 * Merge one element's props with a component's own, and say WHY for each rule.
 *
 * Handing an element to `cloneElement` REPLACES its props rather than merging
 * them — a fact this package has written into two components' comments already,
 * because each discovered it separately. Replacing is silent in the worst way:
 * the child keeps rendering, its `onClick` simply never runs again, or its
 * class disappears.
 */
function mergeProps(ours: Props, theirs: Props): Props {
  const merged: Props = { ...ours };

  for (const [name, value] of Object.entries(theirs)) {
    const our = ours[name];

    if (isHandlerName(name) && typeof value === 'function') {
      // BOTH run, and the child's runs first: it is the more specific author,
      // and a handler that calls `preventDefault` must be able to do so before
      // ours reads the event. Keeping only one of the two is the failure mode
      // this whole function exists for.
      merged[name] =
        typeof our === 'function'
          ? (...args: unknown[]) => {
              (value as (...a: unknown[]) => unknown)(...args);
              (our as (...a: unknown[]) => unknown)(...args);
            }
          : value;
      continue;
    }

    if (name === 'className') {
      // Ours FIRST, so a consumer's rule of equal specificity wins the cascade
      // — the same order every component in this package uses for `className`.
      merged[name] = cn(our as string, value as string);
      continue;
    }

    if (name === 'style') {
      // Theirs wins per property: an inline style written at the call site is
      // the most specific thing anyone can say about this element.
      merged[name] = { ...(our as object), ...(value as object) };
      continue;
    }

    if (name === 'ref') continue; // handled once, below

    // EVERYTHING ELSE: theirs. The child is what the app actually wrote, so
    // `aria-current`, `href`, `id` and the rest are its statements to make —
    // which is the same precedence the components already give a consumer.
    merged[name] = value;
  }

  return merged;
}

/**
 * Render the child the caller gave, wearing this component's props.
 *
 * The composition escape hatch, and the reason it exists rather than a generic:
 * an app writes its OWN component — its router's link, its own button — with
 * its own types, checked against its own library, and the design system adds
 * behaviour to it without ever naming it. `asChild` in Radix, `render` in Base
 * UI; the mechanism is one both a shadcn and an Ark user already know.
 *
 * It is an escape hatch and not the default on purpose: written this way the
 * app repeats its component at every call site, which is exactly what an
 * injected adapter removes. Reach for it when the adapter cannot express the
 * case — a route descriptor with typed params, a link that needs its own
 * handler — not instead of one.
 *
 * A child that is not a single element is rendered UNTOUCHED, with a dev
 * warning. Throwing would be defensible and Radix does it; this package warns
 * everywhere else and a broken slot degrades to an unstyled but working
 * element, where a throw takes the page.
 */
function Slot(props: SlotProps): ReactNode {
  const { children, ref: ourRef, ...ours } = props;

  const valid = isValidElement(children);
  useDevWarning(
    !valid,
    'Slot: expected a single React element as its child, so there is something to put these props on. Rendered the children untouched — the class names, handlers and ref meant for them were dropped.',
  );

  if (!valid) return children;

  const element = children as ReactElement<Props>;
  const Child = element.type as ElementType;
  // `element.props.ref`, not `element.ref`: in React 19 the ref IS a regular
  // prop, and reading the old field warns on every render.
  const theirRef = element.props['ref'] as Ref<unknown> | undefined;

  // REBUILT IN JSX RATHER THAN CLONED, for the one reason `ToolbarItem` records
  // beside the same decision: a `ref` may be read during render ONLY in a JSX
  // attribute. `cloneElement` takes its props as a function argument, so
  // merging a ref there is "accessing a ref during render" and the React
  // Compiler refuses to build the file at all — not a warning, a failed build.
  //
  // The child's `key` is not carried across and does not need to be: it
  // addressed this element among ITS siblings, and here it has none.
  return (
    <Child
      {...mergeProps(ours, element.props)}
      ref={mergeRefs<unknown>(ourRef, theirRef)}
    />
  );
}

export { Slot };

import { isValidElement, useState } from 'react';
import type { ElementType, ReactElement, Ref } from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import {
  emptyDescendants,
  useDescendant,
} from '../../primitives/use-descendants.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useToolbarPart } from '../toolbar/toolbar.context.js';
import { useToolbarItemWarnings } from './toolbar-item.guards.js';
import type { ToolbarItemProps } from './toolbar-item.types.js';

/** One item outside a bar, so the hook order never changes. */
const ORPHAN = emptyDescendants<undefined>();

/** What we need off the cloned control, and all we need. */
type Cloneable = ReactElement<{
  ref?: Ref<HTMLElement>;
  tabIndex?: number;
}>;

/**
 * One control on the bar.
 *
 * IT RENDERS NOTHING OF ITS OWN. It clones the control it is given, merges in a
 * ref, passes on anything handed to it, and gets out of the way — no wrapper
 * element, no class, no role. A `<div>` around every button would be three
 * things this package says not to do at once: an element that has not earned
 * its place, a second box between the bar's `gap` and the controls it is meant
 * to space, and a layer for a `role="toolbar"`'s children to be lost behind.
 *
 * SO THE CONTROL STAYS WHATEVER IT WAS. A `Button` is still a `Button`, with
 * its variants, its `aria-pressed`, its pending state; a `Checkbox` is still a
 * checkbox. The toolbar has no opinion about any of it and holds no copy of it
 * — which is why there is no `ToolbarButton` here. That component would be a
 * half-copy of `Button`, and this package has already paid for one of those.
 *
 * IT PASSES ON WHAT IT IS GIVEN, and that is not politeness — it is what lets
 * this compose with the other component in the package that clones a single
 * child. Two of them cannot both reach the same DOM node by cloning it, so the
 * outer one has to hand its props THROUGH the inner one. This is the working
 * shape, and an icon button with a tooltip is the archetypal toolbar:
 *
 *     <Tooltip content="Bold (⌘B)">
 *       <ToolbarItem>
 *         <Button icon={<BoldIcon />} aria-label="Bold" />
 *       </ToolbarItem>
 *     </Tooltip>
 *
 * The `ref` and the `aria-describedby` the tooltip clones onto this arrive as
 * ordinary props and go on to the button, merged rather than replaced. The
 * other order — the tooltip INSIDE the item — cannot work in either direction,
 * and says so out loud now (see `toolbar-item.guards.ts`).
 *
 * A REF IS ALL IT ADDS, which is less than the first version asked for. That
 * one cloned a `tabindex` too, from an id it minted with `useId` and compared
 * against the bar's state — so every control re-rendered whenever the focus
 * moved. The bar now writes `tabindex` onto the elements, which is where this
 * package's rule puts a fact that has to travel between parts before React can
 * re-render, and all of that went away.
 *
 * Not an `onFocus` either: `cloneElement` props REPLACE the child's, so cloning
 * a handler onto a control that came with one of its own would silently drop
 * theirs — the defect the Tooltip's trigger documents. The bar listens for
 * `focusin` once, on itself.
 */
function ToolbarItem(props: ToolbarItemProps) {
  const { children, ref, ...rest } = props;

  const context = useToolbarPart('ToolbarItem');
  const register = useDescendant<undefined>(
    context?.items ?? ORPHAN,
    undefined,
  );
  // The node, as state rather than a ref, because a guard has to RE-RUN when it
  // arrives — and because reading a ref during render is what the compiler
  // rejects. The same shape the Tooltip's trigger uses, for the same reason.
  const [node, setNode] = useState<HTMLElement | null>(null);

  const valid = isValidElement(children);
  // A fragment IS a valid element, so this is not the guard it looks like — the
  // one that catches a fragment, and a component that drops the ref, is the
  // deferred pair below, which asks the DOM what actually happened.
  // `children` is typed `ReactElement`, so this only ever fires for JavaScript
  // that ignored the type — and not for `{cond && <Button/>}`, which is the
  // ordinary way to leave a control out and must stay silent.
  useDevWarning(
    !valid && children != null && (children as unknown) !== false,
    'ToolbarItem: `children` must be a single element that accepts a ref and spreads its props — bare text cannot carry a tab stop, so the control will not be reachable from the bar.',
  );
  useDevWarning(
    valid && (children as Cloneable).props.tabIndex !== undefined,
    "ToolbarItem: the control sets its own `tabIndex`, and the toolbar writes that attribute — a toolbar is ONE tab stop, and which control holds it is the toolbar's to decide. Yours is overwritten, and re-applied only on a render where its value CHANGES, which is worse than losing it outright.",
  );
  useToolbarItemWarnings(valid ? node : null);

  // Nothing to wrap, quietly: `{canDelete && <Button/>}` is the ordinary way to
  // leave a control out, and warning about it would train people to ignore the
  // warnings that matter.
  if (!valid) return children;

  const element = children as Cloneable;
  const Control = element.type as ElementType;

  // REBUILT IN JSX RATHER THAN CLONED, and the reason is narrow and absolute: a
  // `ref` may be read during render ONLY in a JSX attribute. `cloneElement`
  // takes its props as a function argument, so merging our own `ref` prop there
  // is "accessing a ref during render" and the React Compiler refuses to build
  // the file at all. Every other component here forwards a ref the same way,
  // inline in JSX — this one just has to name the type first.
  //
  // The child's `key` is not carried across, and does not need to be: it would
  // have addressed this element among ITS siblings, and it has none.
  return (
    <Control
      {...element.props}
      {...rest}
      ref={mergeRefs<HTMLElement>(element.props.ref, register, setNode, ref)}
    />
  );
}

export { ToolbarItem };

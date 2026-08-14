import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { skeletonVariants } from './skeleton.variants.js';
import { deadAriaMessage, smuggledAria } from './skeleton.guards.js';
import type { SkeletonProps } from './skeleton.types.js';

/**
 * A grey stand-in for content that has not arrived — a line of type, a panel,
 * an avatar — so a loading page keeps its shape instead of collapsing and
 * jumping when the data lands.
 *
 * It is DECORATIVE and always `aria-hidden`: a screen reader gains nothing from
 * three grey boxes. The wait is announced by a live region the consumer keeps
 * OUTSIDE the placeholders — see the docs, and `Button`, which ships the same
 * pattern for the same reason. `aria-busy` alone announces nothing.
 *
 * NO `loading` PROP, and no children to swap: this is a box, not a wrapper.
 * `{loading ? <Skeleton /> : <Content />}` is one line at the call site and it
 * keeps the branch where the loading actually happens — see the types file for
 * what the wrapper version would have to own instead, and what it would buy.
 */
function Skeleton(props: SkeletonProps) {
  const {
    className,
    shape,
    // NOT UNUSED — this destructure IS the enforcement, and the type alone was
    // not. `children` and `dangerouslySetInnerHTML` are `Omit`ed from
    // `SkeletonProps`, which stops `<Skeleton>hi</Skeleton>` and stops nothing
    // else: a consumer's one-line pass-through wrapper
    // (`(p: ComponentProps<'div'>) => <Skeleton {...p} />`) typechecks clean,
    // and a spread of a typed variable is not excess-property-checked. Measured
    // with `renderToStaticMarkup`: the payload rendered INSIDE the permanently
    // `aria-hidden` box — content no screen reader can ever reach. `tabIndex`
    // is the same hole from the other side: focus landing on an `aria-hidden`
    // element is a WCAG 4.1.2 defect and axe's own `aria-hidden-focus` rule.
    // Dropping all three here is what makes the contract true at runtime.
    children: _children,
    dangerouslySetInnerHTML: _html,
    tabIndex: _tabIndex,
    ...rest
  } = props as SkeletonProps & {
    children?: unknown;
    dangerouslySetInnerHTML?: unknown;
    tabIndex?: number;
  };

  // Silently dead, otherwise. `role`, `aria-live` and `aria-label` all survive
  // the props type, land in the DOM, and are then annulled by the `aria-hidden`
  // below — so `<Skeleton role="status" aria-live="polite" />` reads as a live
  // region that can never fire, and nothing (TypeScript, axe, the consumer's
  // own suite) says a word. `VisuallyHidden` warns about the mirror-image
  // mistake; this is that guard pointed the other way.
  const smuggled = smuggledAria(props);
  useDevWarning(smuggled.length > 0, deadAriaMessage(smuggled));

  return (
    <div
      className={cn(skeletonVariants({ shape }), className)}
      {...rest}
      // AFTER the spread: this is the component's contract with assistive
      // tech, not a default to be talked out of. A caller who wants something
      // announced wants the live region the docs describe, and a second
      // channel to contradict this one would only make the two disagree.
      aria-hidden="true"
    />
  );
}

export { Skeleton };

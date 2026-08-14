import { cn } from '../../util/cn.js';
import { skeletonVariants } from './skeleton.variants.js';
import type { SkeletonProps } from './skeleton.types.js';

/**
 * A grey stand-in for content that has not arrived — a line of type, a panel,
 * an avatar — so a loading page keeps its shape instead of collapsing and
 * jumping when the data lands.
 *
 * It is DECORATIVE and always `aria-hidden`: a screen reader gains nothing
 * from three grey boxes, and the loading state is not the placeholder's to
 * announce. That belongs to the region being replaced — `aria-busy` while it
 * waits — or, when the wait itself needs a name, to `Progress` with no
 * `value`, which this library already ships for exactly that. Two components
 * announcing one wait is worse than one.
 *
 * NO `loading` PROP, and no children to swap: this is a box, not a wrapper.
 * `{loading ? <Skeleton /> : <Content />}` is one line at the call site and it
 * keeps the branch where the loading actually happens — see the types file for
 * what the wrapper version would have to own instead.
 */
function Skeleton(props: SkeletonProps) {
  const { className, shape, ...rest } = props;

  return (
    <div
      className={cn(skeletonVariants({ shape }), className)}
      {...rest}
      // AFTER the spread: this is the component's contract with assistive
      // tech, not a default to be talked out of. A caller who wants something
      // announced wants `Progress`, and a second channel to contradict this
      // one would only make the two disagree.
      aria-hidden="true"
    />
  );
}

export { Skeleton };

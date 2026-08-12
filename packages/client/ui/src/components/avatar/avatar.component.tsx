import { useEffect, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { avatarVariants } from './avatar.variants.js';
import { initialsFromName } from './avatar.initials.js';
import { isImageBroken } from './avatar.broken.js';
import type { AvatarProps } from './avatar.types.js';
import styles from './avatar.module.css';

/**
 * Shows who someone is — their picture, or their initials when there is no
 * picture to show. One accessible node: the root announces the `name`, and
 * without a name the avatar is decorative, hidden from assistive tech.
 */
function Avatar(props: AvatarProps) {
  const {
    className,
    size,
    name,
    src,
    crossOrigin,
    referrerPolicy,
    loading,
    ...rest
  } = props;

  // The failure is keyed to the src STRING, not a boolean: a changed `src`
  // compares unequal, so the error state resets by derivation — no effect to
  // clear a stale flag, no frame where the old failure hides the new image.
  const [failedSrc, setFailedSrc] = useState<string>();
  const showImage = !!src && src !== failedSrc;

  // The failures React never sees — an error that fired before hydration
  // attached the handler, a cached failure the browser resolves without
  // re-firing the event. WHY a complete-with-no-pixels image is only a
  // SUSPICION, and what settles it, lives in `avatar.broken.ts`: asked of a
  // shape rather than of an element, so all three answers are provable in a
  // suite whose one engine cannot produce two of them. A post-unmount
  // setState is a no-op in React 18+.
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    void isImageBroken(img).then((broken) => {
      if (broken) setFailedSrc(src);
    });
  }, [src]);

  // Whitespace is not a name: it can neither label the avatar nor yield
  // initials, so it downgrades to decorative like an absent `name` does.
  const label = name?.trim();
  const initials = label ? initialsFromName(label) : '';

  // A consumer labeling the avatar THEMSELVES (`aria-label`/`aria-labelledby`
  // in ...rest) must count as naming it: keying the role and the hiding off
  // `name` alone would ship their label on an aria-hidden, role-less span —
  // a dead label the a11y tree never sees.
  const attrs = rest as Record<string, unknown>;
  // ONE READING of the consumer's label, used for both decisions. The file
  // asked the same prop twice and answered differently: `consumerLabeled`
  // read `!= null` (an explicit `undefined` is NOT a label), while the spread
  // let that same `undefined` overwrite ours — so `aria-label={cond ? 'Your
  // profile' : undefined}`, the most ordinary React idiom there is, produced
  // a `role="img"` with NO accessible name at all on the false branch:
  // measured, `getByRole('img', { name })` throws, and axe's `role-img-alt`
  // fires. Worse than the decorative branch, which at least hides itself.
  // The third time this package pays for the same shape (`nav-link`'s
  // aria-current, `segmented-control`'s aria-label).
  const consumerLabel = attrs['aria-label'] as string | undefined;
  const consumerLabeled =
    consumerLabel != null || attrs['aria-labelledby'] != null;
  const isNamed = !!label || consumerLabeled;

  return (
    // `role="img"` makes the descendants
    // presentational — one node in the tree, named by `label` or by the
    // consumer's own labeling; with neither, the whole thing is decoration and
    // says so. When neither image nor initials render, the root is `:empty`
    // and the stylesheet draws a neutral silhouette from that fact — no flag
    // class to drift.
    <span
      role={isNamed ? 'img' : undefined}
      aria-hidden={isNamed ? undefined : true}
      className={cn(avatarVariants({ size }), className)}
      {...rest}
      // AFTER the spread, from the chain above: a real string still wins, and
      // an explicit `undefined` no longer deletes the name it never replaced.
      // `role` and `aria-hidden` stay before it — they are ours to decide and
      // a consumer overriding them is the escape hatch that was already there.
      aria-label={consumerLabel ?? label}
    >
      {showImage ? (
        // Always the real element, straight into the HTML: SSR-complete markup,
        // and the browser starts fetching without waiting for hydration (the
        // preloader-object pattern renders nothing until JS decides). `alt=""`
        // because the ROOT carries the name — a second name would double it.
        // Keyed by src so a change REPLACES the element: a reused one can
        // deliver the old src's queued `error` after the new src committed,
        // and `onError` closing over the new value would condemn an image
        // whose fetch is still in flight — sticky, because failure is keyed
        // to the string.
        <img
          key={src}
          ref={imgRef}
          className={styles.image}
          src={src}
          alt=""
          crossOrigin={crossOrigin}
          referrerPolicy={referrerPolicy}
          loading={loading}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        initials || null
      )}
    </span>
  );
}

export { Avatar };

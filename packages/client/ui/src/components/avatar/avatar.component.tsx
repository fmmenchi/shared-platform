import { useEffect, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { avatarVariants } from './avatar.variants.js';
import { initialsFromName } from './avatar.initials.js';
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

  // `onError` alone misses the failures React never sees: an error that fired
  // before hydration attached the handler, and a cached failure the browser
  // resolves without re-firing the event. A COMPLETE image with no pixels is
  // the DOM's record of both — but only a SUSPICION: a loaded SVG with a bare
  // viewBox also reports naturalWidth 0 (per spec; Firefox does exactly that),
  // and condemning it would swap a healthy image for initials forever. So the
  // suspicion is confirmed with `decode()`, which rejects only for a genuinely
  // broken image. A post-unmount setState is a no-op in React 18+.
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      void img.decode().catch(() => setFailedSrc(src));
    }
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
  const consumerLabeled =
    attrs['aria-label'] != null || attrs['aria-labelledby'] != null;
  const isNamed = !!label || consumerLabeled;

  return (
    // Our ARIA sits BEFORE the spread so a consumer's own `aria-label`/
    // `aria-labelledby` in `...rest` wins. `role="img"` makes the descendants
    // presentational — one node in the tree, named by `label` or by the
    // consumer's own labeling; with neither, the whole thing is decoration and
    // says so. When neither image nor initials render, the root is `:empty`
    // and the stylesheet draws a neutral silhouette from that fact — no flag
    // class to drift.
    <span
      role={isNamed ? 'img' : undefined}
      aria-label={label}
      aria-hidden={isNamed ? undefined : true}
      className={cn(avatarVariants({ size }), className)}
      {...rest}
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

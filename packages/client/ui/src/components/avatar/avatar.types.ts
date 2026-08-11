import type { ComponentPropsWithRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { avatarVariants } from './avatar.variants.js';

/** Size axis, derived from the cva definition. */
export type AvatarVariants = VariantProps<typeof avatarVariants>;

type ImgProps = ComponentPropsWithRef<'img'>;

interface AvatarOwnProps extends AvatarVariants {
  /**
   * The person or entity shown. It is the avatar's accessible name AND the
   * source of the initials fallback; without it the avatar is decorative —
   * hidden from assistive tech entirely.
   */
  name?: string;
  /**
   * Image URL. The `<img>` is always in the HTML when `src` is given (no
   * client-side preloading), so SSR ships complete markup; if it fails to
   * load, the initials fallback takes its place. A failure is remembered per
   * URL — re-setting the identical string is not retried; append a
   * cache-buster to force a retry.
   */
  src?: string;
  /** Forwarded to the underlying `<img>` — CORS credentials mode. */
  crossOrigin?: ImgProps['crossOrigin'];
  /** Forwarded to the underlying `<img>` — referrer sent with the request. */
  referrerPolicy?: ImgProps['referrerPolicy'];
  /** Forwarded to the underlying `<img>` — native lazy loading. */
  loading?: ImgProps['loading'];
}

/**
 * Public Avatar props. Flat, no compound parts: the component owns the
 * image/fallback exchange, so there is nothing for children to slot —
 * `children` is typed out, and at runtime the render always supplies its own
 * (image, initials, or nothing), so even one forced through the spread by an
 * untyped caller is overwritten. The ref reaches the root `<span>`.
 */
export type AvatarProps = AvatarOwnProps &
  Omit<ComponentPropsWithRef<'span'>, keyof AvatarOwnProps | 'children'>;

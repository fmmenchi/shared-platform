/** Duration token keys — map to `--fm-duration-<key>` (see @fmmenchi/tokens). */
export type MotionDuration = 'xs' | 's' | 'm' | 'l';

/** Easing token keys — map to `--fm-ease-<key>` (direction-based intents). */
export type MotionEase = 'standard' | 'enter' | 'exit' | 'linear';

/** Built-in exit shapes, mirroring the motion.css primitives. */
export type ExitPreset = 'fade' | 'scale';

/** Options for `animateExit`. */
export interface AnimateExitOptions {
  /**
   * Exit shape: `'scale'` (fade + subtle scale, mirrors `fm-scale-out` —
   * the default) or `'fade'` (opacity only, reduced-motion-safe by nature).
   */
  preset?: ExitPreset;
  /** Duration token key (default `'m'`). Read from the element, so themable. */
  duration?: MotionDuration;
  /** Easing token key (default `'exit'`). Read from the element, so themable. */
  ease?: MotionEase;
  /** Custom WAAPI keyframes — the escape hatch; wins over `preset`. */
  keyframes?: Keyframe[];
  /**
   * Animate a pseudo-element instead of the element — `'::backdrop'`, which is
   * the only one that has come up: a modal fading out while its scrim vanishes
   * on the first frame looks broken rather than animated. Measured animatable
   * in Chromium, Gecko and WebKit.
   */
  pseudoElement?: string;
}

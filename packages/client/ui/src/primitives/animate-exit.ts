import type { AnimateExitOptions, ExitPreset } from './animate-exit.types.js';

/**
 * Imperative EXIT animation via the Web Animations API — the design system's
 * only JS-driven motion, and only because the platform isn't ready yet: a
 * closing `<dialog>`/popover goes to `display: none`, which kills CSS
 * transitions, and the CSS fix (`@starting-style` +
 * `transition-behavior: allow-discrete`) is not Baseline Widely available
 * until ~2027 (ADR-0009). When it is, this helper retires. No motion runtime:
 * WAAPI *is* the platform.
 *
 * Reads the motion tokens from the element (so it stays themable), honours
 * `prefers-reduced-motion` per the doctrine (transforms stripped — movement is
 * the vestibular trigger; opacity kept — change is fine), and resolves on
 * cancel too, so the caller can always `await` it before `close()`/unmount.
 */
export async function animateExit(
  el: HTMLElement,
  options: AnimateExitOptions = {},
): Promise<void> {
  const {
    preset = 'scale',
    duration = 'm',
    ease = 'exit',
    keyframes = PRESETS[preset],
  } = options;
  if (typeof el.animate !== 'function') return;

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const frames = prefersReduced ? reducedMotionKeyframes(keyframes) : keyframes;
  if (!frames) return;

  const style = getComputedStyle(el);
  const ms =
    parseDuration(style.getPropertyValue(`--fm-duration-${duration}`)) ?? 350;
  const easing =
    style.getPropertyValue(`--fm-ease-${ease}`).trim() || 'ease-in';

  try {
    await el.animate(frames, { duration: ms, easing }).finished;
  } catch {
    // Canceled (element removed, animation interrupted) — exit proceeds.
  }
}

/** Built-in exit shapes, mirroring the motion.css primitives. */
const PRESETS: Record<ExitPreset, Keyframe[]> = {
  fade: [{ opacity: 1 }, { opacity: 0 }],
  scale: [
    { opacity: 1, transform: 'none' },
    { opacity: 0, transform: 'scale(0.97)' },
  ],
};

/**
 * The reduced-motion projection of a set of keyframes: transforms stripped,
 * everything else kept. Returns `null` when nothing animatable remains (a
 * transform-only animation reduces to no animation at all).
 */
export function reducedMotionKeyframes(frames: Keyframe[]): Keyframe[] | null {
  const stripped = frames.map(({ transform: _transform, ...rest }) => rest);
  const animatable = stripped.some((frame) =>
    Object.keys(frame).some((k) => k !== 'offset' && k !== 'easing'),
  );
  return animatable ? stripped : null;
}

/** Parse a CSS time (`350ms` / `.35s`) to milliseconds; null when absent. */
function parseDuration(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.endsWith('ms')) return Number.parseFloat(value);
  if (value.endsWith('s')) return Number.parseFloat(value) * 1000;
  return null;
}

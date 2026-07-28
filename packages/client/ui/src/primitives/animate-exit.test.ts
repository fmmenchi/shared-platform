import { describe, it, expect } from 'vitest';
import { animateExit, reducedMotionKeyframes } from './animate-exit.js';

const mount = (): HTMLElement => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};

describe('animateExit', () => {
  it('runs the exit and resolves (duration from the token on the element)', async () => {
    const el = mount();
    el.style.setProperty('--fm-duration-m', '10ms');
    const started = performance.now();
    await animateExit(el);
    expect(performance.now() - started).toBeLessThan(500);
    el.remove();
  });

  it('resolves (never rejects) when the animation is canceled mid-flight', async () => {
    const el = mount();
    el.style.setProperty('--fm-duration-m', '5s');
    const exit = animateExit(el);
    // Removing the element cancels its animations → `finished` rejects; the
    // helper must swallow that so callers can always `await` before close().
    setTimeout(() => el.getAnimations().forEach((a) => a.cancel()), 20);
    await expect(exit).resolves.toBeUndefined();
    el.remove();
  });
});

describe('reducedMotionKeyframes', () => {
  it('strips transforms and keeps the fade', () => {
    expect(
      reducedMotionKeyframes([
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'scale(0.97)' },
      ]),
    ).toEqual([{ opacity: 1 }, { opacity: 0 }]);
  });

  it('reduces a transform-only animation to none at all', () => {
    expect(
      reducedMotionKeyframes([
        { transform: 'translateY(0.5rem)' },
        { transform: 'none' },
      ]),
    ).toBeNull();
  });
});

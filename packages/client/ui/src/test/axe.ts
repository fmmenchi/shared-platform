import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Run axe against a container and assert no accessibility violations.
 * `color-contrast` is checked here since components render with real token
 * values (the theme CSS is loaded in test-setup).
 */
export async function expectNoA11yViolations(
  container: HTMLElement,
): Promise<void> {
  // THE SETTLED RENDER, NOT THE ONE THAT HAPPENS TO BE ON SCREEN. Axe
  // COMPOSITES what it measures, so a surface caught mid-fade is measured at
  // whatever opacity it has reached: `PopoverContent` enters on an opacity
  // transition, and half way through it axe read near-black text as `#999ca0`
  // on white (2.75:1) and a primary button's fill as `#8eafce`, reporting four
  // contrast failures inside an editor that is perfectly legible once it has
  // arrived. That test passed alone and failed about half the time in a full
  // run, where the machine is busy enough for the transition to still be
  // going — the shape EVERY a11y assertion over an animated surface has, so the
  // wait belongs here rather than in the one test that happened to notice.
  //
  // INFINITE ANIMATIONS ARE SKIPPED, or a spinner would hang the suite; a
  // cancelled one rejects, which is not a failure of the thing being asserted.
  await Promise.all(
    container
      .getAnimations({ subtree: true })
      .filter(
        (animation) => animation.effect?.getTiming().iterations !== Infinity,
      )
      .map((animation) => animation.finished.catch(() => undefined)),
  );

  const results = await axe.run(container, {
    resultTypes: ['violations'],
  });
  // THE NODES, not just how many. A message reading "color-contrast (4 nodes)"
  // sends the next reader to run the suite again with a debugger; the selectors
  // and axe's own summary say which elements and by how much.
  const messages = results.violations.map(
    (v) =>
      `${v.id}: ${v.help}\n` +
      v.nodes
        .map(
          (node) =>
            `  ${node.target.join(' ')} — ${node.failureSummary?.replace(/\s+/g, ' ') ?? ''}`,
        )
        .join('\n'),
  );
  expect(results.violations, messages.join('\n')).toHaveLength(0);
}

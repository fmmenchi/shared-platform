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

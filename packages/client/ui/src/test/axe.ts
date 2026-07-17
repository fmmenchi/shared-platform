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
  const messages = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`,
  );
  expect(results.violations, messages.join('\n')).toHaveLength(0);
}

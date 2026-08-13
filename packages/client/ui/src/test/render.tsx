import type { ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { FormatterDefaults } from '@fmmenchi/formatting';
import { UiProvider } from '../i18n/provider.js';

/**
 * Render a subtree wrapped in UiProvider with a given locale + theme.
 *
 * `rerender` IS WRAPPED TOO, and it has to be: Testing Library's replaces the
 * whole tree with what you hand it, so `const { rerender } = renderUi(…)`
 * followed by `rerender(<Thing />)` renders the thing WITHOUT the provider.
 * A component that throws without one fails loudly, which is how this was
 * found — but one that merely degrades would have quietly changed behaviour
 * mid-test, and the assertion after it would have been measuring the fallback.
 */
export function renderUi(
  ui: ReactNode,
  opts: {
    locale?: string;
    theme?: string;
    /** The provider's formatting slice — the app's zone and fallback currency. */
    formatting?: FormatterDefaults;
  } = {},
): RenderResult {
  const { locale = 'en', theme, formatting } = opts;

  // ONE ADAPTERS OBJECT PER RENDER CALL, not one per wrap. Rebuilt inside
  // `wrap`, every re-render handed the provider a new object and therefore a
  // new context value — so the churn a memoisation test wants to catch was the
  // harness's own baseline, and a regression in the provider would have been
  // invisible to every test in the package.
  const adapters = { i18n: { locale } };

  const wrap = (node: ReactNode) => (
    <UiProvider adapters={adapters} formatting={formatting} theme={theme}>
      {node}
    </UiProvider>
  );

  const result = render(wrap(ui));
  return {
    ...result,
    rerender: (next: ReactNode) => {
      result.rerender(wrap(next));
    },
  };
}

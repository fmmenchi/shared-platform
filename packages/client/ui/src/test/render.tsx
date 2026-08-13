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

  const wrap = (node: ReactNode) => (
    <UiProvider
      adapters={{ i18n: { locale } }}
      formatting={formatting}
      theme={theme}
    >
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

import type { ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { UiProvider } from '../i18n/provider.js';

/** Render a subtree wrapped in UiProvider with a given locale + theme. */
export function renderUi(
  ui: ReactNode,
  opts: { locale?: string; theme?: string } = {},
): RenderResult {
  const { locale = 'en', theme } = opts;
  return render(
    <UiProvider adapters={{ i18n: { locale } }} theme={theme}>
      {ui}
    </UiProvider>,
  );
}

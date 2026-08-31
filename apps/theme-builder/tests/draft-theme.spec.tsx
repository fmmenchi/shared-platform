import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DraftThemeProvider,
  DraftThemeScope,
  useDraftTheme,
} from '../app/draft-theme';

/**
 * WHAT THIS SUITE CAN AND CANNOT PROVE.
 *
 * It runs in jsdom, which has no CSS cascade worth the name — it will not resolve
 * a custom property, let alone evaluate `oklch(from …)`. So the MECHANIC of a
 * scoped theme is not measured here: that is
 * `packages/client/ui/src/docs/scoped-theme.test.tsx`, in a real Chromium, where
 * it also records the trap next to it (a block overriding only a base is inert on
 * a subtree, because the ramp settled at `:root`).
 *
 * What is measured here is the WIRING, which is where this app can actually be
 * wrong: that the draft is scoped rather than global, that the stylesheet appears
 * only when there is a draft, and that using the context outside its provider
 * fails loudly instead of rendering an empty theme that looks like a working one.
 */
function Harness({ css }: { css: string }) {
  const { setCss } = useDraftTheme();

  return (
    <>
      <button onClick={() => setCss(css)}>apply</button>
      <DraftThemeScope>
        <span>previewed</span>
      </DraftThemeScope>
    </>
  );
}

const draft = "[data-theme='draft'] { --fm-color-primary: oklch(70% 0.1 30); }";

describe('DraftThemeScope', () => {
  it('renders NO stylesheet and NO scope until there is a draft', () => {
    const { container } = render(
      <DraftThemeProvider>
        <DraftThemeScope>
          <span>previewed</span>
        </DraftThemeScope>
      </DraftThemeProvider>,
    );

    // An empty draft must look like the reference theme, not like a theme of
    // nothing: an always-present `data-theme` would scope the subtree to a name
    // no stylesheet defines, and every role would fall back to its `@property`
    // initial-value — opaque black, with nothing falsy to detect.
    expect(container.querySelector('[data-theme]')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
    expect(screen.getByText('previewed')).toBeTruthy();
  });

  it('scopes the draft to the subtree, never to the document', async () => {
    const { container } = render(
      <DraftThemeProvider>
        <Harness css={draft} />
      </DraftThemeProvider>,
    );

    screen.getByRole('button', { name: 'apply' }).click();
    const scope = await vi.waitFor(() => {
      const el = container.querySelector("[data-theme='draft']");
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });

    // The stylesheet lives with the element it applies to. The button — the
    // wizard's chrome — is OUTSIDE that element, which is the whole reason the
    // wizard survives a theme that cannot be read.
    expect(scope.contains(screen.getByRole('button', { name: 'apply' }))).toBe(
      false,
    );
    expect(scope.querySelector('style')?.textContent).toBe(draft);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('THROWS when used outside the provider', () => {
    // A silent default would make "not wired" indistinguishable from "no draft
    // yet", and only one of those is a bug.
    expect(() => render(<Harness css={draft} />)).toThrow(/DraftThemeProvider/);
  });
});

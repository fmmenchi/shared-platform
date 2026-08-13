import { describe, it, expect } from 'vitest';
import { memo, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import type { Formatter } from '@fmmenchi/formatting';
import { UiProvider } from '../i18n/provider.js';
import { useFormatter, useCopyFormatter } from './use-formatter.js';

/**
 * The formatter is handed out per render, so its IDENTITY is what decides
 * whether a table of formatted cells re-renders for nothing.
 */
describe('useFormatter', () => {
  it('survives a parent render, with the formatting stated inline', () => {
    // MEASURED BEFORE THIS: an inline `formatting={{ timeZone: … }}` — which is
    // how both component pages document it — is a new object every render, so
    // the provider's memo missed, every consumer re-rendered and every one got
    // a NEW formatter: three renders, three formatters. A 300-row table with
    // three formatted columns paid ~25% for it and discarded 900 formatter
    // objects each time.
    const seen: Formatter[] = [];
    let consumerRenders = 0;

    const Consumer = memo(function Consumer() {
      consumerRenders += 1;
      seen.push(useFormatter());
      return null;
    });

    function Host() {
      const [n, bump] = useState(0);
      return (
        <UiProvider
          adapters={ADAPTERS}
          formatting={{ timeZone: 'Europe/Rome', currency: 'EUR' }}
        >
          <button type="button" onClick={() => bump(n + 1)}>
            bump
          </button>
          <Consumer />
        </UiProvider>
      );
    }

    render(<Host />);
    return browser
      .click(screen.getByRole('button', { name: 'bump' }))
      .then(() => browser.click(screen.getByRole('button', { name: 'bump' })))
      .then(() => {
        expect(consumerRenders).toBe(1);
        expect(new Set(seen).size).toBe(1);
      });
  });

  it('builds a new one when the app actually changes its mind', () => {
    // The other half: a memo that never invalidates is not a memo.
    const seen: Formatter[] = [];

    function Consumer() {
      seen.push(useFormatter());
      return null;
    }

    function Host() {
      const [zone, setZone] = useState('Europe/Rome');
      return (
        <UiProvider adapters={ADAPTERS} formatting={{ timeZone: zone }}>
          <button type="button" onClick={() => setZone('America/Lima')}>
            move
          </button>
          <Consumer />
        </UiProvider>
      );
    }

    render(<Host />);
    return browser
      .click(screen.getByRole('button', { name: 'move' }))
      .then(() => {
        expect(seen[0]?.defaults.timeZone).toBe('Europe/Rome');
        expect(seen.at(-1)?.defaults.timeZone).toBe('America/Lima');
      });
  });

  it('asks a different locale question than the copy does', () => {
    // `de-DE` injected with no German catalog: the copy falls back to English
    // while `Intl` still writes `2.450`, which an English reader parses as
    // two-point-four-five. A cell is not inside a sentence; a sentence is.
    function Both() {
      return (
        <>
          <span data-testid="reader">{useFormatter().number(2450)}</span>
          <span data-testid="copy">{useCopyFormatter().number(2450)}</span>
        </>
      );
    }

    render(
      <UiProvider adapters={{ i18n: { locale: 'de-DE' } }}>
        <Both />
      </UiProvider>,
    );

    expect(screen.getByTestId('reader').textContent).toBe('2.450');
    expect(screen.getByTestId('copy').textContent).toBe('2,450');
  });

  it('works with no provider at all, like the direction does', () => {
    // `Table` renders without one, so a formatted column must not be the
    // single thing in it that suddenly demands the wrapper.
    function Bare() {
      return <span data-testid="bare">{useFormatter().integer(1234567)}</span>;
    }

    render(<Bare />);
    expect(screen.getByTestId('bare').textContent).not.toBe('');
  });
});

/** Hoisted: the adapters are not what this file is measuring. */
const ADAPTERS = { i18n: { locale: 'en-US' } };

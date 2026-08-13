import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Time } from './time.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** Midnight UTC on New Year's Day — the instant that is two different days. */
const NEW_YEAR = '2026-01-01T00:00:00Z';

describe('Time', () => {
  it('states the instant twice: once for a reader, once for a machine', () => {
    // The whole purpose of the element. Without `dateTime` it is a `<span>`
    // with extra letters, and everything that reads the attribute rather than
    // the pixels — a calendar, a scraper, a test — has nothing to read.
    renderUi(<Time value={NEW_YEAR} timeZone="UTC" />, { locale: 'it-IT' });

    const time = screen.getByText('1 gen 2026');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2026-01-01');
  });

  it('writes the day in the reader’s language, and the attribute in one', () => {
    renderUi(<Time value={NEW_YEAR} timeZone="UTC" />, { locale: 'en-US' });

    const time = screen.getByText('Jan 1, 2026');
    // The visible half moved; the machine half did not, and must not.
    expect(time).toHaveAttribute('datetime', '2026-01-01');
  });

  it('claims a day, not an instant, when it shows a day', () => {
    // `2026-01-01T00:00:00.000Z` in the attribute would state a precision the
    // reader was never shown — and midnight in some zone is a moment nobody
    // wrote down.
    renderUi(<Time value={NEW_YEAR} timeZone="UTC" />, { locale: 'it-IT' });
    expect(screen.getByText('1 gen 2026')).toHaveAttribute(
      'datetime',
      '2026-01-01',
    );

    renderUi(<Time value={NEW_YEAR} format="dateTime" timeZone="UTC" />, {
      locale: 'it-IT',
    });
    expect(screen.getByText('1 gen 2026, 00:00')).toHaveAttribute(
      'datetime',
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('reads the instant in the zone it was told, in both halves', () => {
    // The same instant is the 1st of January in Rome and the 31st of December
    // in Lima. The visible date and the attribute must not disagree about
    // which — that would be one element making two claims.
    renderUi(<Time value={NEW_YEAR} timeZone="America/Lima" />, {
      locale: 'en-GB',
    });

    const time = screen.getByText('31 Dec 2025');
    expect(time).toHaveAttribute('datetime', '2025-12-31');
  });

  it('takes the zone from the provider when the call does not name one', () => {
    renderUi(<Time value={NEW_YEAR} />, {
      locale: 'en-GB',
      formatting: { timeZone: 'America/Lima' },
    });
    expect(screen.getByText('31 Dec 2025')).toBeInTheDocument();
  });

  it('renders NOTHING for a missing instant, unless told what to render', () => {
    // A `<time>` with no date and no words states nothing, which is the one
    // thing this component exists to avoid.
    const { container, rerender } = renderUi(<Time value={null} />, {
      locale: 'it-IT',
    });
    expect(container.querySelector('time')).toBeNull();
    expect(container.textContent).toBe('');

    rerender(<Time value={undefined} fallback="—" />);
    expect(container.textContent).toBe('—');
    expect(container.querySelector('time')).toBeNull();
  });

  it('has no violations', async () => {
    const { container } = renderUi(<Time value={NEW_YEAR} timeZone="UTC" />, {
      locale: 'it-IT',
    });

    await expectNoA11yViolations(container);
  });
});

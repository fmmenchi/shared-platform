import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Numeric } from './numeric.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Numeric', () => {
  it('states the value twice: once for a reader, once for a machine', () => {
    // `1.234,5` and `1,234.5` are the same number and neither is parseable
    // without knowing which locale wrote it. `value` always is.
    renderUi(<Numeric value={12345.5} />, { locale: 'it-IT' });

    const data = screen.getByText('12.345,5');
    expect(data.tagName).toBe('DATA');
    expect(data).toHaveAttribute('value', '12345.5');
  });

  it('keeps the machine half in JavaScript’s notation, never the reader’s', () => {
    renderUi(<Numeric value={12345.5} />, { locale: 'en-US' });

    // The visible half moved; the attribute did not, and must not — that is
    // the only thing that makes it parseable.
    expect(screen.getByText('12,345.5')).toHaveAttribute('value', '12345.5');
  });

  it('RENDERS ZERO, which is the whole reason the guard is on absence', () => {
    // A balance of zero shown as an empty cell reads as missing data.
    renderUi(<Numeric value={0} />, { locale: 'it-IT' });
    expect(screen.getByText('0')).toHaveAttribute('value', '0');
  });

  it('renders nothing for absence, and for the NaN arithmetic produces', () => {
    const { container, rerender } = renderUi(<Numeric value={null} />, {
      locale: 'it-IT',
    });
    expect(container.textContent).toBe('');

    rerender(<Numeric value={Number.NaN} fallback="—" />);
    expect(container.textContent).toBe('—');
    expect(container.querySelector('data')).toBeNull();
  });

  it('writes an amount in the currency it was given', () => {
    renderUi(<Numeric value={1234.5} format="currency" currency="EUR" />, {
      locale: 'en-US',
    });
    expect(screen.getByText('€1,234.50')).toHaveAttribute('value', '1234.5');
  });

  it('takes the currency from the provider, and refuses to guess without one', () => {
    // An amount in a guessed currency is not a formatting mistake, it is a
    // different number.
    renderUi(<Numeric value={10} format="currency" />, {
      locale: 'en-US',
      formatting: { currency: 'USD' },
    });
    expect(screen.getByText('$10.00')).toBeInTheDocument();

    const { container } = renderUi(
      <Numeric value={10} format="currency" fallback="—" />,
      { locale: 'en-US' },
    );
    expect(container.textContent).toBe('—');
  });

  it('reads a percentage as a ratio unless told it is already in units', () => {
    // The difference is a factor of a hundred and is invisible in review.
    const { container, rerender } = renderUi(
      <Numeric value={0.15} format="percent" />,
      { locale: 'it-IT' },
    );
    expect(container.textContent).toBe('15%');

    rerender(<Numeric value={15} format="percent" scale="units" />);
    expect(container.textContent).toBe('15%');
  });

  it('has no violations', async () => {
    const { container } = renderUi(
      <Numeric value={1234.5} format="currency" currency="EUR" />,
      { locale: 'it-IT' },
    );

    await expectNoA11yViolations(container);
  });
});

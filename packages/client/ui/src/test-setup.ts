import { expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
// Load the token theme so components render with real values (contrast, radius…),
// plus the dark preset so `[data-theme='dark']` resolves in a11y/contrast tests.
import '@fmmenchi/tokens/styles/tailwind.css';
import '@fmmenchi/tokens/styles/presets/dark.css';

/**
 * Mask React's generated ids in snapshots.
 *
 * `useId` numbers its output from a per-render-root counter, so a snapshot
 * containing one breaks when a test is ADDED ABOVE it — the markup is
 * unchanged, only the counter moved. That failure teaches nothing and trains
 * people to re-record snapshots without reading them.
 *
 * Only the id VALUE is masked, never its presence: `id` and `for` still appear,
 * so a snapshot still fails if the wiring is dropped — and the tests that care
 * about the association assert the two match, which a snapshot cannot do
 * anyway. CSS-module hashes are deliberately NOT masked: those change when a
 * stylesheet changes, which is a real diff worth seeing.
 */
expect.addSnapshotSerializer({
  test: (value) => typeof value === 'string' && /^_r_[0-9a-z]+_$/.test(value),
  print: () => '"«react-id»"',
});

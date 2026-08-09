import { expect } from 'vitest';
import { configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Load the token values so components render with real ones (contrast, radius…),
// plus the dark preset so `[data-theme='dark']` resolves in a11y/contrast tests.
//
// `vars.css`, NOT `tailwind.css`, and that is the whole point: `tailwind.css`
// does `@import 'tailwindcss'`, which brings PREFLIGHT — a reset the shipped
// `dist/*.css` does not contain. With it loaded here the suite ran on a page
// every consumer of ours lacks, so a component that forgot `box-sizing` or
// `font-family: inherit` passed: Preflight had already set them. That is not a
// hypothetical — `git log -S 'font-family: inherit'` returns two commits and
// BOTH are fixes, never a `feat(`; the same holds for `box-sizing`. The values
// are all `vars.css` ever provided; the reset was the accident. (ADR-0022.)
import '@fmmenchi/tokens/styles/vars.css';
import '@fmmenchi/tokens/styles/presets/dark.css';

/*
 * `waitFor` AND `findBy*` GET A REAL BUDGET.
 *
 * Testing Library's default is 1s, which is generous in jsdom and thin in a
 * browser: every query here crosses into a real Chromium, four instances run in
 * parallel, and under the full gate they share the machine with a Storybook
 * build. A `waitFor` that gives up at 1s there is not reporting a broken
 * component, it is reporting a busy CPU.
 *
 * It costs nothing when things are working — `waitFor` returns on the first
 * poll that succeeds, so a longer ceiling only changes how long a genuine
 * failure takes to be reported.
 */
configure({ asyncUtilTimeout: 5_000 });

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

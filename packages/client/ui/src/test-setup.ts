import { beforeEach, expect } from 'vitest';
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

/*
 * THIS SUITE IS NOT AN act ENVIRONMENT, and saying so is the fix rather than a
 * silencing.
 *
 * Testing Library sets the flag to `true`, which is right when IT dispatches
 * the events: `fireEvent` wraps them in `act` and React sees a complete render
 * pass. Here almost nothing goes through `fireEvent` — measured, 32 of the test
 * files drive a real Chromium through the automation protocol and exactly one
 * uses `fireEvent`. React cannot see those updates as act-wrapped, because they
 * are not, so it warns: 702 times in a single CI run, from at least twelve
 * components.
 *
 * That flood is not free. It is what made a genuine failure unreadable for four
 * runs on `main` — the warnings buried the reporter's output and nothing named
 * a failing test.
 *
 * The flag is a claim about the ENVIRONMENT, not a preference, and the honest
 * value here is `false`.
 *
 * IN A `beforeEach`, and not at setup time, because Testing Library's auto
 * cleanup registers a `beforeAll` of its own that sets it back to `true` —
 * measured: assigning it here at import time changed nothing, 444 warnings
 * before and after. A hook is what runs late enough to be the last word.
 *
 * What it costs: nothing the suite actually does. Four files call `act` and all
 * four import it from `@testing-library/react`, which wraps the call in
 * `withGlobalActEnvironment` — it raises the flag itself for the duration and
 * restores it after, so the value set here never reaches those calls. Only a
 * direct `act` from `react` would warn, and nothing imports one. (An earlier
 * version of this comment claimed the opposite, and a count of one.)
 */
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = false;
});

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

import { beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import '@fmmenchi/tokens/styles/tailwind.css';
import '@fmmenchi/ui/style.css';

/*
 * THIS SUITE IS NOT AN act ENVIRONMENT EITHER.
 *
 * Same claim, same reason, and the same measurement as the design system's own
 * setup — see the long comment in `packages/client/ui/src/test-setup.ts`, which
 * is not repeated here. The short version: these tests drive a real Chromium
 * through `vitest/browser`, so React cannot see those updates as act-wrapped
 * because they are NOT, and it says so once per update.
 *
 * It says so 4270 times in a single local run of this project, from at least
 * fourteen components — `Formik`, `FormInput`, `Combobox`, `Field`,
 * `FormErrorSummary` leading — and 2132 times in the CI run of `main` that
 * found this, where they were every act warning in the whole workflow: the
 * design system's suite, which does make this declaration, contributed none.
 *
 * That flood is the same one that already buried a genuine failure for four
 * runs on `main` over in `ui`. The flag is a claim about the ENVIRONMENT, not a
 * preference, and the honest value here is `false`.
 *
 * IN A `beforeEach` for the reason given there: Testing Library's auto cleanup
 * registers a `beforeAll` that sets it back to `true`, so a hook is what runs
 * late enough to be the last word.
 *
 * What it costs: nothing this suite uses. `act` imported from
 * `@testing-library/react` is unaffected — it raises the flag itself for the
 * duration of the call and restores it — and only a direct `act` from `react`
 * would warn. Neither appears in this project.
 */
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = false;
});

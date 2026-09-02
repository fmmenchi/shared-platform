import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  FIRST_STEP,
  STEPS,
  STEPS_PREFIX,
  pathOf,
  slugOf,
  statusOf,
  stepPath,
} from '../app/steps';

/**
 * THE ROUTE TABLE AND THE STEP LIST ARE THE SAME FACT, WRITTEN TWICE.
 *
 * `routes.tsx` is read by React Router's config at BUILD time, so it cannot loop
 * over a runtime array — and a `route()` per step generated from `STEPS` would make
 * the route table invisible to anyone opening the file. The duplication is kept on
 * purpose and paid for here: one assertion, so a step added to the list without a
 * route (or the reverse) fails instead of shipping a stepper that counts to five on
 * a wizard of four.
 */
const routesSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../app/routes.tsx'),
  'utf8',
);

/**
 * Every child of the wizard layout, in the order the file declares them — read off
 * the route PATH and not the module filename.
 *
 * It used to read the filename, which was the same string until it was not: the slug
 * became `brand-colours` while the module was still `colours.tsx`, and the assertion
 * then compared a file against a list of paths. The path is the fact this file exists
 * to hold. (The module was renamed to match anyway, because two names for one step is
 * one more than anybody needs.)
 */
function declaredSteps(): string[] {
  const layout = routesSource.slice(
    routesSource.indexOf('layout('),
    routesSource.indexOf(']),'),
  );
  return [
    ...layout.matchAll(/route\(\s*'([^']+)',\s*'\.\/routes\/steps\//g),
  ].map((m) => (m[1] as string).replace(`${STEPS_PREFIX}/`, ''));
}

describe('the wizard steps', () => {
  it('declares a route for every step, in the same order', () => {
    expect(declaredSteps()).toEqual(STEPS.map((step) => step.slug));
  });

  it('gives EVERY step a path, including the first', () => {
    // Step one used to be the index route, at `/`. Three things were wrong with it:
    // `slugOf` fell back to the first step for anything unrecognised, so `/` and
    // `/nonsense` were the same answer; the sidebar's "Build" link pointed there too,
    // so two nav items shared one page and both carried `aria-current` (measured in a
    // browser: two current pages announced in one nav, on every step); and step one
    // was the only step nobody could link to by name.
    for (const step of STEPS) {
      expect(pathOf(step)).toBe(`/${STEPS_PREFIX}/${step.slug}`);
    }
  });

  it('makes `/` a redirect into the sequence rather than a step', () => {
    // A loader redirect REPLACES, so it costs no history entry — which was the one
    // real objection to moving step one off the index.
    expect(routesSource).toContain("index('./routes/index.tsx')");
    expect(routesSource).not.toContain("index('./routes/steps/");
  });

  it('resolves a step by name, and THROWS on one that does not exist', () => {
    // For the buttons between steps, which used to write `to="/palette"` by hand
    // while the nav went through `pathOf` — two sources of truth for where a step
    // lives, and the literals were the half that would not move when the routes did.
    expect(stepPath(FIRST_STEP.slug)).toBe(pathOf(FIRST_STEP));
    expect(() => stepPath('colours')).toThrow(/No wizard step named "colours"/);
  });
});

describe('slugOf', () => {
  it('reads the step out of a pathname, with or without the prefix', () => {
    expect(slugOf(`/${STEPS_PREFIX}/palette`)).toBe('palette');
    expect(slugOf(`/${STEPS_PREFIX}/palette/`)).toBe('palette');
    expect(slugOf(`/${STEPS_PREFIX}/brand-colours`)).toBe('brand-colours');
  });

  it('answers with the FIRST step for anything unknown', () => {
    // Chrome that crashes a page over a URL it did not expect is worse than chrome
    // that points at the beginning. `/` is no longer one of these — it redirects —
    // so the fallback now means only what it says.
    expect(slugOf('/nope')).toBe(FIRST_STEP.slug);
    expect(slugOf('')).toBe(FIRST_STEP.slug);
  });
});

describe('statusOf', () => {
  it('is complete behind, current here, upcoming ahead', () => {
    // The words are the DESIGN SYSTEM'S — `StepperItemStatus` — not this app's, so
    // they are asserted here rather than aliased: a rename upstream should fail a
    // test in the app that renders it, not slip through a translation layer.
    const at = STEPS[2] as (typeof STEPS)[number];

    expect(statusOf(STEPS[0] as typeof at, at.slug)).toBe('complete');
    expect(statusOf(STEPS[1] as typeof at, at.slug)).toBe('complete');
    expect(statusOf(at, at.slug)).toBe('current');
    expect(statusOf(STEPS[3] as typeof at, at.slug)).toBe('upcoming');
  });

  it('never returns `error`, because position cannot know about failure', () => {
    // The honest limit of deriving status from position, asserted so a later commit
    // that starts keeping wizard state has to come back here on purpose.
    for (const step of STEPS) {
      for (const at of STEPS) {
        expect(statusOf(step, at.slug)).not.toBe('error');
      }
    }
  });

  it('marks exactly one step current, wherever you are', () => {
    for (const step of STEPS) {
      const currents = STEPS.filter(
        (s) => statusOf(s, step.slug) === 'current',
      );
      expect(currents, `at ${step.slug}`).toHaveLength(1);
    }
  });

  it('treats an unknown position as before everything', () => {
    // Paired with `slugOf`, which never returns one — this is the guard for a
    // caller that does not go through it.
    for (const step of STEPS) {
      expect(statusOf(step, 'nope')).toBe('upcoming');
    }
  });
});

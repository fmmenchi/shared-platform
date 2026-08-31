import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { FIRST_STEP, STEPS, pathOf, slugOf, statusOf } from '../app/steps';

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

/** Every child of the wizard layout, in the order the file declares them. */
function declaredSteps(): string[] {
  const layout = routesSource.slice(
    routesSource.indexOf('layout('),
    routesSource.indexOf(']),'),
  );
  return [
    ...layout.matchAll(
      /(?:index|route)\(\s*(?:'([^']+)',\s*)?'\.\/routes\/steps\/([a-z-]+)\.tsx'/g,
    ),
  ].map((m) => m[2] as string);
}

describe('the wizard steps', () => {
  it('declares a route for every step, in the same order', () => {
    expect(declaredSteps()).toEqual(STEPS.map((step) => step.slug));
  });

  it('gives the FIRST step the index route, so landing on the app is step one', () => {
    // A redirect from `/` to `/colours` would put two URLs in the history for one
    // page, and the back button would then bounce.
    expect(pathOf(FIRST_STEP)).toBe('/');
    expect(routesSource).toContain(
      `index('./routes/steps/${FIRST_STEP.slug}.tsx')`,
    );
  });

  it('gives every other step its slug as a path', () => {
    for (const step of STEPS.slice(1)) {
      expect(pathOf(step)).toBe(`/${step.slug}`);
    }
  });
});

describe('slugOf', () => {
  it('reads the step out of a pathname', () => {
    expect(slugOf('/palette')).toBe('palette');
    expect(slugOf('/palette/')).toBe('palette');
  });

  it('answers with the FIRST step for the index, and for anything unknown', () => {
    // Chrome that crashes a page over a URL it did not expect is worse than chrome
    // that points at the beginning.
    expect(slugOf('/')).toBe(FIRST_STEP.slug);
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

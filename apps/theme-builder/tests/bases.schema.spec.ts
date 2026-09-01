import { PALETTE_FAMILIES } from '@fmmenchi/theme';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';
import { makeBasesSchema } from '../app/bases.schema';
import { hydrateDeclarations } from '../app/declarations';
import { readDeclarations } from '../app/declarations.server';

/**
 * WHAT THIS SUITE IS FOR.
 *
 * The schema's second rule generates a whole theme from seven colours and asks the
 * same validator CI asks — so it is the one piece of this wizard that can be wrong
 * in a way a person would only find by shipping a brand nobody can read. It is also
 * the one that can be wrong in the other direction, refusing a palette that is
 * fine, which is worse: a builder that says no to the house's own colours is a
 * builder nobody trusts.
 *
 * So: the shipped bases must PASS, and a deliberately broken set must fail on the
 * FIELD a person can change.
 */
/**
 * THE REAL CONTRACT, READ FROM THE REAL STYLESHEET, and that is the point of doing
 * it this way rather than with a fixture. A hand-built placements map would make
 * every assertion below a statement about the fixture: "the shipped brand passes"
 * only means something if the roles and the greys are the ones that ship.
 */
const schema = makeBasesSchema(hydrateDeclarations(readDeclarations()).light);

const issuesOf = (values: Record<string, string>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues;
};

const messagesFor = (values: Record<string, string>, field: string) =>
  issuesOf(values)
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);

describe('the bases schema', () => {
  it('ACCEPTS the shipped brand', () => {
    // The most important assertion here. A builder that refuses the theme it was
    // built from is broken in a way no amount of "it validates" makes up for — and
    // it would be refusing it on the strength of a whole generated theme, so this
    // also proves the generate-and-measure path end to end.
    const issues = issuesOf({ ...REFERENCE_BASES });

    expect(
      issues,
      issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('\n'),
    ).toEqual([]);
  });

  it('refuses a value the picker could not have produced', () => {
    expect(
      messagesFor({ ...REFERENCE_BASES, primary: 'red' }, 'primary'),
    ).toEqual([expect.stringContaining('six hex digits')]);
  });

  it('does NOT refuse two families for being similar', () => {
    // Recorded as an assertion because the rule that would have refused this was
    // written, measured against the shipped brand, and removed. `primary` and
    // `info` sit 0.0388 apart in OKLCH — both blue, on purpose — so a "far enough
    // apart" threshold either means nothing or refuses the theme this builder was
    // built from. The distance between two families is a designer's business.
    const clash = { ...REFERENCE_BASES, success: REFERENCE_BASES.accent };

    expect(issuesOf(clash)).toEqual([]);
  });

  it('ACCEPTS any base, because lightness is anchored absolutely', () => {
    // Measured, and it is the ADR-0033 choice paying off rather than a gap in the
    // schema. Every rung states its own lightness, so a pale base and a dark one
    // produce rungs at the SAME lightness — which is what makes a contrast
    // guarantee hold across brands instead of moving with each one. A pale yellow
    // primary therefore yields a readable theme, and refusing it would be wrong.
    for (const primary of ['#ffe680', '#000000', '#ffffff', '#ff00ff']) {
      const issues = issuesOf({ ...REFERENCE_BASES, primary });
      expect(
        issues,
        `${primary}: ${issues.map((i) => i.message).join('; ')}`,
      ).toEqual([]);
    }
  });

  it('generates a theme at all — the greys come from the stylesheet', () => {
    // The defect this pins: 34 of the 84 roles point at the `neutral` family, which
    // `generatePalette` cannot produce because the greys are STATED (ADR-0032). Read
    // rather than generated, or `generateTheme` throws for every possible input —
    // measured, including on the shipped bases.
    expect(issuesOf({ ...REFERENCE_BASES })).toEqual([]);
  });

  it('asks about every family the contract has', () => {
    // A family added to `PALETTE_FAMILIES` must reach this form, and the shape is
    // built from that array precisely so it cannot be forgotten. Dropping one is
    // the failure this catches.
    const missing = { ...REFERENCE_BASES } as Record<string, string>;
    delete missing[PALETTE_FAMILIES[0] as string];

    expect(issuesOf(missing).length).toBeGreaterThan(0);
  });
});

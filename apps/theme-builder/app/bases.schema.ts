import {
  colorVar,
  generateTheme,
  validateTheme,
  PALETTE_FAMILIES,
  type ColorRole,
  type Declarations,
  type PaletteFamily,
} from '@fmmenchi/theme';
import { z } from 'zod';

import { WIZARD_RAMP } from './ramp';

/**
 * WHAT A SCHEMA CAN SAY ABOUT SEVEN COLOURS, AND WHAT IT CANNOT.
 *
 * Three rules were considered. Two were dropped after measuring, and the reasons
 * are the useful part of this file.
 *
 * NOT "required". `<input type="color">` reports `#000000` before anyone touches
 * it, so an untouched field is indistinguishable from a deliberate black: the rule
 * would either never fire or fire on a legitimate answer.
 *
 * NOT "in gamut". A hex IS sRGB by definition — every value this control can
 * produce is displayable. The gamut question lives one level down, where a base's
 * RAMP may clamp, and `generatePalette` already handles it by holding lightness and
 * giving up chroma.
 *
 * AND NOT "two families must be far enough apart to tell apart", which is the one
 * worth recording because it sounded right and is not. Measured against the shipped
 * brand, `primary` and `info` sit 0.0388 apart in OKLCH — they are both blue, on
 * purpose, because "primary" and "informational" are allowed to be the same kind of
 * colour. A threshold that accepted the house's own palette would have to be under
 * a few JNDs, which means nothing; one that meant something would refuse the theme
 * this builder was built from. So the rule is gone rather than tuned, and the
 * distance between two families is a designer's business.
 *
 * WHAT IS LEFT generates the whole theme these colours produce and asks the same
 * validator CI asks — the one rule here that does something no generic form
 * validation could.
 *
 * AND IT PASSES FOR EVERY BASE TRIED — pale yellow, black, white, saturated
 * magenta. That is worth stating plainly rather than leaving as an impression of
 * strictness: it is ADR-0033 paying off, not a gap. Every rung states its own
 * lightness absolutely and `generatePalette` clamps chroma while holding it, so the
 * contrast of a pair is a property of the RAMP and not of the brand colour. The
 * guarantee holds by construction.
 *
 * So this is a guarantee-CHECKER rather than a gate a person is expected to trip. It
 * earns its place the day the ramp, the aliases or a contrast pair change in a way
 * that breaks the construction — which is precisely when nobody would think to look,
 * and when a wizard silently shipping unreadable themes is the alternative.
 */

/** A colour the control can actually produce: lowercase six-digit hex. */
const hex = z
  .string()
  .regex(
    /^#[0-9a-f]{6}$/,
    'Not a colour the picker can hold — six hex digits, lowercase.',
  );

const shape = Object.fromEntries(
  PALETTE_FAMILIES.map((family) => [family, hex]),
) as Record<PaletteFamily, typeof hex>;

const basesObject = z.object(shape);

/**
 * The seven fields, named by the families. Derived from the object schema, so a
 * family added to the contract changes this type without an edit here.
 */
export type BasesValues = z.infer<typeof basesObject>;

/**
 * WHICH FIELD TO BLAME FOR A ROLE — the app's own question, answered from the
 * declarations it already has.
 *
 * A violation names roles; a person can only change one of seven brand colours. So
 * something has to get from `--fm-color-destructive-hover` back to the `negative`
 * field, and NAME MATCHING CANNOT DO IT: the role vocabulary and the palette
 * vocabulary do not coincide. `destructive` and `error` are both roles, and both
 * point at the `negative` family — measured, and they are exactly the colours a
 * person is most likely to get wrong.
 *
 * So it reads the declaration. A substring test rather than a parse, deliberately:
 * `@fmmenchi/theme` has the real reader and it is internal now, and a second regex
 * here would be a second thing to keep right. This one only has to decide which of
 * seven fields is implicated, and being loose costs nothing — a role that mentions
 * no family lands on the form instead of on a field, which is the correct place for
 * a violation nobody can attribute.
 */
const familyOf = (
  declared: Declarations,
  role: ColorRole,
): PaletteFamily | undefined => {
  const value = declared.get(colorVar(role));
  if (value === undefined) return undefined;

  return PALETTE_FAMILIES.find((family) =>
    value.includes(`--fm-palette-${family}-`),
  );
};

/**
 * The seven bases, and whether they make a theme that can be read.
 *
 * A FACTORY RATHER THAN A CONSTANT, because it needs the design system's own
 * declarations — which rung each role points at, and the greys no brand supplies
 * (ADR-0032) — and those are read from `vars.css` by the wizard's layout route and
 * handed down. An earlier version imported them from JSON artefacts emitted into
 * `@fmmenchi/tokens`; that put emitters in an artefact package and made the data do a
 * round trip through disk for no reason. See `declarations.server.ts`.
 *
 * `superRefine` rather than a rule per field, because a contrast floor is a fact
 * about a PAIR of roles rather than about one colour — and the pair may span two
 * families.
 */
export function makeBasesSchema(declared: Declarations) {
  return basesObject.superRefine((values, ctx) => {
    const bases = values as Record<PaletteFamily, string>;

    let theme;
    try {
      // ONE CALL. `generateTheme` reads the aliases and the stated greys out of the
      // declarations and generates the brand's ramps itself — the app assembled that
      // by hand for a while and got it wrong, omitting the greys, which made every
      // set of bases fail.
      theme = generateTheme(declared, bases, WIZARD_RAMP);
    } catch (error) {
      // A rung the ramp does not reach. Not attributable to one field, so it goes
      // on the form rather than being pinned to a colour that may be blameless.
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: `These colours do not make a theme: ${(error as Error).message}`,
      });
      return;
    }

    const violations = validateTheme(theme);
    if (violations.length === 0) return;

    // ATTRIBUTED BACK TO A FIELD, which is what makes a message useful rather than
    // merely true. Anything that cannot be traced to one of the seven lands on the
    // form.
    //
    // Deduplicated, because one bad base breaks several pairs at once — fill ×
    // foreground, hover × foreground, active × foreground — and the same sentence
    // three times reads as three problems.
    const seen = new Set<string>();
    for (const violation of violations) {
      const roles = violation.pair ?? (violation.role ? [violation.role] : []);
      const target = roles
        .map((role) => familyOf(declared, role as ColorRole))
        .find((family) => family !== undefined && family in bases);

      const key = `${target ?? ''}:${violation.message}`;
      if (seen.has(key)) continue;
      seen.add(key);

      ctx.addIssue({
        code: 'custom',
        path: target ? [target] : [],
        message: violation.message,
      });
    }
  });
}

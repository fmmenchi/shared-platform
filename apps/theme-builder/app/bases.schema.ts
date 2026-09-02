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

import { DARK_REFERENCE_RAMP, REFERENCE_RAMP } from './ramp';

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
 * The seven FIELDS, named by the families. Derived from the object schema, so a
 * family added to the contract changes this type without an edit here.
 */
export type BasesValues = z.infer<typeof basesObject>;

/** One scheme's worth of colours, which is what the store holds per theme. */
export type SchemeBases = z.infer<typeof basesObject>;

/**
 * THE SHAPE ALONE — seven lowercase hexes, none of the set-level checks.
 *
 * This is what the live write into the store asks before it writes (`live-bases.tsx`):
 * the objection on record against a store that accepts colours as they change was
 * about writing an UNCHECKED value into it, and this is the check that objection was
 * actually about. The contrast floors are a different question — whether these seven
 * make a theme that can be READ — and that one stays on submit, in `makeBasesSchema`,
 * where it gates the advance to step two rather than the write. A theme that fails a
 * floor is still a theme, and the preview rail exists to show it failing.
 */
export function parseBasesShape(values: unknown) {
  return basesObject.safeParse(values);
}

/**
 * THE DARK SEVEN ARE CHECKED, NOT TYPED IN HERE, and the split is the design system's
 * own instruction rather than a shortcut.
 *
 * They live on the same step — they are brand colours, and a person answers "what are
 * your brand colours" once — but they are STORE-BACKED pickers rather than form
 * fields, because they have an action beside them: "re-derive from the light ones",
 * which only means anything against live values. `FormColorPicker` omits `onChange`
 * and `value` on purpose ("the call site winning `onChange` does not override the
 * binding, it severs it") and tells a caller what to do instead: compose `Field` and
 * the control and bind them yourself. That is what step one does for the dark set.
 *
 * So the dark colours reach this schema as a VALUE, closed over, and their violations
 * land on the form rather than on a specific picker. That is the cost, stated: a dark
 * problem names the family in its message but the error summary cannot link to the
 * swatch. Worth it against the alternative, which was asking for the same colours on
 * two different steps.
 */

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
export function makeBasesSchema(
  declared: Declarations,
  darkDeclared: Declarations,
  darkBases: Record<PaletteFamily, string>,
) {
  return basesObject.superRefine((values, ctx) => {
    // BOTH THEMES, EACH AGAINST ITS OWN ALIAS MAP AND ITS OWN RAMP. Checking the dark
    // seven against light's map would generate a theme that validates and looks
    // wrong: `-subtle` points at the 1400 there and at the 50 here, so the pair being
    // measured would not be the pair a person sees.
    refineScheme(
      ctx,
      'light',
      values as Record<PaletteFamily, string>,
      declared,
      REFERENCE_RAMP,
      true,
    );
    refineScheme(
      ctx,
      'dark',
      darkBases,
      darkDeclared,
      DARK_REFERENCE_RAMP,
      false,
    );
  });
}

/**
 * One scheme's worth of checking, and the reason it is a function is that the two
 * halves must not share a `seen` set: the same message from light and from dark is
 * two problems, on two different fields, and deduplicating across them would hide
 * one.
 */
function refineScheme(
  ctx: z.RefinementCtx,
  scheme: 'light' | 'dark',
  bases: Record<PaletteFamily, string>,
  declared: Declarations,
  ramp: typeof REFERENCE_RAMP,
  /** Whether these colours are FIELDS, and can therefore be blamed individually. */
  attributable: boolean,
) {
  let theme;
  try {
    // ONE CALL. `generateTheme` reads the aliases and the stated greys out of the
    // declarations and generates the brand's ramps itself — the app assembled that
    // by hand for a while and got it wrong, omitting the greys, which made every
    // set of bases fail.
    theme = generateTheme(declared, bases, ramp);
  } catch (error) {
    // A rung the ramp does not reach, or a value that is not a colour at all. Not
    // attributable to one field either way — and for the DARK set there is no field
    // to attribute to — so it goes on the form.
    ctx.addIssue({
      code: 'custom',
      path: [],
      message: `These ${scheme} colours do not make a theme: ${(error as Error).message}`,
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
      // NAMED BY SCHEME AND FAMILY, so the error summary links to the field that
      // can actually be changed — `dark.warning` and not `warning`, which would
      // point at the light picker for a dark problem.
      path: target ? [scheme, target] : [scheme],
      message: `${scheme}: ${violation.message}`,
    });
  }
}

/**
 * The role contract as SOLVER INPUT: what each role must satisfy, and how it is
 * placed.
 *
 * `CONTRAST_PAIRS` already says what must be true of a finished theme — which
 * pairs are measured and to what floor. It says nothing about how a value is
 * arrived at, which is the difference between checking a theme and building one.
 * A solver needs both, and needs them to agree, so the floors here are READ FROM
 * `CONTRAST_PAIRS` rather than restated: a pair added there is a pair this table
 * enforces, with nothing to keep in step by hand.
 *
 * Placements are declared PER SUFFIX, not per role. Eight action suffixes and
 * five status ones cover 52 of the roles, and a suffix is where the rule
 * actually lives — `-hover` means the same thing in every family, which is why
 * the shipped palette places it identically in all of them.
 */
import {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
} from './tokens.js';
import type { ColorRole } from './tokens.types.js';
import { CONTRAST_PAIRS } from './validate.js';
import type { Constraint, Floor, Placement } from './validate.types.js';

/** APCA judges reading, so it applies to the text pairs and not to rings. */
const TEXT_RATIO = 4.5;
const APCA_FLOOR = 45;

/**
 * How each action suffix is placed, read off the shipped palette.
 *
 * `primary` in the base theme is the worked example: fill 700, `-hover` 800,
 * `-active` 900, `-subtle` 100, `-subtle-foreground` 800, `-disabled` 200,
 * `-disabled-foreground` 100, and `-foreground` the neutral scale's light end.
 * So hover and active are one and two rungs from the fill, the wash is the far
 * end, and the wash's text is searched for rather than fixed.
 */
const ACTION_PLACEMENT: Readonly<Record<string, Placement>> = {
  '': { kind: 'anchor' },
  '-foreground': { kind: 'ink' },
  '-hover': { kind: 'offset', from: '', rungs: 1 },
  '-active': { kind: 'offset', from: '', rungs: 2 },
  '-subtle': { kind: 'search', toward: 'surface' },
  '-subtle-foreground': { kind: 'search', toward: 'ink' },
  // WCAG 1.4.3 exempts disabled controls, so these are placed but not measured.
  '-disabled': { kind: 'exempt', toward: 'surface' },
  '-disabled-foreground': { kind: 'exempt', toward: 'surface' },
};

/**
 * Status families have no hover or active — a status is not pressed — so their
 * suffixes are fewer and their wash carries a border instead.
 */
const STATUS_PLACEMENT: Readonly<Record<string, Placement>> = {
  '': { kind: 'anchor' },
  '-foreground': { kind: 'ink' },
  '-subtle': { kind: 'search', toward: 'surface' },
  '-subtle-foreground': { kind: 'search', toward: 'ink' },
  '-border': { kind: 'search', toward: 'ink' },
};

/**
 * EVERY floor a role is under, taken from the declared pairs.
 *
 * All of them, because a role is routinely under several — `primary` owes 3:1
 * against `background`, `muted` and `primary-subtle` alike. Returning the first
 * match would let a solver satisfy one and break the rest.
 */
function floorsFor(role: ColorRole): readonly Floor[] {
  return CONTRAST_PAIRS.filter(([, fg]) => fg === role).map(
    ([bg, , minimum]): Floor => ({
      against: bg,
      ratio: minimum,
      lc: minimum === TEXT_RATIO ? APCA_FLOOR : null,
    }),
  );
}

/**
 * Every role a family declares, with its floors and its placement.
 *
 * Only the family roles: the surface ones (`background`, `link`, `ring`, …) draw
 * from the whole palette by a decision rather than a rule, which is what
 * `ThemeSpec.pins` is for, and inventing a placement for them here would turn one
 * theme's current choices into a rule for every theme built afterwards.
 */
export const FAMILY_CONSTRAINTS: readonly Constraint[] = [
  ...ACTION_FAMILIES.flatMap((family) =>
    ACTION_SUFFIXES.map((suffix): Constraint => {
      const role = `${family}${suffix}` as ColorRole;
      const placement = ACTION_PLACEMENT[suffix];
      if (placement === undefined) {
        throw new Error(`no placement declared for action suffix "${suffix}"`);
      }
      return { role, floors: floorsFor(role), placement };
    }),
  ),
  ...STATUS_FAMILIES.flatMap((family) =>
    STATUS_SUFFIXES.map((suffix): Constraint => {
      const role = `${family}${suffix}` as ColorRole;
      const placement = STATUS_PLACEMENT[suffix];
      if (placement === undefined) {
        throw new Error(`no placement declared for status suffix "${suffix}"`);
      }
      return { role, floors: floorsFor(role), placement };
    }),
  ),
];

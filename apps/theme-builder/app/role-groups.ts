import {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  COLOR_ROLES,
  CONTRAST_PAIRS,
  INPUT_ROLES,
  NEUTRAL_ROLES,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
  SURFACE_ROLES,
  type ColorRole,
} from '@fmmenchi/theme';

/**
 * THE 84 ROLES, IN THE CONTRACT'S OWN GROUPS — not in categories invented here.
 *
 * `COLOR_ROLES` is assembled from exactly these pieces: four action families times
 * eight suffixes, four status families times five, then the neutral, surface and
 * input sets. 32 + 20 + 7 + 17 + 8 = 84. So grouping by that construction cannot
 * overlap, cannot orphan a role, and cannot drift: a family or a suffix added to the
 * contract lands in the right group with no edit here. `role-groups.spec.ts` asserts
 * exactly that, because "cannot" is worth checking.
 *
 * ONE FLAT TABLE OF 84 ROWS WAS THE FIRST VERSION, and it was the wrong shape twice
 * over: nothing said which roles belonged together, and nothing said what a role is
 * FOR. A role's purpose is the pairing it appears in — `primary` exists to be a fill
 * that `primary-foreground` sits on — so the pairs are the subject and the roles are
 * the knobs.
 */
export interface RoleGroup {
  readonly title: string;
  /** Why this group exists, in a sentence a person can act on. */
  readonly note: string;
  readonly roles: readonly ColorRole[];
  /** The declared pairs whose BACKGROUND is in this group. */
  readonly pairs: ReadonlyArray<
    readonly [bg: ColorRole, fg: ColorRole, minimum: number]
  >;
}

const familyRoles = (
  family: string,
  suffixes: readonly string[],
): readonly ColorRole[] =>
  suffixes.map((suffix) => `${family}${suffix}` as ColorRole);

/** Assigned by BACKGROUND, because a pair is a thing sitting ON a surface. */
const pairsFor = (roles: readonly ColorRole[]) => {
  const owned = new Set<string>(roles);
  return CONTRAST_PAIRS.filter(([bg]) => owned.has(bg));
};

const group = (
  title: string,
  note: string,
  roles: readonly ColorRole[],
): RoleGroup => ({ title, note, roles, pairs: pairsFor(roles) });

export const ROLE_GROUPS: readonly RoleGroup[] = [
  ...ACTION_FAMILIES.map((family) =>
    group(
      family,
      // The action families carry hover and active, which the status ones do not —
      // that is the difference between something you press and something you read.
      `A thing you press. The fill, the text on it, its hover and active, and the quiet wash for a low-emphasis version.`,
      familyRoles(family, ACTION_SUFFIXES),
    ),
  ),
  ...STATUS_FAMILIES.map((family) =>
    group(
      family,
      `A thing you read. No hover or active — a status is not pressed — but it carries a border, because a wash alone is not a boundary.`,
      familyRoles(family, STATUS_SUFFIXES),
    ),
  ),
  group(
    'neutral',
    'The grey action family, plus the disabled pair every family falls back to.',
    NEUTRAL_ROLES,
  ),
  group(
    'surfaces, text & focus',
    'The page itself, the raised surfaces on it, and the ring that has to clear 3:1 on every one of them.',
    SURFACE_ROLES,
  ),
  group(
    'form controls',
    'A field at rest, hovered, focused, invalid and disabled — and its border, which is a non-text boundary at 3:1.',
    INPUT_ROLES,
  ),
];

/** Pairs no group claimed. Empty today; rendered rather than dropped if it fills. */
export const UNGROUPED_PAIRS = CONTRAST_PAIRS.filter(
  ([bg]) => !ROLE_GROUPS.some((g) => g.roles.includes(bg)),
);

/** Roles no group claimed. Same reason. */
export const UNGROUPED_ROLES = COLOR_ROLES.filter(
  (role) => !ROLE_GROUPS.some((g) => g.roles.includes(role)),
);

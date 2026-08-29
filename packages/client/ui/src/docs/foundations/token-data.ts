import {
  ACTION_FAMILIES,
  COLOR_ROLES,
  STATUS_FAMILIES,
  colorVar,
  type ColorRole,
} from '@fmmenchi/tokens';
import type { ColorPair, RoleEntry, RoleGroup } from './token-data.types.js';

/**
 * The token CONTRACT, arranged for a page to lay out — never a copy of it.
 *
 * Every list here is DERIVED from `@fmmenchi/tokens`: the names come from
 * `COLOR_ROLES`, the families from `ACTION_FAMILIES` and `STATUS_FAMILIES`.
 * Nothing is written out by hand, because a hand-written list is a second
 * source of truth and the first token to move makes it a lie — which is the
 * failure mode of a docs page that looks maintained and is not.
 *
 * VALUES are deliberately absent. They live in `styles/vars.css` as
 * `var(--fm-*)` and a preset overrides them, so a page that hard-codes one is
 * documenting a theme it may not be showing. The specimens read them from the
 * DOM instead, in whichever theme is actually on screen.
 */

const entry = (role: ColorRole): RoleEntry => ({
  role,
  property: colorVar(role),
});

/** Roles belonging to `family`: the bare name and its `family-*` suffixes. */
function familyRoles(family: string): RoleEntry[] {
  return COLOR_ROLES.filter(
    (role) => role === family || role.startsWith(`${family}-`),
  ).map(entry);
}

/**
 * The leading segment of a role name — `card-foreground` → `card`.
 *
 * Used only for what is left after the declared families, because that
 * remainder has no structure of its own to read. Deriving it shows the shape
 * honestly: some groups come out as a pair (`card`, `card-foreground`), some as
 * a single (`ring`, `scrim`) — and a group of one is a colour that was needed
 * once and named, not an omission.
 */
const prefixOf = (role: string): string => role.split('-')[0] ?? role;

export function actionGroups(): RoleGroup[] {
  return ACTION_FAMILIES.map((family) => ({
    name: family,
    entries: familyRoles(family),
  }));
}

export function statusGroups(): RoleGroup[] {
  return STATUS_FAMILIES.map((family) => ({
    name: family,
    entries: familyRoles(family),
  }));
}

/**
 * Everything the two family lists do not claim — surfaces, inputs, neutrals —
 * grouped by prefix, widest strip first.
 */
export function remainingGroups(): RoleGroup[] {
  const claimed = new Set<string>(
    [...actionGroups(), ...statusGroups()].flatMap((group) =>
      group.entries.map((item) => item.role),
    ),
  );

  const groups = new Map<string, RoleEntry[]>();
  for (const role of COLOR_ROLES) {
    if (claimed.has(role)) continue;
    const name = prefixOf(role);
    groups.set(name, [...(groups.get(name) ?? []), entry(role)]);
  }

  return [...groups]
    .map(([name, entries]) => ({ name, entries }))
    .sort(
      (a, b) =>
        b.entries.length - a.entries.length || a.name.localeCompare(b.name),
    );
}

/**
 * The pairs the contract actually declares: a role, and the ink named for it.
 *
 * The rule is that `${role}-foreground` exists — which finds every pair in the
 * system except one. `background`/`foreground` are the page itself, named
 * before that convention existed, so they are stated rather than derived. That
 * is the only exception, and saying so is cheaper than a lookup table that
 * would go stale.
 *
 * `exempt` marks the disabled pairs: WCAG 1.4.3 excludes them from the minimum.
 * They are still shown, because a number nobody is allowed to hide is how you
 * notice one that has drifted well past "low on purpose".
 */
export function declaredPairs(): ColorPair[] {
  const roles = new Set<string>(COLOR_ROLES);

  const derived: ColorPair[] = COLOR_ROLES.filter(
    (role) => !role.endsWith('-foreground') && roles.has(`${role}-foreground`),
  ).map((role) => ({
    background: role,
    foreground: `${role}-foreground` as ColorRole,
    exempt: role.includes('disabled'),
  }));

  return [
    { background: 'background', foreground: 'foreground', exempt: false },
    ...derived,
  ];
}

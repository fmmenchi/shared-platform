import {
  ACTION_FAMILIES,
  COLOR_ROLES,
  STATUS_FAMILIES,
  colorVar,
  type ColorRole,
} from '@fmmenchi/tokens';
import type {
  ColorPair,
  HueFamily,
  RoleEntry,
  RoleGroup,
  Shade,
} from './token-data.types.js';

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

/** Every colour property, for a page that wants the whole set at once. */
export const ALL_COLOR_PROPERTIES: readonly string[] =
  COLOR_ROLES.map(colorVar);

/**
 * `oklch(L C H)` → its three numbers, or null for anything else.
 *
 * Chromium serialises a registered `<color>` back in the notation it was
 * authored in, which for every value here is `oklch()` — verified by reading
 * the computed values off the page rather than assumed. Anything that does not
 * parse is skipped rather than guessed at: a palette with one silently wrong
 * entry is worse than one that is visibly short.
 */
export function parseOklch(
  value: string,
): { lightness: number; chroma: number; hue: number } | null {
  const match = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i.exec(
    value.trim(),
  );
  if (match === null) return null;

  const [, l = '', c = '', h = ''] = match;
  const raw = Number(l);
  return {
    // Authored as `41%`, serialised as `0.41` — both appear depending on where
    // the string came from, so anything above 1 is read as a percentage.
    lightness: raw > 1 ? raw / 100 : raw,
    chroma: Number(c),
    hue: Number(h),
  };
}

/** Chroma below which a colour is grey and its hue angle means nothing. */
const NEUTRAL_CHROMA = 0.03;

/** Hues within this many degrees are the same family. */
const HUE_TOLERANCE = 8;

/**
 * THE PALETTE, RECONSTRUCTED.
 *
 * There is no primitive palette file to show: `vars.css` says so itself — the
 * values are static `oklch` literals resolved AT AUTHORING TIME from the ramp
 * methodology, so the ramp was applied by hand and never became code. The
 * closest true thing is therefore this: take every semantic value, group it by
 * hue and order it by lightness, and the palette that is actually in use falls
 * out.
 *
 * It is also the more honest artefact. A primitives file would say what was
 * intended; this says what is shipped — including that several roles resolve to
 * the SAME value, which is why each shade carries the list of roles that share
 * it rather than pretending to be one.
 */
export function hueFamilies(values: Record<string, string>): HueFamily[] {
  const byValue = new Map<string, Shade>();

  for (const role of COLOR_ROLES) {
    const value = values[colorVar(role)] ?? '';
    const parsed = parseOklch(value);
    if (parsed === null) continue;

    const existing = byValue.get(value);
    if (existing === undefined) {
      byValue.set(value, { value, ...parsed, roles: [role] });
    } else {
      existing.roles.push(role);
    }
  }

  const families: HueFamily[] = [];
  for (const shade of byValue.values()) {
    const neutral = shade.chroma < NEUTRAL_CHROMA;
    const family = families.find(
      (candidate) =>
        candidate.neutral === neutral &&
        (neutral || Math.abs(candidate.hue - shade.hue) <= HUE_TOLERANCE),
    );
    if (family === undefined) {
      families.push({ hue: shade.hue, neutral, shades: [shade] });
    } else {
      family.shades.push(shade);
    }
  }

  for (const family of families) {
    family.shades.sort((a, b) => b.lightness - a.lightness);
  }

  // Neutrals last: they are the longest ramp and the least interesting one to
  // land on first.
  return families.sort(
    (a, b) => Number(a.neutral) - Number(b.neutral) || a.hue - b.hue,
  );
}

/*
 * The groups, computed ONCE.
 *
 * The contract is static — these are derived from `as const` arrays and cannot
 * change at runtime — so a fresh array per render would buy nothing and cost
 * correctness: the property list is an effect dependency in `useTokenValues`,
 * and a new identity every render re-reads the DOM forever.
 */
export const ACTION_GROUPS: RoleGroup[] = actionGroups();
export const STATUS_GROUPS: RoleGroup[] = statusGroups();
export const REMAINING_GROUPS: RoleGroup[] = remainingGroups();

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

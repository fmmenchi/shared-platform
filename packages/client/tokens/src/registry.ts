import {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  INPUT_ROLES,
  NEUTRAL_ROLES,
  RADIUS_TOKENS,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
  SURFACE_ROLES,
} from './tokens.js';

/** A run of variables registered together, with the type they share. */
export interface RegisteredSection {
  /** Rendered as the section comment. */
  title: string;
  /** A second line of it, where the reason needs saying. */
  note?: string;
  syntax: '<color>' | '<length>';
  vars: readonly string[];
}

const colorVars = (roles: readonly string[]) =>
  roles.map((role) => `--fm-color-${role}`);

const family = (
  families: readonly string[],
  suffixes: readonly string[],
): string[] => families.flatMap((f) => suffixes.map((s) => `${f}${s}`));

/**
 * WHAT `@property` REGISTERS, and in what order — the shape of
 * `styles/properties.css`, which is generated from this.
 *
 * The sections are the same partition `COLOR_ROLES` is assembled from, so the
 * headings cannot describe a different set from the one below them. They did:
 * the hand-written file announced the status roles as "success · warning ·
 * info" long after `error` had joined them, and nothing could notice, because a
 * comment is not checked by anything.
 *
 * Only COLOURS and RADIUS are here, and deliberately: they are the roles with a
 * real interpolation payoff. Fonts, spacing and duration stay unregistered
 * until a component needs to animate one — no phantom capability.
 */
export const REGISTERED_SECTIONS: readonly RegisteredSection[] = [
  {
    title: `Action families (${ACTION_FAMILIES.join(' · ')})`,
    syntax: '<color>',
    vars: colorVars(family(ACTION_FAMILIES, ACTION_SUFFIXES)),
  },
  {
    title: `Status roles (${STATUS_FAMILIES.join(' · ')})`,
    syntax: '<color>',
    vars: colorVars(family(STATUS_FAMILIES, STATUS_SUFFIXES)),
  },
  {
    title: 'Neutral + disabled',
    syntax: '<color>',
    vars: colorVars(NEUTRAL_ROLES),
  },
  {
    title: 'Surfaces, text & focus',
    syntax: '<color>',
    vars: colorVars(SURFACE_ROLES),
  },
  { title: 'Form controls', syntax: '<color>', vars: colorVars(INPUT_ROLES) },
  {
    title: 'Radius',
    note: '<length> initial-value must be computationally independent, so NO rem/em (the browser rejects the rule): px equivalents at the 16px root, converted from the real value rather than restated beside it.',
    syntax: '<length>',
    vars: RADIUS_TOKENS.map((token) => `--fm-radius-${token}`),
  },
];

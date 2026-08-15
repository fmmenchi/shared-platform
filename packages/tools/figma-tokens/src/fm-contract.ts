/**
 * THIS platform's contract — how `@fmmenchi/tokens` maps onto Figma variables.
 *
 * It lives here as DATA, not as a dependency: `scope:tools` may not depend on
 * `scope:client`, and it should not — the engine in this package is generic and
 * a consumer with its own prefix writes its own contract. What couples the two
 * is the property names below, and that coupling is exactly what the contract
 * test checks against the real stylesheet.
 *
 * Every list here is CLOSED on purpose. A rule like `--fm-color-(.+)` would
 * swallow a role added tomorrow and file it under whichever group it happened
 * to resemble; enumerating them means a new role matches nothing, becomes a
 * `problem`, and fails the test — which is the only way this file can stay
 * honest without anyone remembering to update it.
 */
import type { TokenContract } from './contract.types.js';

/** Action families and status families share the same suffix shape. */
const FAMILY =
  'primary|secondary|accent|destructive|success|warning|info|error';

/** Roles painting text or an icon. */
const TEXT_FILL = ['TEXT_FILL'];
/** Roles painting a border or a focus ring. */
const STROKE = ['STROKE_COLOR'];
/** Roles painting a surface behind something else. */
const FILL = ['FRAME_FILL', 'SHAPE_FILL'];

export const FM_CONTRACT: TokenContract = {
  name: '@fmmenchi/tokens',
  rootFontSize: 16,

  rules: [
    /* ---- Families: the -foreground and -border exceptions precede the fills ---- */
    {
      match: `--fm-color-(${FAMILY})-((?:.+-)?foreground)`,
      path: 'color/$1/$2',
      type: 'COLOR',
      scopes: TEXT_FILL,
    },
    {
      match: `--fm-color-(${FAMILY})-(border)`,
      path: 'color/$1/$2',
      type: 'COLOR',
      scopes: STROKE,
    },
    {
      match: `--fm-color-(${FAMILY})(?:-(.+))?`,
      path: 'color/$1/$2|default',
      type: 'COLOR',
      scopes: FILL,
    },

    /* ---- Neutral. `disabled` is a global role, grouped with the neutrals
           because that is what it is, not because its name says so. ---- */
    {
      match: '--fm-color-neutral-((?:.+-)?foreground)',
      path: 'color/neutral/$1',
      type: 'COLOR',
      scopes: TEXT_FILL,
    },
    {
      match: '--fm-color-neutral-(border)',
      path: 'color/neutral/$1',
      type: 'COLOR',
      scopes: STROKE,
    },
    {
      match: '--fm-color-neutral(?:-(.+))?',
      path: 'color/neutral/$1|default',
      type: 'COLOR',
      scopes: FILL,
    },
    {
      match: '--fm-color-(disabled-foreground)',
      path: 'color/neutral/$1',
      type: 'COLOR',
      scopes: TEXT_FILL,
    },
    {
      match: '--fm-color-(disabled)',
      path: 'color/neutral/$1',
      type: 'COLOR',
      scopes: FILL,
    },

    /* ---- Input ---- */
    {
      match: '--fm-color-input-(foreground|placeholder)',
      path: 'color/input/$1',
      type: 'COLOR',
      scopes: TEXT_FILL,
    },
    {
      match: '--fm-color-input-(border)',
      path: 'color/input/$1',
      type: 'COLOR',
      scopes: STROKE,
    },
    {
      match: '--fm-color-input(?:-(.+))?',
      path: 'color/input/$1|default',
      type: 'COLOR',
      scopes: FILL,
    },

    /* ---- Surfaces: enumerated, so a new surface role fails rather than lands
           in the wrong group. ---- */
    {
      match:
        '--fm-color-(foreground|card-foreground|popover-foreground|muted-foreground|tooltip-foreground|selection-foreground|link|link-hover)',
      path: 'color/surface/$1',
      type: 'COLOR',
      scopes: TEXT_FILL,
    },
    {
      match: '--fm-color-(border|ring)',
      path: 'color/surface/$1',
      type: 'COLOR',
      scopes: STROKE,
    },
    {
      match:
        '--fm-color-(background|card|popover|muted|scrim|selection|tooltip)',
      path: 'color/surface/$1',
      type: 'COLOR',
      scopes: FILL,
    },

    /* ---- Dimensions. Each is scoped to the property it governs, so the Figma
           picker offers radii to corners and leadings to line height only. ---- */
    {
      match: '--fm-radius-(.+)',
      path: 'radius/$1',
      type: 'FLOAT',
      scopes: ['CORNER_RADIUS'],
    },
    {
      match: '--fm-space-(.+)',
      path: 'space/$1',
      type: 'FLOAT',
      scopes: ['GAP', 'WIDTH_HEIGHT'],
    },
    {
      match: '--fm-text-(.+)',
      path: 'text/$1',
      type: 'FLOAT',
      scopes: ['FONT_SIZE'],
    },
    {
      match: '--fm-leading-(.+)',
      path: 'leading/$1',
      type: 'FLOAT',
      scopes: ['LINE_HEIGHT'],
    },
    {
      match: '--fm-size-(.+)',
      path: 'size/$1',
      type: 'FLOAT',
      scopes: ['WIDTH_HEIGHT'],
    },
    {
      match: '--fm-border-width-(.+)',
      path: 'border-width/$1',
      type: 'FLOAT',
      scopes: ['STROKE_FLOAT'],
    },
    {
      match: '--fm-font-weight-(.+)',
      path: 'font-weight/$1',
      type: 'FLOAT',
      scopes: ['FONT_WEIGHT'],
    },
  ],

  exclusions: [
    {
      match: '--fm-font-(sans|heading|mono)',
      reason:
        'CSS font stacks (`ui-sans-serif, system-ui, …`). Figma resolves a single installed family, so a stack would become a string naming no font.',
    },
    {
      match: '--fm-shadow-.+',
      reason:
        'Figma models shadows as effect STYLES, not variables — a separate surface from this one.',
    },
    {
      match: '--fm-duration-.+',
      reason: 'Motion timing has no Figma variable type.',
    },
    {
      match: '--fm-ease-.+',
      reason: 'Easing curves have no Figma variable type.',
    },
    {
      match: '--fm-transition-.+',
      reason: 'Transition shorthands have no Figma variable type.',
    },
    {
      match: '--fm-z-.+',
      reason:
        'Stacking order is a DOM concept; Figma orders by layer position.',
    },
  ],
};

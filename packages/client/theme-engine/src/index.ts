/**
 * `@fmmenchi/theme-engine` — build a theme from a handful of colours, and emit
 * it in the shapes different tooling reads (ADR-0033).
 *
 * Where `@fmmenchi/tokens` says what a theme must SATISFY, this says how one is
 * ARRIVED AT. It imports the contract and never restates it: floors come from
 * `CONTRAST_PAIRS`, roles from `COLOR_ROLES`, and the rungs are read out of the
 * installed stylesheets by `describeSystem()`.
 *
 * A barrel: re-exports only, never a declaration.
 */

export { describeSystem } from './system.js';
export type { ThemeSource } from './system.js';

export { FAMILY_CONSTRAINTS } from './constraints.js';

export type {
  PaletteFamily,
  PaletteSource,
  Rung,
  Ramp,
  Base,
  NeutralDefinition,
  ThemeDefinition,
  DesignSystem,
  RampStrategy,
  RungKey,
  RolePin,
  ThemeSpec,
} from './theme.types.js';

export type { Placement, Floor, Constraint } from './constraints.types.js';

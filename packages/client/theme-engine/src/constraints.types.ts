/**
 * THE PLACEMENTS — how a role gets its value, as opposed to what it must satisfy.
 *
 * Separate from `@fmmenchi/tokens`, and the seam is real: the contract says which
 * pairs are measured and to what floor, which is true of any theme however it was
 * made. How a fill is anchored and a wash is searched for is this engine's POLICY,
 * and a different engine over the same contract could place them differently
 * without either being wrong.
 */
import type { ColorRole } from '@fmmenchi/tokens';

/**
 * HOW a role gets its value — five kinds, because the shipped palette uses five.
 *
 * A single `direction` could not say this. Read off `primary` in the base theme:
 * the fill is 700, `-hover` 800 and `-active` 900, `-subtle` 100, and
 * `-subtle-foreground` 800 — while `-foreground` is `neutral-0`, not a rung of
 * the family at all. An ink is chosen from the theme's two neutrals; a state is
 * a fixed distance from the fill; a wash is the far end; and a wash's text is
 * searched for. Flattening those into one field would have made the solver guess
 * which was meant.
 */
export type Placement =
  /** The fill: taken from the brand colour's lightness, not searched for. */
  | { readonly kind: 'anchor' }
  /** Whichever of the theme's two inks clears the floor on its background. */
  | { readonly kind: 'ink' }
  /** A fixed number of rungs from another role, in the scheme's direction. */
  | { readonly kind: 'offset'; readonly from: string; readonly rungs: number }
  /** The nearest rung, walking that way, that satisfies the floors. */
  | { readonly kind: 'search'; readonly toward: 'ink' | 'surface' }
  /** Placed, but under no floor: WCAG 1.4.3 exempts disabled controls. */
  | { readonly kind: 'exempt'; readonly toward: 'ink' | 'surface' };

/** One pair a role must clear. */
export interface Floor {
  readonly against: ColorRole;
  /** WCAG ratio required. */
  readonly ratio: number;
  /** APCA |Lc| required, or `null` on a non-text pair — APCA judges reading. */
  readonly lc: number | null;
}

export interface Constraint {
  readonly role: ColorRole;
  /**
   * EVERY pair this role must clear, not one.
   *
   * A role is routinely under several: `primary` is a non-text indicator owing
   * 3:1 against `background`, against `muted` AND against `primary-subtle`
   * (WCAG 1.4.11). Carrying a single `against` let a solver satisfy the first and
   * silently break the others — which is what an earlier version of this type
   * did, until a test asked what `primary` was measured against and got one
   * answer where the contract declares three.
   *
   * Empty where nothing is measured: a disabled pair, or a role that only ever
   * appears as a background.
   */
  readonly floors: readonly Floor[];
  readonly placement: Placement;
}

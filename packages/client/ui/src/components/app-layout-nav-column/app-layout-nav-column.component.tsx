import type { AppLayoutNavColumnProps } from './app-layout-nav-column.types.js';

/**
 * The navigation as a COLUMN — what `AppLayoutNav` shows on a wide screen.
 *
 * A SLOT: it draws nothing itself and is never rendered as a component. The
 * region reads its children and puts them in whichever container the current
 * form calls for, which is what lets the two forms differ in what they hold
 * while the swap stays one decision in one place.
 *
 * Give only one of the two and it is used for both — the shorthand for a
 * product whose forms really do hold the same thing, without asking every other
 * product to pretend they do.
 *
 * It must be a DIRECT child of `AppLayoutNav`: the region finds it by type, so
 * a slot wrapped in a component of your own is a slot it cannot see.
 */
function AppLayoutNavColumn(_props: AppLayoutNavColumnProps) {
  return null;
}

export { AppLayoutNavColumn };

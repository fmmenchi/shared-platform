import type { AppLayoutNavDrawerProps } from './app-layout-nav-drawer.types.js';

/**
 * The navigation as a DRAWER — what `AppLayoutNav` shows on a narrow screen.
 *
 * A SLOT, like its sibling: it draws nothing and is never rendered as a
 * component. The trigger, the `Dialog` and the way out stay the region's; this
 * carries only what goes inside them.
 *
 * It is worth having its own slot because the two are rarely the same list: a
 * phone's drawer usually absorbs the account and search links that live in the
 * header on a wide screen, and drops what a rail shows as icons.
 *
 * Give only one of the two slots and it is used for both.
 *
 * It must be a DIRECT child of `AppLayoutNav`, which finds it by type.
 */
function AppLayoutNavDrawer(_props: AppLayoutNavDrawerProps) {
  return null;
}

export { AppLayoutNavDrawer };

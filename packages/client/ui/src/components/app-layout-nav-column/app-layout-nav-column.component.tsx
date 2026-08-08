import { useDevWarning } from '../../primitives/use-dev-warning.js';
import type { AppLayoutNavColumnProps } from './app-layout-nav-column.types.js';

/**
 * The navigation as a COLUMN — what `AppLayoutNav` shows on a wide screen.
 *
 * A SLOT: it draws nothing itself and, used correctly, is never rendered at
 * all. `AppLayoutNav` reads its children and puts them in whichever container
 * the current form calls for, which is what lets the two forms differ in what
 * they hold while the swap stays one decision in one place.
 *
 * Give it what a rail should hold: usually the sections only,
 * since a wide screen has a header to carry the account and search links.
 *
 * Give only one of the two and it is used for both — the shorthand for a
 * product whose forms really do hold the same thing, without asking every other
 * product to pretend they do.
 *
 * It must be a DIRECT child of `AppLayoutNav` (a fragment is looked through;
 * any other wrapper is not). Hence the warning below, which is the only place
 * the mistake is visible: a slot inside a component of your own — or a
 * `<Suspense>`, or a `React.lazy` — is a slot `AppLayoutNav` cannot see,
 * because those children do not exist until they are rendered. It then falls
 * back to the children as a whole, renders THIS, and this renders nothing. An
 * empty navigation, in both forms, with nobody complaining. So it complains.
 */
function AppLayoutNavColumn(_props: AppLayoutNavColumnProps) {
  useDevWarning(
    true,
    'AppLayoutNavColumn was rendered, which means `AppLayoutNav` never saw it and your navigation is empty. It has to be a DIRECT child of <AppLayoutNav> — a fragment is fine, a component of your own is not.',
  );
  return null;
}

export { AppLayoutNavColumn };

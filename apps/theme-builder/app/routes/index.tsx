import { redirect } from 'react-router';

import { FIRST_STEP, pathOf } from '../steps';

/**
 * `/` SENDS YOU INTO THE SEQUENCE, and holds nothing of its own.
 *
 * Step one used to live here, as the wizard's index route, on the argument that a
 * person landing on the app is already on step one so a redirect would put a second
 * URL in the history for one page. Measured, it cost three things instead:
 *
 *   `slugOf` fell back to the first step for any path it did not recognise, so `/`
 *   and `/nonsense` gave the same answer and the stepper showed "step one, current"
 *   for a URL that does not exist;
 *
 *   the sidebar's "Build" link pointed here too, so two nav items shared one page and
 *   BOTH carried `aria-current` — two current pages announced in one nav, on every
 *   step. That link is gone;
 *
 *   and step one was the only step nobody could link to by name, in a wizard whose
 *   navigation model is that the URL says where you are.
 *
 * NO HISTORY ENTRY IS SPENT. A redirect from a loader is a replace, not a push, so
 * the back button from step two lands wherever the person came from rather than
 * bouncing through `/`. That was the one real objection to a redirect and it does not
 * apply to this kind.
 *
 * IT REDIRECTS TO `FIRST_STEP` RATHER THAN TO A LITERAL. Reordering `STEPS` moves the
 * entry point with it, which is the whole point of that array being the one place the
 * sequence is declared.
 */
export function loader() {
  return redirect(pathOf(FIRST_STEP));
}

/**
 * A route module needs a default export, and this one is never rendered: the loader
 * redirects before React is asked for anything. Returning `null` rather than throwing
 * because a throw here would be a crash on a path that works.
 */
export default function Index() {
  return null;
}

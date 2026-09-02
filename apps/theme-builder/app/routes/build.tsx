import { Heading } from '@fmmenchi/ui/heading';
import { Stepper } from '@fmmenchi/ui/stepper';
import { StepperItem } from '@fmmenchi/ui/stepper-item';
import { NavLink, Outlet, useLocation } from 'react-router';

import { STEPS, slugOf, statusOf, useStepLink } from '../steps';

/**
 * THE WIZARD — the chrome every step shares, on the reference theme.
 *
 * The stepper is DRIVEN BY THE ROUTE. Which step is current comes from the path and
 * not from state, so the back button, a bookmark and a reload all land on the step
 * they say they do — and there is no second copy of "where am I" to keep in step
 * with the URL.
 *
 * A completed step is a LINK and a step ahead is not, which is the honest reading of
 * a process: you may go back over what you have done, and there is nothing yet to go
 * forward to. `StepperItem` puts `aria-current` on the step itself rather than on a
 * link inside it, so the current step announces its position whether or not it
 * happens to be navigable — which is exactly the case that choice was made for.
 *
 * IT NO LONGER LOADS THE DECLARATIONS, and it no longer holds the preview.
 *
 * Both moved to `root.tsx` and for one reason: the preview is a DOCKED RAIL now, and
 * a region of `AppLayout` has to be a direct child of it — `.layout > aside` is how
 * the shell places one. A rail rendered in here would be a box inside `main`, which
 * is what it was, and it read as a card floating in the page rather than as a side of
 * the window. Rendering it above meant the stores and the declarations had to be
 * above too, which collapsed the second copy of this loader that the full-width
 * `/preview` route was carrying (that route is gone since; the rail is the preview).
 *
 * What is left here is the step's own chrome and nothing else. The control that opens
 * the rail went up to the header too: it was a button in this heading row beside
 * `Building`, which made two ways to ask for one thing in one screen.
 */
export default function Build() {
  const { pathname } = useLocation();
  const current = slugOf(pathname);
  const stepLink = useStepLink();

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-l)',
        padding: 'var(--fm-space-inset-l)',
      }}
    >
      <Heading level={1}>Build a theme</Heading>

      {/* `aria-label` rather than a `label` prop: the design system's stepper
        names itself from its own localized copy ("Progress") and takes an
        override here, so a nameless landmark is impossible and a better name is
        still possible. */}
      <Stepper aria-label="Set up your theme">
        {STEPS.map((step) => {
          const status = statusOf(step, current);
          return (
            <StepperItem key={step.slug} status={status}>
              {status === 'complete' ? (
                <NavLink to={stepLink(step.slug)}>{step.label}</NavLink>
              ) : (
                step.label
              )}
            </StepperItem>
          );
        })}
      </Stepper>

      <Outlet />
    </div>
  );
}

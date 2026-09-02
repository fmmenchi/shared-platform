import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Stepper } from '@fmmenchi/ui/stepper';
import { StepperItem } from '@fmmenchi/ui/stepper-item';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { isPreviewOpen, withPreview } from '../preview-open';
import { STEPS, pathOf, slugOf, statusOf } from '../steps';

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
 * above too, which collapsed the second copy of this loader that `routes/preview.tsx`
 * was carrying.
 *
 * What is left here is the step's own chrome, plus the one control that belongs to
 * the page rather than to the rail: opening it.
 */
export default function Build() {
  const { pathname, search } = useLocation();
  const current = slugOf(pathname);
  const railOpen = isPreviewOpen(search);

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-l)',
        padding: 'var(--fm-space-inset-l)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--fm-space-inline-m)',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Heading level={1}>Build a theme</Heading>

        {/* THE OPEN CONTROL IS HERE, beside the work, because that is what it is
            about: it opens the rail on THIS page rather than going anywhere. The
            header's `Building`/`Preview` pair is the other thing — the full-width
            page, where all eleven sections are worth reading.

            AND ONLY WHEN CLOSED. It said "Hide the preview" while the rail was open,
            which put two Hide controls on one screen — this one and the rail's own. A
            panel's close belongs IN the panel, where somebody looks for it; what is
            left up here is the one thing the rail cannot offer, being opened. */}
        {!railOpen && (
          <Button
            as={Link}
            to={withPreview(pathname, search, true)}
            variant="secondary"
          >
            Show the preview
          </Button>
        )}
      </div>

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
                <NavLink to={pathOf(step)}>{step.label}</NavLink>
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

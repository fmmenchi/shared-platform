import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { SidePanel } from '@fmmenchi/ui/side-panel';
import { Stepper } from '@fmmenchi/ui/stepper';
import { StepperItem } from '@fmmenchi/ui/stepper-item';
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
} from 'react-router';

import {
  DeclarationsProvider,
  type SerializedDeclarations,
} from '../declarations';
import { readDeclarations } from '../declarations.server';
import { STEPS, pathOf, slugOf, statusOf } from '../steps';
import { ThemePreview } from '../theme-preview';

/**
 * THE DECLARATIONS ARE LOADED ONCE, HERE, because every step builds from the same
 * ones and this is the route they all sit under.
 *
 * They are read from `vars.css` on the server rather than shipped as a generated
 * JSON file. See `declarations.server.ts` for why the file was the wrong answer.
 */
export function loader() {
  return readDeclarations();
}

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
 */
export default function Build() {
  const { pathname, search } = useLocation();
  const current = slugOf(pathname);

  /*
   * WHETHER THE PREVIEW IS OPEN LIVES IN THE URL, which is the same choice as the
   * `?from=` beside it and for the same reasons: it survives a reload, it is a link
   * somebody can send, and the control that opens it is an ordinary anchor that works
   * with no JavaScript. In state it would be none of those, and this app has already
   * paid once for keeping something in memory that the URL could hold.
   *
   * `1` rather than a bare `?preview`, so the absent case has exactly one spelling.
   */
  const params = new URLSearchParams(search);
  const showingPreview = params.get('preview') === '1';

  const withParam = (value: string | undefined) => {
    const next = new URLSearchParams(search);
    if (value === undefined) next.delete('preview');
    else next.set('preview', value);
    const query = next.toString();
    return query === '' ? pathname : `${pathname}?${query}`;
  };
  const declarations = useLoaderData<SerializedDeclarations>();

  return (
    <DeclarationsProvider declarations={declarations}>
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
              about: it opens a panel on THIS page rather than going anywhere. The
              header's `Building`/`Preview` pair is the other thing — the full-width
              page, where all eleven sections are worth reading. Two entry points, two
              different destinations.

              AND ONLY WHEN CLOSED. It said "Hide the preview" while the panel was
              open, which put two Hide controls on one screen — this one and the
              panel's own, four inches apart. A panel's close belongs IN the panel,
              where somebody looks for it; what is left up here is the one thing the
              panel cannot offer, which is being opened. */}
          {!showingPreview && (
            <Button as={Link} to={withParam('1')} variant="secondary">
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

        {/* TWO COLUMNS FROM `auto-fit`, and no media query anywhere. Each track asks
            for 30rem, so the browser gives two when they fit and one when they do not
            — the panel then sits under the step instead of squeezing it. Measured
            before this was built: every step reflows to 620px of column without the
            page ever scrolling sideways, so the narrow case costs height and nothing
            else.

            `align-items: start` because the two have nothing to line up on but their
            tops, and a stretched panel would be as tall as the step for no reason. */}
        <div
          style={{
            display: 'grid',
            gap: 'var(--fm-space-inline-m)',
            gridTemplateColumns: showingPreview
              ? 'repeat(auto-fit, minmax(30rem, 1fr))'
              : undefined,
            alignItems: 'start',
          }}
        >
          <Outlet />

          {showingPreview && (
            /* THE PANEL IS NON-MODAL — ADR-0034 — which is the whole reason it can be
               here at all: the step's controls keep working behind it, so a person can
               move a colour and watch it move. A drawer would have made the page inert
               and taken away the control the preview is about.

               THE APP SUPPLIES THE BOUND. `SidePanel` brings `overflow-y: auto` and
               `max-block-size: 100%`; only this file knows what the panel should be as
               tall as, and sticky-to-the-viewport is the answer while the step scrolls
               past it. */
            <SidePanel
              label="Your theme"
              aria-labelledby="preview-panel-heading"
              style={{
                position: 'sticky',
                insetBlockStart: 'var(--fm-space-inset-m)',
                maxBlockSize: 'calc(100dvh - 2 * var(--fm-space-inset-l))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--fm-space-inline-s)',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                {/* IT NAMES THE PANEL, via `aria-labelledby` above: the words a
                    screen reader announces are then the words on screen, which the
                    `label` prop alone cannot promise. */}
                <Heading level={2} size="h3" id="preview-panel-heading">
                  Your theme
                </Heading>
                {/* BOTH CONTROLS IN THE PANEL'S HEADER, and "full width" was at the
                    BOTTOM until the panel was looked at with real content in it: the
                    preview is some 3300px tall in a column this wide, so a link after
                    it was a link nobody would ever scroll to. A control for the panel
                    belongs where the panel begins. */}
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--fm-space-inline-s)',
                    alignItems: 'baseline',
                  }}
                >
                  <Button
                    as={Link}
                    to={`/preview?from=${current}`}
                    variant="ghost"
                    size="sm"
                  >
                    Full width
                  </Button>
                  <Button
                    as={Link}
                    to={withParam(undefined)}
                    variant="ghost"
                    size="sm"
                  >
                    Hide
                  </Button>
                </div>
              </div>

              {/* LEVEL THREE, under the panel's own `h2`. On the full-width page the
                  same sections are level two, under its `h1` — one component, two
                  honest outlines. */}
              <ThemePreview sectionLevel={3} />
            </SidePanel>
          )}
        </div>
      </div>
    </DeclarationsProvider>
  );
}

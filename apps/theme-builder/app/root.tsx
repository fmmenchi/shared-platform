import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
  type LinksFunction,
  type MetaFunction,
} from 'react-router';

import { UiProvider } from '@fmmenchi/ui';
import { AppLayout } from '@fmmenchi/ui/app-layout';
import { AppLayoutMain } from '@fmmenchi/ui/app-layout-main';
import { AppLayoutNav } from '@fmmenchi/ui/app-layout-nav';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Nav } from '@fmmenchi/ui/nav';
import { NavLink } from '@fmmenchi/ui/nav-link';
import { Separator } from '@fmmenchi/ui/separator';
import { SidePanel } from '@fmmenchi/ui/side-panel';

import {
  useRhfErrors,
  useRhfField,
  useRhfOptionField,
} from '@fmmenchi/ui-form-ports/react-hook-form';

import { BasesProvider } from './bases';
import {
  DeclarationsProvider,
  type SerializedDeclarations,
} from './declarations';
import { readDeclarations } from './declarations.server';
import { isPreviewOpen, withPreview } from './preview-open';
import { RampProvider } from './ramp';
import { RoleOverridesProvider } from './role-overrides';
import { FIRST_STEP, STEPS, pathOf, slugOf, stepPath } from './steps';
import { ThemePreview } from './theme-preview';
import stylesheet from '../styles.css?url';

export const meta: MetaFunction = () => [
  { title: 'Theme builder — @fmmenchi/ui' },
  {
    name: 'description',
    content:
      'Seven brand colours become a whole theme: ramps, semantic roles, and a preset the Nx generator installs.',
  },
];

/**
 * No webfont, and that is a decision rather than an omission. `--fm-font-sans`
 * defaults to a system stack and an app is meant to override it; loading one here
 * would put a font in front of the tokens this app exists to show, and whatever a
 * person built would then look different in their own product.
 */
export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
];

/**
 * THE SHELL IS ON THE REFERENCE THEME, always.
 *
 * The chrome — the header, the navigation, the wizard's controls, everything a
 * person clicks — renders under `:root`, which is `@fmmenchi/tokens`' own theme.
 * Only the preview subtree is wrapped in the draft. The reason is a failure mode
 * rather than tidiness: a draft with a contrast pair below its floor would
 * otherwise take down the controls that would fix it, and a builder you cannot read
 * is a builder you cannot recover from.
 *
 * EVERY REGION IS THE DESIGN SYSTEM'S. `AppLayout` asks what is there rather than
 * taking props: a `<header>`, an `AppLayoutNav`, an `AppLayoutMain` and a
 * `<footer>` make the grid, and the navigation column becomes a drawer under 48rem
 * with nothing deciding it in JavaScript. This app is also the argument that the
 * design system can carry a real product, so it uses the parts rather than
 * hand-rolling a layout beside them.
 */
/**
 * THE DECLARATIONS ARE LOADED AT THE ROOT, and they were loaded per route.
 *
 * They moved because the preview rail did: a region of `AppLayout` has to be a DIRECT
 * child of it (`.layout > aside` is how the shell places one), so the rail is rendered
 * here, above every route — and it cannot read a loader that belongs to one of them.
 *
 * Which also collapsed a duplication rather than adding one. `routes/build.tsx` and
 * `routes/preview.tsx` each carried the same loader, because the preview sat outside
 * the wizard layout on purpose and so could not share its data. Neither needs one now:
 * the root is above both, so there is a single read of `vars.css` per request and no
 * layout is shared to get it.
 */
export function loader() {
  return readDeclarations();
}

/**
 * Every store the wizard keeps, above every route because all of them outlive a step
 * — and above `AppLayout` because the preview rail is one of its regions and reads
 * them too.
 *
 * THE DECLARATIONS ARE WRAPPED CONDITIONALLY, and that is about the error shell rather
 * than about them: `Layout` renders when a loader has thrown, and there is no data
 * then. Wrapping anyway would mean handing the provider `undefined` and turning a
 * clear failure into a confusing one; left off, the wizard's own hooks throw by name,
 * which is what they are for.
 */
function Stores({
  declarations,
  children,
}: {
  readonly declarations: SerializedDeclarations | undefined;
  readonly children: React.ReactNode;
}) {
  const stores = (
    <BasesProvider>
      <RampProvider>
        <RoleOverridesProvider>{children}</RoleOverridesProvider>
      </RampProvider>
    </BasesProvider>
  );

  if (declarations === undefined) return stores;
  return (
    <DeclarationsProvider declarations={declarations}>
      {stores}
    </DeclarationsProvider>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  // `current` PASSED EXPLICITLY, and it has to be. Without a `UiProvider` the
  // design system's `NavLink` falls back to working out the location itself, which
  // the server does not have — so the class and `aria-current` would differ between
  // the two renders. Read from the router instead: it knows the path on both sides.
  const { pathname, search } = useLocation();
  const onPreview = pathname === '/preview';
  const currentStep = slugOf(pathname);

  // `useRouteLoaderData` rather than `useLoaderData`, because this component also
  // renders the error shell: the named read answers `undefined` there instead of
  // throwing, which is the difference between a readable error page and none.
  const declarations = useRouteLoaderData('root') as
    SerializedDeclarations | undefined;

  // NOT ON THE PREVIEW PAGE. That route IS the preview at full width; a rail of the
  // same thing beside it would be the same component twice on one screen.
  const railOpen = !onPreview && isPreviewOpen(search);

  /*
   * WHERE "BUILDING" GOES BACK TO — the step somebody left, not the first one.
   *
   * `slugOf` answers with the first step for any path it does not know, `/preview`
   * included, which is right for a stepper and useless here: a person who was on
   * step three, looked at their theme and came back would land on step one. Losing
   * somebody's place is the same class of defect as the sidebar reloading the
   * document, only quieter.
   *
   * SO THE PREVIEW LINK CARRIES IT AND THE URL HOLDS IT. Remembering it in state was
   * the first version and it was worse twice over: `setState` inside an effect is the
   * cascading-render anti-pattern the lint rule refuses, and a memory in this
   * component is gone the moment somebody reloads or opens a shared `/preview` link,
   * with nothing to say why "Building" now points at step one. As a search param it
   * is a fact about how you got here, so it survives both.
   *
   * VALIDATED against `STEPS` rather than handed to `stepPath`, because it arrives
   * from the URL: a hand-typed `?from=whatever` answers with the first step instead
   * of throwing a page away.
   */
  const from = new URLSearchParams(search).get('from');
  const buildingStep = onPreview
    ? (STEPS.find((step) => step.slug === from)?.slug ?? FIRST_STEP.slug)
    : currentStep;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            /*
             * ALL THREE HOOKS, and the missing one was found by rendering rather than
             * by typechecking: `optionField` is what a group of controls sharing one
             * name needs — a segmented control, a radio group — and without it
             * `FormSegmentedControl` throws at render. The binding is a set, so taking
             * two of its three parts is not a smaller binding, it is a broken one.
             *
             * The error said exactly that, which is why this cost a minute rather than
             * an afternoon: "the form binding provides no `optionField` … every
             * binding in @fmmenchi/ui-form-ports ships one".
             *
             * GIVEN HERE rather than inside the routes, which is where it was. The
             * shell is below this line now — the sidebar, the footer and the preview
             * rail were all outside the provider before, taking the design system's
             * fallbacks for their copy while every form inside a route had the real
             * thing. A provider for "the app" that stopped at the app's content was
             * the wrong shape.
             */
            form: {
              field: useRhfField,
              optionField: useRhfOptionField,
              errors: useRhfErrors,
            },
          }}
        >
          <Stores declarations={declarations}>
            <AppLayout>
              <header
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--fm-space-inline-m)',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: 'var(--fm-space-inset-m)',
                  borderBlockEnd:
                    'var(--fm-border-width-divider) solid var(--fm-color-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--fm-space-inline-s)',
                    alignItems: 'baseline',
                  }}
                >
                  <strong>Theme builder</strong>
                  {/* What it builds FOR, said once and in the chrome rather than on
                  every page: a person arriving cold needs to know whose theme this
                  is before they know what a rung is. */}
                  <span
                    style={{
                      color: 'var(--fm-color-muted-foreground)',
                      fontSize: 'var(--fm-text-sm)',
                    }}
                  >
                    @fmmenchi/ui
                  </span>
                </div>
                {/* THE MODE, AND THE CONTROL FOR IT, IN ONE PLACE. This was a `Badge`
                saying "Building" or "Preview" while the thing that changed it was a
                fifth item in the sidebar, under a hairline rule and the same shape as
                the four steps — so the header stated a mode it could not change, the
                sidebar changed it without saying so, and the preview read as a step.
                It is not one: nothing is decided there, and it is reachable at any
                time.

                TWO LINKS, NOT A `SegmentedControl`, which is what a mode switch looks
                like and the wrong component for this. That one is a radio group
                (ADR-0025) and the design system draws the line itself — "a tab list
                navigates the page, a radio group answers a question". These navigate,
                so they are links: they work without JavaScript, they open in a new tab
                on a middle click, and they are announced as what they are. `Tabs` is
                out for the other half of the same sentence — it swaps a panel on one
                page rather than moving between two routes.

                A SECOND NAV LANDMARK, which is why `label` is required and why both
                have one: a page with two unnamed navigations gives a screen reader
                user a list of things all called "navigation". */}
                <Nav label="View">
                  <NavLink asChild current={!onPreview}>
                    <Link to={stepPath(buildingStep)}>Building</Link>
                  </NavLink>
                  <NavLink asChild current={onPreview}>
                    <Link to={`/preview?from=${buildingStep}`}>Preview</Link>
                  </NavLink>
                </Nav>
              </header>

              <AppLayoutNav label="Main">
                <Nav label="Main" orientation="vertical">
                  {/* THE STEPS ARE FLAT, and they were inside a `NavGroup` until it was
                  looked at in a browser. `NavGroup` is a DISCLOSURE — its own docs
                  say "a set of links that opens" — and in a sidebar it renders
                  `hidden` and starts closed. So the four steps were in the DOM and
                  invisible, behind a click, while the comment right here claimed the
                  sidebar existed "so the wizard is navigable without the stepper".
                  It was not.

                  A disclosure is right for a section you collapse AWAY from
                  something. There is nothing else in this sidebar: the four steps ARE
                  its content — the preview left it for the header, where the mode it
                  changes was already being reported. Four links do not need a lid, and
                  there is no `defaultOpen` to ask for — which is the correct API for
                  that component and the wrong component for this job.

                  THERE IS ALSO NO "BUILD" LINK, and there was one. It pointed at `/`,
                  which was step one's route — so it and "Brand colours" were two
                  items for one page, and its `current={!onPreview}` made it claim
                  `aria-current` on EVERY step: measured, two current pages announced
                  in one nav.

                  The steps are repeated here at all because the stepper is chrome for
                  ORIENTATION and reads best as a row. Two views of one list, both
                  from `STEPS`. */}
                  {/* `asChild` WITH THE ROUTER'S OWN LINK, and this was `href` on a bare
                  `NavLink` until the wizard was walked with a probe in the page.
                  Measured: every click here was a FULL DOCUMENT LOAD, so each one
                  threw away the whole wizard — a brand colour set to `#aa3311` came
                  back `#3072c1`, the reference, and the theme exported afterwards was
                  the design system's own rather than the one somebody had built.

                  The design system was not wrong to render a plain anchor. It reads
                  the app's router off `UiProvider`, and this sidebar lives in
                  `Layout`, ABOVE the route tree — so the provider that supplies the
                  `Link` port is inside `{children}` and can never be in scope here.
                  With no router to ask, a plain anchor is the only honest thing left,
                  and a plain anchor is a page load.

                  So the router arrives per call instead, which the design system
                  documents as the CHECKED alternative to the port: the element is
                  right there, so TypeScript sees which link it is. `current` stays
                  ours — React Router's `NavLink` would compute a second
                  `aria-current`, and two current pages in one nav is a bug this file
                  already has a comment about, twelve lines up. */}
                  {STEPS.map((step) => (
                    <NavLink
                      key={step.slug}
                      asChild
                      current={!onPreview && step.slug === currentStep}
                    >
                      <Link to={pathOf(step)}>{step.label}</Link>
                    </NavLink>
                  ))}
                </Nav>
              </AppLayoutNav>

              <AppLayoutMain>{children}</AppLayoutMain>

              {/* THE PREVIEW, DOCKED — a region of the shell rather than a box inside
                the content, which is what it was first and read as a card floating in
                the page. `AppLayout` has had an `<aside>` region all along: it places
                it by what it IS (`.layout > aside`), gives it `--fm-size-aside`, makes
                the grid `nav main aside` when both are present, and drops it to a row
                UNDER main below 64rem. None of that is this app's to write, and none
                of it is a media query here.

                `SidePanel` renders an `<aside>`, so it does not sit in the region — it
                IS the region, and it brings the four things the region has no opinion
                about: the surface, its own scroll, the required name, and the tab stop
                a scroll container needs (ADR-0034).

                THE RADIUS AND THREE BORDERS COME OFF, because a rail flush to the
                window has no outside: rounded corners against the viewport edge are
                what "docked" is not. What stays is the inline-start hairline, which is
                the only edge it actually has. */}
              {railOpen && (
                <SidePanel
                  label="Your theme"
                  aria-labelledby="preview-rail-heading"
                  style={{
                    borderRadius: 0,
                    borderBlock: 'none',
                    borderInlineEnd: 'none',
                    /* WHAT MAKES IT A RAIL RATHER THAN A LONG COLUMN, and the
                       panel cannot supply it: `SidePanel` brings
                       `max-block-size: 100%`, which resolves against the box it is
                       given — and a grid row sized by its tallest item is no bound
                       at all. Measured without these three: 9313px tall, with
                       `scrollHeight === clientHeight`, so it stretched the page
                       instead of scrolling and the step scrolled away with it.

                       `align-self: start` stops the item filling its row, `sticky`
                       keeps it in view while the step scrolls past, and `100dvh` is
                       the bound the panel's own `overflow` was waiting for. All
                       three are PLACEMENT, which ADR-0034 leaves to the app for
                       exactly this reason: only this file knows the rail should be
                       as tall as the window. */
                    alignSelf: 'start',
                    position: 'sticky',
                    insetBlockStart: 0,
                    maxBlockSize: '100dvh',
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
                    {/* IT NAMES THE RAIL, via `aria-labelledby` above: what a screen
                      reader announces is then the words on screen. */}
                    <Heading level={2} size="h3" id="preview-rail-heading">
                      Your theme
                    </Heading>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--fm-space-inline-s)',
                        alignItems: 'baseline',
                      }}
                    >
                      <Button
                        as={Link}
                        to={`/preview?from=${currentStep}`}
                        variant="ghost"
                        size="sm"
                      >
                        Full width
                      </Button>
                      <Button
                        as={Link}
                        to={withPreview(pathname, search, false)}
                        variant="ghost"
                        size="sm"
                      >
                        Hide
                      </Button>
                    </div>
                  </div>

                  <ThemePreview sectionLevel={3} />
                </SidePanel>
              )}

              <footer
                style={{
                  display: 'grid',
                  gap: 'var(--fm-space-stack-s)',
                  padding: 'var(--fm-space-inset-m)',
                  color: 'var(--fm-color-muted-foreground)',
                  fontSize: 'var(--fm-text-sm)',
                }}
              >
                <Separator />
                {/* THE EMOJI ARE LABELLED, and they were `aria-hidden` one commit ago.
                Both are right, in their own case, and the case changed when the words
                went: while "love" and "coffee" were written out the emoji duplicated
                them, so announcing "love, red heart" said each fact twice and hiding
                them was correct. Carrying the meaning ALONE they are content — hidden,
                the line would be read as "Built by @fmmenchi with and", which is not
                a sentence.

                So `role="img"` and a label each. The label is the WORD the emoji
                replaced, not a description of the picture: "love", not "yellow
                heart" — a reader wants the sentence, not the glyph. */}
                <p style={{ margin: 0, maxWidth: 'var(--fm-size-prose)' }}>
                  Built by <code>@fmmenchi</code> with{' '}
                  <span role="img" aria-label="love">
                    💛
                  </span>{' '}
                  and{' '}
                  <span role="img" aria-label="coffee">
                    ☕
                  </span>
                </p>
              </footer>
            </AppLayout>
          </Stores>
        </UiProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * THE ROUTES, AND NOTHING ELSE.
 *
 * Every provider this app has moved up into `Layout`, because the preview rail is a
 * region of `AppLayout` and a region cannot read a context declared inside `main`.
 * What is left here is the outlet — which is the honest size of this component now
 * that the shell above it holds the state.
 */
export default function App() {
  return <Outlet />;
}

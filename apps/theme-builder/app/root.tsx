import type { CSSProperties } from 'react';
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
import { STEPS, pathOf, slugOf } from './steps';
import { BOOT_SCRIPT } from './theme-choice';
import { ThemePreview } from './theme-preview';
import { ThemeSwitcher } from './theme-switcher';
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
  /*
   * THE SAME MARK AS THE BLOG, copied verbatim from `dev-blog` rather than redrawn:
   * one identity across the sites, and a second drawing of one glyph is a second
   * thing to keep in step. It is an SVG, so it is one file at every size.
   *
   * `.ico` stays beside it for the browsers and crawlers that ask for `/favicon.ico`
   * by convention without reading the document at all.
   */
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
];

/**
 * THE SHELL IS ON THE DESIGN SYSTEM'S OWN THEME — light or dark as the system says,
 * or as the header's switcher pins it — and NEVER on the draft.
 *
 * The chrome — the header, the navigation, the wizard's controls, everything a
 * person clicks — renders under `:root` or under `[data-theme='dark']`, which are
 * `@fmmenchi/tokens`' two shipped presets (`theme-choice.ts` decides which). Only
 * the preview subtree is wrapped in the draft. The reason is a failure mode rather
 * than tidiness: a draft with a contrast pair below its floor would otherwise take
 * down the controls that would fix it, and a builder you cannot read is a builder
 * you cannot recover from. That argument was once read as "the shell is light,
 * always"; it is about the DRAFT, and says nothing against dark mode.
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
 * the then `/preview` route each carried the same loader, because the preview sat outside
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
  const currentStep = slugOf(pathname);

  // `useRouteLoaderData` rather than `useLoaderData`, because this component also
  // renders the error shell: the named read answers `undefined` there instead of
  // throwing, which is the difference between a readable error page and none.
  const declarations = useRouteLoaderData('root') as
    SerializedDeclarations | undefined;

  const railOpen = isPreviewOpen(search);

  return (
    // `suppressHydrationWarning` because `BOOT_SCRIPT` has already put `data-theme`
    // on this element by the time React compares it with what the server sent — and
    // the server, which does not know the choice, sent none. The mismatch is the
    // design, not a defect; see `theme-choice.ts`.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* BEFORE THE STYLESHEET, and inline: the theme has to be decided before
            anything paints, or a person who chose dark sees a light page for a
            frame. A module script or a deferred one runs after first paint; only an
            inline classic script runs here. What it does is one line, kept in step
            with the hook by `tests/theme-choice.spec.tsx`. */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
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
            {/* THE RAIL IS WIDER THAN THE SHELL'S DEFAULT, and it is retuned rather
                than overridden: `--fm-size-aside` is a TOKEN precisely so a consumer
                can, which `app-layout.module.css` says in as many words — "a
                sidebar's width is a measurement, so it is a TOKEN, retuned by a theme
                exactly the way a colour is".

                18rem is right for a details pane and wrong for this: at 288px the
                preview's own buttons wrapped, so `Confirm`, `Disabled`, `solid` and
                `soft` came out on three lines and a row of components stopped looking
                like a row. 26rem was the first answer and it was not enough either —
                asked for wider twice, with a screenshot of `soft` still on a line of
                its own. The arithmetic says why: `SidePanel` insets 1.5rem a side and
                the scope another 2rem, so 7rem of a 26rem rail is padding and the
                scrollbar takes a little more; 288px was left for a row that measures
                ~290px. 32rem leaves ~384px, which holds that row with room and gives
                an Alert a line of its own — what the deleted full-width page was for.

                CLAMPED TO THE SHELL rather than fixed, because the rail is taken OUT
                of `main`: at 32rem flat, a 1024px shell (where the layout still puts
                the three columns side by side) would leave 256px for the step. `cqi`
                is the shell's own inline size — `AppLayout`'s outer element is the
                container, and the token is not `@property`-registered, so the unit
                resolves where it is used — so the rail is 40% of the shell between
                its old width and its new one: 512px from 1280px up, 416px below
                1040px, and the step keeps 60% of the shell minus the nav in between.
                Under the shell's own `@xl` the rail stacks under `main` anyway. */}
            <AppLayout
              // The class is how `styles.css` reaches the shell's grid (`> *`) to
              // pin it to the window while the rail is docked — see there.
              className="theme-builder-shell"
              style={
                {
                  '--fm-size-aside': 'clamp(26rem, 40cqi, 32rem)',
                } as CSSProperties
              }
            >
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
                  {/* THE BLOG'S OWN WORDMARK, and its treatment rather than an
                      approximation of it: mono, bold, with the `.com` in the accent —
                      which is `--fm-color-primary` here and `text-primary` there, the
                      same ROLE either side. So it follows the theme being built, like
                      everything else in this chrome.

                      It is a link to nothing yet: this app has no home page, and an
                      anchor to `/` would land on a redirect to step one, which is a
                      logo that quietly restarts your work. */}
                  <span
                    style={{
                      fontFamily: 'var(--fm-font-mono)',
                      fontSize: 'var(--fm-text-base)',
                      fontWeight: 'var(--fm-font-weight-bold)',
                    }}
                  >
                    fabiomenchicchi
                    <span style={{ color: 'var(--fm-color-primary)' }}>
                      .com
                    </span>
                  </span>
                  {/* What it builds FOR, said once and in the chrome rather than on
                  every page: a person arriving cold needs to know whose theme this
                  is before they know what a rung is. */}
                  <span
                    style={{
                      color: 'var(--fm-color-muted-foreground)',
                      fontSize: 'var(--fm-text-sm)',
                    }}
                  >
                    Theme builder · @fmmenchi/ui
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
                {/* THE TWO THINGS THAT ARE NOT STEPS, side by side: the shell's theme
                (a question, so a radio group — `ThemeSwitcher`) and the preview (a
                navigation, so a link). Same row, different components, and the
                difference is the point: ADR-0025's line between the two runs
                through this header. */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--fm-space-inline-m)',
                    alignItems: 'center',
                  }}
                >
                  <ThemeSwitcher />
                  <Nav label="View">
                    <NavLink asChild current={railOpen}>
                      <Link to={withPreview(pathname, search, !railOpen)}>
                        Show the preview
                      </Link>
                    </NavLink>
                  </Nav>
                </div>
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
                      current={step.slug === currentStep}
                    >
                      <Link to={withPreview(pathOf(step), search, railOpen)}>
                        {step.label}
                      </Link>
                    </NavLink>
                  ))}
                </Nav>
              </AppLayoutNav>

              {/* The class makes `main` the scroll container while the rail is
                docked (`styles.css`); below the swap it changes nothing. */}
              <AppLayoutMain className="theme-builder-main">
                {children}
              </AppLayoutMain>

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
                  /* PLACEMENT LIVES IN `styles.css`, not here, because it differs
                     either side of the shell's swap and an inline style cannot ask
                     a container query. It was `align-self: start; position: sticky;
                     max-block-size: 100dvh` inline — the shell's "page scrolls,
                     column sticks" model — and that gave the page a second scrollbar
                     for as long as the rail was open: the rail's content is taller
                     than any window, so the cap became the row's height and the
                     document was header + 100dvh + footer on every step. Docked, the
                     shell is now the window and `main` scrolls; see the stylesheet. */
                  className="theme-builder-rail"
                  style={{
                    borderRadius: 0,
                    borderBlock: 'none',
                    borderInlineEnd: 'none',
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
                    {/* ONE CONTROL, AND IT IS A GLYPH. `aria-label` carries the name
                      because the × cannot: `icon` and `iconEnd` on `Button` are
                      DECORATIVE by contract, and a lone "×" read aloud is
                      "multiplication sign". So the visible mark and the announced name
                      are set separately, which is the only way an icon-only control is
                      honest.

                      It is a LINK, not a button: closing the rail is dropping a search
                      param, so the browser can do it — middle-click, the status bar, no
                      JavaScript at all. */}
                    <Button
                      as={Link}
                      to={withPreview(pathname, search, false)}
                      variant="ghost"
                      size="sm"
                      aria-label="Hide the preview"
                    >
                      ×
                    </Button>
                  </div>

                  <ThemePreview />
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

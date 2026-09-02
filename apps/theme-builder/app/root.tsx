import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  type LinksFunction,
  type MetaFunction,
} from 'react-router';

import { UiProvider } from '@fmmenchi/ui';
import { AppLayout } from '@fmmenchi/ui/app-layout';
import { AppLayoutMain } from '@fmmenchi/ui/app-layout-main';
import { AppLayoutNav } from '@fmmenchi/ui/app-layout-nav';
import { Nav } from '@fmmenchi/ui/nav';
import { NavLink } from '@fmmenchi/ui/nav-link';
import { Separator } from '@fmmenchi/ui/separator';

import {
  useRhfErrors,
  useRhfField,
  useRhfOptionField,
} from '@fmmenchi/ui-form-ports/react-hook-form';

import { BasesProvider } from './bases';
import { RampProvider } from './ramp';
import { RoleOverridesProvider } from './role-overrides';
import { FIRST_STEP, STEPS, pathOf, slugOf, stepPath } from './steps';
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
export function Layout({ children }: { children: React.ReactNode }) {
  // `current` PASSED EXPLICITLY, and it has to be. Without a `UiProvider` the
  // design system's `NavLink` falls back to working out the location itself, which
  // the server does not have — so the class and `aria-current` would differ between
  // the two renders. Read from the router instead: it knows the path on both sides.
  const { pathname, search } = useLocation();
  const onPreview = pathname === '/preview';
  const currentStep = slugOf(pathname);

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
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Two stores, and both above the routes because both outlive a step: the bases a
 * person picked must survive walking to the palette and back, and the draft has to
 * be readable from the preview, which is a sibling route rather than a child.
 */
export default function App() {
  return (
    // THE FORM BINDING IS GIVEN ONCE, like i18n or a Link — so every form below
    // works with nothing further to wire, and nothing below this line names
    // react-hook-form. Swapping the library is these two functions.
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        /*
         * ALL THREE HOOKS, and the missing one was found by rendering rather than by
         * typechecking: `optionField` is what a group of controls sharing one name
         * needs — a segmented control, a radio group — and without it
         * `FormSegmentedControl` throws at render. The binding is a set, so taking
         * two of its three parts is not a smaller binding, it is a broken one.
         *
         * The error said exactly that, which is why this cost a minute rather than
         * an afternoon: "the form binding provides no `optionField` … every binding
         * in @fmmenchi/ui-form-ports ships one".
         */
        form: {
          field: useRhfField,
          optionField: useRhfOptionField,
          errors: useRhfErrors,
        },
      }}
    >
      <BasesProvider>
        <RampProvider>
          <RoleOverridesProvider>
            <Outlet />
          </RoleOverridesProvider>
        </RampProvider>
      </BasesProvider>
    </UiProvider>
  );
}

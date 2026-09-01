import {
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
import { Badge } from '@fmmenchi/ui/badge';
import { Nav } from '@fmmenchi/ui/nav';
import { NavGroup } from '@fmmenchi/ui/nav-group';
import { NavLink } from '@fmmenchi/ui/nav-link';
import { Separator } from '@fmmenchi/ui/separator';

import {
  useRhfErrors,
  useRhfField,
  useRhfOptionField,
} from '@fmmenchi/ui-form-ports/react-hook-form';

import { BasesProvider } from './bases';
import { DraftThemeProvider } from './draft-theme';
import { RampProvider } from './ramp';
import { RoleOverridesProvider } from './role-overrides';
import { STEPS, pathOf, slugOf } from './steps';
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
  const { pathname } = useLocation();
  const onPreview = pathname === '/preview';
  const currentStep = slugOf(pathname);

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
            <Badge variant={onPreview ? 'accent' : 'primary'}>
              {onPreview ? 'Preview' : 'Building'}
            </Badge>
          </header>

          <AppLayoutNav label="Main">
            <Nav label="Main" orientation="vertical">
              {/* THERE IS NO "BUILD" LINK, and there was one. It pointed at `/`,
                  which was step one's route — so it and "Brand colours" were two
                  items for one page, and its `current={!onPreview}` made it claim
                  `aria-current` on EVERY step: measured in a browser, two current
                  pages announced in one nav. The group label below is what named
                  this section, and it still does.

                  The steps are repeated here so the wizard is navigable without the
                  stepper — which is chrome for ORIENTATION and reads best as a row.
                  Two views of one list, both from `STEPS`. */}
              <NavGroup label="Steps">
                {STEPS.map((step) => (
                  <NavLink
                    key={step.slug}
                    href={pathOf(step)}
                    current={!onPreview && step.slug === currentStep}
                  >
                    {step.label}
                  </NavLink>
                ))}
              </NavGroup>
              <NavLink href="/preview" current={onPreview}>
                Preview
              </NavLink>
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
            <p style={{ margin: 0, maxWidth: 'var(--fm-size-prose)' }}>
              Built with <code>@fmmenchi/ui</code> and the token contract it
              reads. The palette is generated by <code>generatePalette</code>;
              the preset is installed by{' '}
              <code>nx g @fmmenchi/nx-theme-generator:theme</code>.
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
            <DraftThemeProvider>
              <Outlet />
            </DraftThemeProvider>
          </RoleOverridesProvider>
        </RampProvider>
      </BasesProvider>
    </UiProvider>
  );
}

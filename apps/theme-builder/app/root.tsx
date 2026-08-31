import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
  type MetaFunction,
} from 'react-router';

import { AppLayout } from '@fmmenchi/ui/app-layout';
import { AppLayoutMain } from '@fmmenchi/ui/app-layout-main';
import { AppLayoutNav } from '@fmmenchi/ui/app-layout-nav';
import { Nav } from '@fmmenchi/ui/nav';
import { NavLink } from '@fmmenchi/ui/nav-link';

import { BasesProvider } from './bases';
import { DraftThemeProvider } from './draft-theme';
import stylesheet from '../styles.css?url';

export const meta: MetaFunction = () => [{ title: 'Theme builder' }];

/**
 * No webfont, and that is a decision rather than an omission. `--fm-font-sans`
 * defaults to a system stack and an app is meant to override it; loading Inter
 * here would put a font in front of the tokens this app exists to show, and
 * whatever a person built would then look different in their own product.
 */
export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
];

/**
 * THE SHELL IS ON THE REFERENCE THEME, always.
 *
 * The chrome — navigation, the wizard's controls, everything a person clicks —
 * renders under `:root`, which is `@fmmenchi/tokens`' own theme. Only the preview
 * subtree is wrapped in the draft. The reason is a failure mode rather than
 * tidiness: a draft with a contrast pair below its floor would otherwise take
 * down the controls that would fix it, and a builder you cannot read is a builder
 * you cannot recover.
 *
 * Built with the design system's own `AppLayout`, because this app is also the
 * argument that the design system can carry a real product.
 */
export function Layout({ children }: { children: React.ReactNode }) {
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
          <header style={{ padding: 'var(--fm-space-inset-m)' }}>
            <strong>Theme builder</strong>
          </header>
          <AppLayoutNav label="Main">
            <Nav label="Main" orientation="vertical">
              <NavLink href="/">Build</NavLink>
              <NavLink href="/preview">Preview</NavLink>
            </Nav>
          </AppLayoutNav>
          <AppLayoutMain>{children}</AppLayoutMain>
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
    <BasesProvider>
      <DraftThemeProvider>
        <Outlet />
      </DraftThemeProvider>
    </BasesProvider>
  );
}

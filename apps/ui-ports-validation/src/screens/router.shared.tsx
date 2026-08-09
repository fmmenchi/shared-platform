import { Nav, NavLink } from '@fmmenchi/ui';

/**
 * ONE menu, every router.
 *
 * The paths are not decoration. `/settings` and `/settings/profile` are the
 * page-versus-section pair; `/team` and `/teams` are the segment boundary a
 * naive prefix match gets wrong; and the last entry leaves the app entirely,
 * which is the destination no router should ever be asked about.
 */
export const PATHS = [
  '/settings',
  '/settings/profile',
  '/pricing',
  '/team',
  '/teams',
] as const;

export const LABELS: Record<string, string> = {
  '/settings': 'Settings',
  '/settings/profile': 'Profile',
  '/pricing': 'Pricing',
  '/team': 'Team',
  '/teams': 'Teams',
};

export function Menu() {
  return (
    <Nav label="Main">
      {PATHS.map((path) => (
        <NavLink key={path} href={path}>
          {LABELS[path]}
        </NavLink>
      ))}
      <NavLink href="https://example.com/settings">Elsewhere</NavLink>
    </Nav>
  );
}

/** What every router screen is driven with. */
export interface RouterScreenProps {
  /** Where the reader is, in the router's own space (no basename). */
  at: string;
  /** Mounted under a prefix — the thing a string matcher cannot know. */
  basename?: string;
}

/**
 * The signal that the router has RESOLVED, rendered by the matched route.
 *
 * TanStack resolves its first match asynchronously and React Router does not,
 * so without this the suite reads `aria-current` off a menu whose router has
 * not answered yet — and reads it differently on each engine. Waiting for the
 * menu is not enough: the menu renders immediately in both.
 */
export function Resolved({ path }: { path: string }) {
  return <span data-testid="resolved">{path}</span>;
}

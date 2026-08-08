/**
 * Does this destination contain, or equal, where the reader already is?
 *
 * A PURE FUNCTION over two strings, which is the shape the architecture asks
 * for when behaviour is framework-coupled — no router imported, nothing
 * subscribed. The app extracts its own path once (`usePathname()`,
 * `useLocation().pathname`, `useRouterState(…)`) and hands both in.
 *
 * It is not the seam. The seam is `useIsCurrent` on `UiProvider`; this is what
 * an app plugs INTO it in one line, so that every app with a plain string path
 * does not write the same three edge cases differently:
 *
 *     useIsCurrent: (href) => pathIsCurrent(usePathname(), href)
 *
 * The three, all of them real:
 *
 * - **the root is a prefix of everything.** `/` would make every entry in the
 *   navigation "the section you are in". React Router special-cases it too —
 *   `<NavLink to="/">` ignores `end` and matches only the root — and so does
 *   this: `/` is `'page'` or nothing, never `'location'`.
 * - **a trailing slash and a query are not a different page.** `/a/`, `/a?x=1`
 *   and `/a#top` are all `/a` here.
 * - **a segment boundary, not a string prefix.** `/team` must not light up for
 *   `/teams` — the check is on the segment, which `startsWith` alone gets
 *   wrong and is the commonest way this is written badly.
 *
 * What it deliberately cannot know: a basename, a locale prefix, typed params.
 * Pass a path the router has already RESOLVED, and give the links `href`s in
 * that same space.
 */
export function pathIsCurrent(
  currentPath: string | undefined,
  href: string | undefined,
): 'page' | 'location' | undefined {
  if (!currentPath || !href) return undefined;

  const clean = (value: string) => {
    const path = value.split(/[?#]/)[0] ?? '';
    return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  };

  const here = clean(currentPath);
  const target = clean(href);

  if (here === target) return 'page';
  // The root claims nothing, and the SEGMENT check is already what says so:
  // `/` + `/` is `//`, which no path starts with. Guarding `'/'` separately was
  // dead code — proven by deleting it and watching every test stay green. What
  // is NOT dead is the empty target, which a bare `?x=1` cleans down to and
  // which would otherwise prefix-match the whole site.
  if (target === '') return undefined;
  return here.startsWith(`${target}/`) ? 'location' : undefined;
}

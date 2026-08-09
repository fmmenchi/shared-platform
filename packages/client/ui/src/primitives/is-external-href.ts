/**
 * Does this destination leave the app?
 *
 * A pure string test, and deliberately origin-free: it never reads
 * `window.location`. The package fails its own SSR guard on a module-scope DOM
 * read, and a link that resolved differently on the server and the client would
 * hydrate into a different element — the worst kind of difference, because it
 * looks right until the first click.
 *
 * So the rule is what the URL SAYS, not where it lands:
 *
 * - a scheme — `https:`, `mailto:`, `tel:`, and anything else with one;
 * - protocol-relative `//host/path`.
 *
 * Which means an absolute URL to your OWN site reads as external. That is the
 * safe default rather than an oversight: writing the origin out is an explicit
 * act, the router would have to re-parse it anyway, and `as` is there to say
 * otherwise for the one link where you meant it.
 */
export function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  // `//host` — a protocol-relative URL, external by definition.
  if (href.startsWith('//')) return true;
  // A scheme, per RFC 3986: letter, then letters/digits/`+`/`-`/`.`, then `:`.
  // Anchored, so a path segment containing a colon (`/a/b:c`) is not one.
  return /^[a-z][a-z0-9+\-.]*:/i.test(href);
}

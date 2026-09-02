import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * NO IN-APP DESTINATION IS REACHED BY A PLAIN ANCHOR, because in this app a plain
 * anchor is a data loss.
 *
 * Every choice a person makes lives in memory — the seven bases, the two ramps, the
 * per-scheme role overrides — so one full document load is the whole wizard gone.
 * That is not a hypothetical: the sidebar in `root.tsx` was the design system's
 * `NavLink` with an `href`, which renders a plain anchor when no router is in scope,
 * and it renders in `Layout`, above the route tree, where `UiProvider`'s `Link` port
 * can never be. Measured in a browser: every click reloaded the document, a brand
 * colour set to `#aa3311` came back `#3072c1`, and the pair of theme files exported
 * afterwards was the design system's own theme rather than the one somebody built.
 *
 * A SOURCE CHECK rather than a rendering one, and deliberately: the defect is a
 * missing router, so a test that supplies a router to look for it would be testing
 * the wrong world. What can be stated once and cheaply is that no source in this app
 * hands an in-app path to something that is not the router's link.
 *
 * WHAT IS ALLOWED IS THE SHORT LIST: an in-page fragment (`#preview`), and an
 * absolute URL to somewhere else (`https:`, `mailto:`). EVERYTHING ELSE FAILS,
 * expressions included — and that width was bought by getting it wrong here first.
 * The rule was "no href starting with `/`", which the actual bug walked straight
 * past: it was `href={pathOf(step)}`, an expression, so there was no `/` to see. A
 * guard that has to recognise a path is a guard that can be handed a path it does not
 * recognise.
 */
const appDir = join(dirname(fileURLToPath(import.meta.url)), '../app');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('in-app navigation', () => {
  const files = sources(appDir);

  it('reads every source, so a new file cannot slip past', () => {
    // A guard over a directory has to prove it found the directory: an empty sweep
    // passes every assertion below and says nothing.
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((f) => f.endsWith('root.tsx'))).toBe(true);
  });

  it('uses no href at all but a fragment or an absolute external URL', () => {
    const allowed = /^(?:#|https?:|mailto:)/;
    const found: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // Both spellings, because only one of them was the bug: a string literal and
      // ANY expression. An expression is judged by being one — its value is not
      // knowable here, and every value it could hold in this app is the router's job.
      for (const match of src.matchAll(/href=(?:"([^"]*)"|\{[^}]*\})/g)) {
        const literal = match[1];
        if (literal !== undefined && allowed.test(literal)) continue;
        found.push(`${file.slice(appDir.length + 1)}: ${match[0]}`);
      }
    }

    expect(
      found,
      `${found.length} href(s) that should be the router's link — use React Router's ` +
        `Link (via NavLink's \`asChild\`, or the \`Link\` port on UiProvider where it is in ` +
        `scope). Only \`#fragment\` and absolute external URLs belong in an href here:\n  ` +
        found.join('\n  '),
    ).toEqual([]);
  });

  it('passes `pathOf`/`stepPath` results to a router link, never to an href', () => {
    // The specific shape the bug had: a step's own path, computed correctly, handed
    // to something that turns it into a page load.
    const offenders = files.filter((file) =>
      /href=\{(?:pathOf|stepPath)\(/.test(readFileSync(file, 'utf8')),
    );

    expect(offenders, offenders.join(', ')).toEqual([]);
  });
});

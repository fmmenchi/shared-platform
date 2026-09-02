import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useStepLink } from '../app/steps';

/**
 * CHANGING STEP MUST NOT CLOSE THE PREVIEW, which it did for every button in the
 * wizard and every link in the sidebar.
 *
 * Whether the rail is open is a fact about the URL — that is what makes it linkable,
 * reload-proof, and openable with an anchor rather than a handler. The cost of that
 * choice is that every navigation has to CARRY it, and `stepPath` returns a bare
 * pathname, so seven call sites each dropped the query on the way out. The rail
 * exists to be watched while the theme changes, and changing step is when it changes
 * most, so the one moment it was guaranteed to vanish was the one that mattered.
 *
 * BOTH HALVES ARE TESTED, because either alone lets the bug back. The behaviour says
 * the hook carries the param; the source check says nothing bypasses the hook. The
 * second is the one that would have caught the original — the code was correct about
 * WHERE a step lives and silent about what it took with it.
 */

describe('useStepLink', () => {
  function linkFrom(url: string, slug: string): string {
    let seen = '';
    function Probe() {
      seen = useStepLink()(slug);
      return null;
    }
    render(
      <MemoryRouter initialEntries={[url]}>
        <Probe />
      </MemoryRouter>,
    );
    return seen;
  }

  it('carries an open preview across a step change', () => {
    expect(linkFrom('/steps/brand-colours?preview=1', 'palette')).toBe(
      '/steps/palette?preview=1',
    );
  });

  it('does not invent one when the rail is closed', () => {
    expect(linkFrom('/steps/brand-colours', 'palette')).toBe('/steps/palette');
  });

  it('leaves a closed rail closed even with other query in play', () => {
    // `withPreview` keeps the rest of the query, and that must not be read as the
    // rail being open: `preview` is the only param today, and the day it is not,
    // an unrelated one must not drag the panel open.
    expect(linkFrom('/steps/brand-colours?other=x', 'roles')).toBe(
      '/steps/roles?other=x',
    );
  });

  it('throws on a slug that is not a step, as `stepPath` does', () => {
    expect(() => linkFrom('/steps/brand-colours', 'nope')).toThrow(/nope/);
  });
});

describe('every step navigation goes through it', () => {
  const appDir = join(dirname(fileURLToPath(import.meta.url)), '../app');

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry) ? [path] : [];
    });
  }

  it('hands no BARE step path to a link or a navigate', () => {
    // The exact shape of the regression: the right path, computed the right way,
    // handed straight to navigation with the query left behind. `root.tsx` is
    // allowed its `pathOf` because it wraps it in `withPreview` itself — it already
    // holds `railOpen`, so a hook that re-derives it would be the second answer.
    const offenders: string[] = [];
    for (const file of sources(appDir)) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(
        /(?:to=\{|navigate\()\s*(?:stepPath|pathOf)\(/g,
      )) {
        offenders.push(`${file.slice(appDir.length + 1)}: ${match[0].trim()}`);
      }
    }

    expect(
      offenders,
      `${offenders.length} step navigation(s) that drop the query, and with it the ` +
        `preview rail — go through \`useStepLink\` (or wrap in \`withPreview\`):\n  ` +
        offenders.join('\n  '),
    ).toEqual([]);
  });
});

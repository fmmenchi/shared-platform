import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { parseTheme } from '@fmmenchi/theme';
import { describe, expect, it } from 'vitest';

/**
 * EVERY `var(--fm-*)` THIS APP WRITES IS A TOKEN THE DESIGN SYSTEM DECLARES.
 *
 * The most silent defect there is: a custom property nobody declared does not error,
 * does not warn, and does not fall back to anything useful — the declaration is
 * simply dropped, so a `gap` disappears and a `font-size` stays inherited. The page
 * still renders, and it renders WRONG in a way that looks like a design choice.
 *
 * It cost three tokens in one file to learn, all in the same afternoon, and the
 * reason is worth writing down: THE SCALES DO NOT AGREE ON THEIR OWN SUFFIXES.
 * Type is `xs · sm · base · lg · xl`, spacing is `s · m · l`. So
 * `--fm-space-inline-s` is right and `--fm-text-s` is nothing, one letter apart —
 * and `--fm-space-inline-xs` does not exist at all, while `--fm-text-xs` does.
 *
 * Read from the INSTALLED `vars.css` through the package's own `exports`, so this
 * follows the token contract rather than a copy of it: a token removed upstream
 * fails here on the next install.
 *
 * A ROLE is exempt from nothing — it is a token like any other. What this cannot see
 * is a token used in a `.css` file rather than in TS, which this app does not have,
 * and Stylelint covers in the packages that do.
 */
const require = createRequire(import.meta.url);
const declared = parseTheme(
  readFileSync(require.resolve('@fmmenchi/tokens/styles/vars.css'), 'utf8'),
);

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });

describe('the tokens this app references', () => {
  it('are all declared by @fmmenchi/tokens', () => {
    const missing: string[] = [];

    for (const file of sources('app')) {
      const contents = readFileSync(file, 'utf8');
      for (const match of contents.matchAll(/var\((--fm-[a-z0-9-]+)\)/g)) {
        const name = match[1] as string;
        if (!declared.has(name)) missing.push(`${file}: ${name}`);
      }
    }

    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('would notice a token that does not exist', () => {
    // The check above passes when there is nothing to find, which is
    // indistinguishable from a check that finds nothing. This is the difference.
    expect(declared.has('--fm-space-inline-s')).toBe(true);
    expect(declared.has('--fm-text-s')).toBe(false);
    expect(declared.has('--fm-space-inline-xs')).toBe(false);
  });
});

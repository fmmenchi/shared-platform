import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import {
  editingScheme,
  useEditingScheme,
  withScheme,
} from '../app/editing-scheme';
import { useStepLink } from '../app/steps';

/**
 * ONE QUESTION, ASKED ONCE. Step one, step two, step three and the preview rail each
 * held their own idea of which theme was being worked on, so setting one and walking
 * to another silently changed the answer.
 *
 * The state is the URL, which buys two things this file holds to: it survives a
 * reload, and `useStepLink` carries the whole query, so the scheme follows a step
 * change without a line written for it. The last test is the one that keeps the
 * four from growing back.
 */

describe('editingScheme', () => {
  it('is light unless the URL says dark', () => {
    expect(editingScheme('')).toBe('light');
    expect(editingScheme('?scheme=dark')).toBe('dark');
    expect(editingScheme('?scheme=light')).toBe('light');
  });

  it('reads anything that is not `dark` as light', () => {
    // One spelling for "the other theme", so "absent" has one spelling too — the
    // same shape `preview-open.ts` uses for its own param.
    expect(editingScheme('?scheme=sepia')).toBe('light');
    expect(editingScheme('?scheme=')).toBe('light');
  });
});

describe('withScheme', () => {
  it('writes dark and DROPS the param for light', () => {
    expect(withScheme('/steps/palette', '', 'dark')).toBe(
      '/steps/palette?scheme=dark',
    );
    expect(withScheme('/steps/palette', '?scheme=dark', 'light')).toBe(
      '/steps/palette',
    );
  });

  it('keeps the rest of the query, the preview above all', () => {
    // These two live in the query together, and the rail closing because somebody
    // switched theme would be the bug this app already fixed once.
    expect(withScheme('/steps/roles', '?preview=1', 'dark')).toBe(
      '/steps/roles?preview=1&scheme=dark',
    );
    expect(withScheme('/steps/roles', '?preview=1&scheme=dark', 'light')).toBe(
      '/steps/roles?preview=1',
    );
  });
});

describe('useEditingScheme', () => {
  function at(url: string) {
    let seen: readonly [string, unknown] | null = null;
    function Probe() {
      seen = useEditingScheme();
      return null;
    }
    render(
      <MemoryRouter initialEntries={[url]}>
        <Probe />
      </MemoryRouter>,
    );
    return seen?.[0];
  }

  it('reports what the URL holds', () => {
    expect(at('/steps/roles')).toBe('light');
    expect(at('/steps/roles?scheme=dark')).toBe('dark');
  });
});

describe('a step change carries it', () => {
  it('keeps the scheme, and the preview with it', () => {
    // Not a property of this module but OF THE PAIR, and the reason the URL was
    // chosen over a store: `useStepLink` keeps the whole query, so neither of
    // these needed a line of its own.
    let link = '';
    function Probe() {
      link = useStepLink()('roles');
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/steps/palette?preview=1&scheme=dark']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(link).toBe('/steps/roles?preview=1&scheme=dark');
  });
});

describe('nothing keeps a second answer', () => {
  const appDir = join(dirname(fileURLToPath(import.meta.url)), '../app');

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry) ? [path] : [];
    });
  }

  it('holds no local scheme state outside this module', () => {
    // The shape the four switches had: a step or a panel keeping its own idea of
    // which theme is being edited. `theme-choice.ts` is a different question — what
    // the SHELL wears — and does not match this, holding no `Scheme` state at all.
    const offenders: string[] = [];
    for (const file of sources(appDir)) {
      if (file.endsWith('editing-scheme.tsx')) continue;
      const src = readFileSync(file, 'utf8');
      if (/useState<Scheme>|useState<Scheme \| null>/.test(src)) {
        offenders.push(file.slice(appDir.length + 1));
      }
    }

    expect(
      offenders,
      `${offenders.length} file(s) keeping their own editing scheme — use ` +
        `\`useEditingScheme\`, so the answer is the same everywhere:\n  ` +
        offenders.join('\n  '),
    ).toEqual([]);
  });
});

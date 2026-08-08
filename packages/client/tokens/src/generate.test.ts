import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readVars,
  renderDtcg,
  renderProperties,
  toIndependentLength,
} from './generate.js';
import { REGISTERED_SECTIONS } from './registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), 'utf8');
const values = readVars(read('./styles/vars.css'));

/**
 * THE COMMITTED FILES ARE WHAT THE CONTRACT WOULD WRITE.
 *
 * The generated artifacts have to be committed — the package exposes `src/`
 * through the `@fmmenchi/source` condition, so consumers read them directly —
 * and a committed generated file is one somebody can edit by hand. That is the
 * whole failure mode of generating anything: the single source quietly becomes
 * two again, and the second one wins because it is the one on disk.
 *
 * `toMatchFileSnapshot` closes it with no new machinery: the snapshot IS the
 * shipped file, so an edit by hand fails the ordinary test run, and a
 * legitimate change is `vitest -u`.
 */
describe('generated artifacts', () => {
  it('writes properties.css from the contract', async () => {
    await expect(renderProperties(values)).toMatchFileSnapshot(
      './styles/properties.css',
    );
  });

  it('writes the DTCG file from the values', async () => {
    await expect(renderDtcg(values)).toMatchFileSnapshot('./tokens.json');
  });
});

describe('the generator itself', () => {
  it('reads a variable and its value, not the prose around them', () => {
    const parsed = readVars(`
      /* --fm-color-fake: not-a-real-token; */
      :root {
        --fm-color-primary: oklch(41% 0.135 255);
        --fm-space-inset-m:   1.5rem;
      }
    `);

    expect(parsed.get('--fm-color-primary')).toBe('oklch(41% 0.135 255)');
    // Whitespace normalised, so a reformat of `vars.css` cannot change the
    // generated output and make the snapshot fail for nothing.
    expect(parsed.get('--fm-space-inset-m')).toBe('1.5rem');
    // A declaration inside a comment is not a declaration. It only matters
    // because `vars.css` documents roles in prose above them.
    expect(parsed.has('--fm-color-fake')).toBe(false);
  });

  it('converts a length to one the browser will accept', () => {
    // `initial-value` has to be computationally independent, and `rem` is not:
    // the browser rejects the whole `@property` rule, silently, and the token
    // loses its type. Converted from the real value rather than restated beside
    // it — which is what the hand-written file did, with nothing to fail if the
    // two stopped agreeing.
    expect(toIndependentLength('0.25rem')).toBe('4px');
    expect(toIndependentLength('0.375rem')).toBe('6px');
    expect(toIndependentLength('0.75rem')).toBe('12px');
    // Already independent: left alone.
    expect(toIndependentLength('4px')).toBe('4px');
  });

  it('registers every colour role and every radius, and nothing else', () => {
    const registered = REGISTERED_SECTIONS.flatMap((section) => section.vars);

    // The sections are the same partition `COLOR_ROLES` is assembled from, so
    // this is really asking whether that partition still covers it — the
    // question the hand-written headings answered wrongly for as long as
    // `error` had been a status family.
    expect(new Set(registered).size).toBe(registered.length);
    for (const name of registered) {
      expect(values.has(name), `${name} is registered but never defined`).toBe(
        true,
      );
    }
  });
});

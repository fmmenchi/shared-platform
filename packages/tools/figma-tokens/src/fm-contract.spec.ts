/**
 * The safety net.
 *
 * These assertions run against the REAL stylesheet of `@fmmenchi/tokens`, read
 * by relative path. That path is a deliberate coupling and the only one this
 * package has: `scope:tools` may not depend on `scope:client`, so the contract
 * cannot be imported — but a mapping nobody checks against the thing it maps is
 * worth nothing. If the tokens package moves, this fails loudly, which is the
 * correct outcome.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPayload } from './payload.js';
import { parseCustomProperties } from './parse.js';
import { FM_CONTRACT } from './fm-contract.js';

const here = dirname(fileURLToPath(import.meta.url));
const stylesDir = join(here, '../../../client/tokens/src/styles');

const varsCss = readFileSync(join(stylesDir, 'vars.css'), 'utf8');
const darkCss = readFileSync(join(stylesDir, 'presets/dark.css'), 'utf8');

const payload = buildPayload(varsCss, FM_CONTRACT);

describe('the @fmmenchi/tokens contract', () => {
  it('accounts for EVERY declared property — mapped or skipped, never neither', () => {
    // The assertion the whole package exists for: add a token to vars.css
    // without deciding what it becomes in Figma, and this fails.
    expect(payload.problems).toEqual([]);

    const declared = parseCustomProperties(varsCss).size;
    expect(payload.variables.length + payload.skipped.length).toBe(declared);
  });

  it('maps a family role, its foreground and its bare default to the right paths', () => {
    const path = (cssVar: string) =>
      payload.variables.find((v) => v.cssVar === cssVar)?.path;
    expect(path('--fm-color-primary')).toBe('color/primary/default');
    expect(path('--fm-color-primary-subtle-foreground')).toBe(
      'color/primary/subtle-foreground',
    );
    expect(path('--fm-color-success-border')).toBe('color/success/border');
    expect(path('--fm-color-background')).toBe('color/surface/background');
    expect(path('--fm-color-disabled')).toBe('color/neutral/disabled');
    expect(path('--fm-color-input')).toBe('color/input/default');
    expect(path('--fm-radius-sm')).toBe('radius/sm');
  });

  it('scopes a variable to the property it actually governs', () => {
    const scopes = (cssVar: string) =>
      payload.variables.find((v) => v.cssVar === cssVar)?.scopes;
    expect(scopes('--fm-color-primary-foreground')).toEqual(['TEXT_FILL']);
    expect(scopes('--fm-color-ring')).toEqual(['STROKE_COLOR']);
    expect(scopes('--fm-color-primary')).toEqual(['FRAME_FILL', 'SHAPE_FILL']);
    expect(scopes('--fm-leading-base')).toEqual(['LINE_HEIGHT']);
  });

  it('gives every skipped property a reason', () => {
    expect(payload.skipped.length).toBeGreaterThan(0);
    for (const skip of payload.skipped) expect(skip.reason).not.toBe('');
  });

  it('keeps every colour inside sRGB', () => {
    // A tripwire, not a law of nature: `oklch()` can describe colours sRGB
    // cannot, and Figma has no wide-gamut variable. If this ever fails, the new
    // token genuinely renders differently in Figma than in the browser — decide
    // that deliberately rather than discover it in a review.
    expect(payload.variables.filter((v) => v.clipped)).toEqual([]);
  });

  it('overrides in the dark preset only properties the contract already knows', () => {
    // Dark is a complete second theme, which on a Figma plan with variable
    // modes would be a second mode. Everything it overrides must be a property
    // the mapping has already decided about — otherwise the preset and the
    // contract describe different systems.
    const known = new Set([
      ...payload.variables.map((v) => v.cssVar),
      ...payload.skipped.map((s) => s.cssVar),
    ]);
    const overridden = [...parseCustomProperties(darkCss).keys()];

    expect(overridden.length).toBeGreaterThan(0);
    expect(overridden.filter((cssVar) => !known.has(cssVar))).toEqual([]);
  });

  it('carries the dark preset only partly into Figma, and says which part', () => {
    // Worth pinning: dark re-declares the shadows too, and shadows are among
    // the properties that cannot be Figma variables at all. So even a plan with
    // variable modes would not carry the whole preset across.
    const skipped = new Set(payload.skipped.map((s) => s.cssVar));
    const overridden = [...parseCustomProperties(darkCss).keys()];

    const portable = overridden.filter((cssVar) => !skipped.has(cssVar));
    const unportable = overridden.filter((cssVar) => skipped.has(cssVar));

    expect(portable.length).toBeGreaterThan(0);
    expect(
      unportable.every((cssVar) => cssVar.startsWith('--fm-shadow-')),
    ).toBe(true);
  });
});

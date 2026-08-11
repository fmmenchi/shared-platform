import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter, parse as parseColor } from 'culori';
import { renderDtcgBase, renderDtcgOverrides } from './dtcg.js';
import { readVars } from './generate.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), 'utf8');

/**
 * Same discipline as `generate.test.ts`, for the same reason: the committed
 * JSON is what the contract would write, `toMatchFileSnapshot` makes a hand
 * edit fail the ordinary run, and existence is asserted separately because a
 * missing snapshot file is WRITTEN and reported green outside CI.
 */
describe('the DTCG export', () => {
  it('writes base.json from the contract and the reference values', async () => {
    expect(existsSync(join(here, './dtcg/base.json'))).toBe(true);

    await expect(
      renderDtcgBase(readVars(read('./styles/vars.css'))),
    ).toMatchFileSnapshot('./dtcg/base.json');
  });

  it('writes dark.json from what the dark preset overrides', async () => {
    expect(existsSync(join(here, './dtcg/dark.json'))).toBe(true);

    await expect(
      renderDtcgOverrides('dark', readVars(read('./styles/presets/dark.css'))),
    ).toMatchFileSnapshot('./dtcg/dark.json');
  });

  it('resolves to valid JSON with the shapes a reader expects', () => {
    const base = JSON.parse(
      renderDtcgBase(readVars(read('./styles/vars.css'))),
    ) as Record<
      string,
      Record<string, { $value?: unknown }> & { $type?: string }
    >;

    // A sample per kind, so a parser regression fails with a NAME in it.
    expect(base['color']?.['$type']).toBe('color');
    // The DRAFT OBJECT, not the CSS string — the first attempt at this export
    // was removed for shipping `oklch(…)` as a string, which DTCG `color`
    // never is. The hex fallback rides along for sRGB-only readers.
    expect(base['color']?.['primary']).toEqual({
      $value: {
        colorSpace: 'oklch',
        components: [0.41, 0.135, 255],
        hex: expect.stringMatching(/^#[0-9a-f]{6}$/) as unknown,
      },
    });
    expect(base['radius']?.['sm']).toEqual({ $value: '0.25rem' });
    // A leading is a NUMBER — the calc evaluated, not shipped as a string.
    expect(base['leading']?.['base']).toEqual({ $value: 1.5 });
    // A font stack is an ARRAY, quotes unwrapped.
    expect(base['font']?.['mono']).toEqual({
      $value: expect.arrayContaining([
        'ui-monospace',
        'SFMono-Regular',
      ]) as unknown,
    });
    // A reference stays a REFERENCE: heading aliases sans, so a re-themed sans
    // re-themes headings in every tool that resolves aliases — the same reason
    // `tokenVars` exports var() strings rather than values.
    expect(base['font']?.['heading']).toEqual({ $value: '{font.sans}' });
    expect(base['font-weight']?.['bold']).toEqual({ $value: 700 });
  });

  /**
   * THE VALIDATOR THE LAST ATTEMPT LACKED. The removal note is explicit: a
   * snapshot only compares the file to itself, so nothing could tell whether
   * the file was RIGHT. The DTCG group publishes prose, not a normative JSON
   * Schema, so this is the rule set for every construct we emit — checked on
   * the COMMITTED files, which is what a consumer actually reads.
   */
  describe('every committed token satisfies the format it claims', () => {
    const files = {
      base: JSON.parse(read('./dtcg/base.json')) as Record<string, unknown>,
      dark: JSON.parse(read('./dtcg/dark.json')) as Record<string, unknown>,
    };
    const toOklch = converter('oklch');

    const entries = (doc: Record<string, unknown>) =>
      Object.entries(doc)
        .filter(
          (pair): pair is [string, Record<string, unknown>] =>
            !pair[0].startsWith('$') && typeof pair[1] === 'object',
        )
        .flatMap(([group, tokens]) =>
          Object.entries(tokens)
            .filter(([name]) => !name.startsWith('$'))
            .map(([name, token]) => ({
              group,
              name,
              type: (tokens as { $type?: string }).$type,
              value: (token as { $value?: unknown }).$value,
            })),
        );

    it.each(Object.entries(files))('%s', (_label, doc) => {
      for (const { group, name, type, value } of entries(doc)) {
        const where = `${group}.${name}`;
        expect(value, `${where} has no $value`).toBeDefined();

        // An alias must RESOLVE — against base, which is what a set stacks on.
        if (typeof value === 'string' && value.startsWith('{')) {
          const path = /^\{([a-z-]+)\.([a-z0-9-]+)\}$/.exec(value);
          expect(path, `${where}: malformed alias "${value}"`).not.toBeNull();
          const target = (files.base[path?.[1] ?? ''] ?? {}) as Record<
            string,
            unknown
          >;
          expect(
            target[path?.[2] ?? ''],
            `${where} aliases "${value}", which base.json does not define`,
          ).toBeDefined();
          continue;
        }

        switch (type) {
          case 'color': {
            const color = value as {
              colorSpace: string;
              components: number[];
              hex: string;
            };
            expect(color.colorSpace, where).toBe('oklch');
            expect(color.components, where).toHaveLength(3);
            // The hex fallback must NAME THE SAME COLOUR: parsed back through
            // a different culori path, it has to land on the oklch components
            // within an 8-bit quantisation step — the cross-check that makes
            // this more than the file agreeing with itself.
            const back = toOklch(parseColor(color.hex));
            expect(back, `${where}: hex does not parse`).toBeDefined();
            expect(
              Math.abs((back?.l ?? 0) - (color.components[0] ?? 0)),
              where,
            ).toBeLessThan(0.01);
            expect(
              Math.abs((back?.c ?? 0) - (color.components[1] ?? 0)),
              where,
            ).toBeLessThan(0.01);
            break;
          }
          case 'dimension':
            expect(String(value), where).toMatch(/^-?[\d.]+(rem|px)$/);
            break;
          case 'duration':
            expect(String(value), where).toMatch(/^[\d.]+m?s$/);
            break;
          case 'number':
          case 'fontWeight':
            expect(typeof value, where).toBe('number');
            expect(Number.isFinite(value as number), where).toBe(true);
            break;
          case 'fontFamily':
            expect(Array.isArray(value), where).toBe(true);
            for (const family of value as unknown[]) {
              expect(typeof family, where).toBe('string');
              expect((family as string).length, where).toBeGreaterThan(0);
            }
            break;
          default:
            throw new Error(`${where}: unknown group $type "${type}"`);
        }
      }
    });
  });

  it('keeps the dark set an OVERRIDE set, not a second contract', () => {
    const dark = JSON.parse(
      renderDtcgOverrides('dark', readVars(read('./styles/presets/dark.css'))),
    ) as Record<string, Record<string, unknown>>;

    // The dark preset re-colours; it does not re-measure. If a dimension group
    // ever appears here, the preset started overriding geometry and the
    // stacking story in the docs stopped being true.
    expect(dark['color']).toBeDefined();
    expect(dark['radius']).toBeUndefined();
    expect(dark['space']).toBeUndefined();

    // Every override names a role the contract has — a key that is not in base
    // would stack silently onto nothing.
    const base = JSON.parse(
      renderDtcgBase(readVars(read('./styles/vars.css'))),
    ) as Record<string, Record<string, unknown>>;
    for (const role of Object.keys(dark['color'] ?? {})) {
      if (role.startsWith('$')) continue;
      expect(
        base['color'],
        `dark overrides unknown role "${role}"`,
      ).toHaveProperty(role);
    }
  });
});

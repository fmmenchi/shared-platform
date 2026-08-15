import { describe, it, expect } from 'vitest';
import { buildPayload } from './payload.js';
import type { TokenContract } from './contract.types.js';

const contract = (over: Partial<TokenContract> = {}): TokenContract => ({
  name: 'test',
  rootFontSize: 16,
  rules: [],
  exclusions: [],
  ...over,
});

describe('buildPayload', () => {
  it('maps a property through the first rule that matches it', () => {
    const payload = buildPayload(
      ':root { --t-color-primary-hover: #ff0000; }',
      {
        ...contract(),
        rules: [
          {
            match: '--t-color-(.+)-(.+)',
            path: 'color/$1/$2',
            type: 'COLOR',
            scopes: ['FRAME_FILL'],
          },
        ],
      },
    );
    expect(payload.problems).toEqual([]);
    expect(payload.variables).toEqual([
      {
        cssVar: '--t-color-primary-hover',
        path: 'color/primary/hover',
        type: 'COLOR',
        css: '#ff0000',
        value: { r: 1, g: 0, b: 0, a: 1 },
        scopes: ['FRAME_FILL'],
      },
    ]);
  });

  it('substitutes the fallback when a capture group is empty', () => {
    const payload = buildPayload(':root { --t-color-primary: #ff0000; }', {
      ...contract(),
      rules: [
        {
          match: '--t-color-(primary)(?:-(.+))?',
          path: 'color/$1/$2|default',
          type: 'COLOR',
          scopes: ['FRAME_FILL'],
        },
      ],
    });
    expect(payload.variables[0]?.path).toBe('color/primary/default');
  });

  it('anchors a rule, so it cannot claim a longer property by prefix', () => {
    const payload = buildPayload(':root { --t-radius-sm-extra: 1rem; }', {
      ...contract(),
      rules: [
        {
          match: '--t-radius-sm',
          path: 'radius/sm',
          type: 'FLOAT',
          scopes: ['CORNER_RADIUS'],
        },
      ],
    });
    expect(payload.variables).toEqual([]);
    expect(payload.problems).toEqual([
      'unaccounted: --t-radius-sm-extra matches no rule and no exclusion',
    ]);
  });

  it('records a skipped property with the reason it was skipped', () => {
    const payload = buildPayload(':root { --t-z-modal: 40; }', {
      ...contract(),
      exclusions: [
        { match: '--t-z-.+', reason: 'stacking order is a DOM concept' },
      ],
    });
    expect(payload.variables).toEqual([]);
    expect(payload.problems).toEqual([]);
    expect(payload.skipped).toEqual([
      {
        cssVar: '--t-z-modal',
        css: '40',
        reason: 'stacking order is a DOM concept',
      },
    ]);
  });

  it('reports a property that matches no rule and no exclusion — the whole point', () => {
    const payload = buildPayload(':root { --t-color-brand-new: #123456; }', {
      ...contract(),
      rules: [
        {
          match: '--t-color-(primary)',
          path: 'color/$1',
          type: 'COLOR',
          scopes: ['FRAME_FILL'],
        },
      ],
      exclusions: [{ match: '--t-z-.+', reason: 'irrelevant here' }],
    });
    expect(payload.problems).toEqual([
      'unaccounted: --t-color-brand-new matches no rule and no exclusion',
    ]);
  });

  it('reports two properties that would land on the same Figma path', () => {
    const payload = buildPayload(':root { --t-a: 1rem; --t-b: 2rem; }', {
      ...contract(),
      rules: [
        {
          match: '--t-(a|b)',
          path: 'space/same',
          type: 'FLOAT',
          scopes: ['GAP'],
        },
      ],
    });
    expect(payload.variables).toHaveLength(1);
    expect(payload.problems).toEqual([
      'path collision: --t-a and --t-b both map to space/same',
    ]);
  });

  it('reports a value the rule type cannot convert, and keeps going', () => {
    const payload = buildPayload(
      ':root { --t-color-a: 1rem; --t-color-b: #00ff00; }',
      {
        ...contract(),
        rules: [
          {
            match: '--t-color-(.+)',
            path: 'color/$1',
            type: 'COLOR',
            scopes: ['FRAME_FILL'],
          },
        ],
      },
    );
    expect(payload.problems).toEqual(['--t-color-a: not a colour: 1rem']);
    expect(payload.variables.map((v) => v.cssVar)).toEqual(['--t-color-b']);
  });

  it('flags a clipped colour on the variable it clipped', () => {
    const payload = buildPayload(
      ':root { --t-color-vivid: oklch(70% 0.4 145); }',
      {
        ...contract(),
        rules: [
          {
            match: '--t-color-(.+)',
            path: 'color/$1',
            type: 'COLOR',
            scopes: ['FRAME_FILL'],
          },
        ],
      },
    );
    expect(payload.variables[0]?.clipped).toBe(true);
  });

  it('resolves rem against the contract root size, not a hardcoded 16', () => {
    const payload = buildPayload(':root { --t-space-m: 1rem; }', {
      ...contract({ rootFontSize: 10 }),
      rules: [
        {
          match: '--t-space-(.+)',
          path: 'space/$1',
          type: 'FLOAT',
          scopes: ['GAP'],
        },
      ],
    });
    expect(payload.variables[0]?.value).toBe(10);
  });
});

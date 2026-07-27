import { describe, expect, it } from 'vitest';
import { majorAlias } from './alias.js';

const P = 'gh-actions/v';

describe('majorAlias', () => {
  it('points the major at the latest exact version (semver order, not lexical)', () => {
    const tags = [
      'gh-actions/v0.0.2',
      'gh-actions/v0.0.10',
      'gh-actions/v0.0.9',
      '@fmmenchi/ui@0.0.6',
      'gh-actions/v0', // the alias itself — ignored
    ];
    expect(majorAlias(tags, P)).toEqual({
      alias: 'gh-actions/v0',
      target: 'gh-actions/v0.0.10',
    });
  });

  it('tracks the major boundary', () => {
    expect(majorAlias(['gh-actions/v0.9.0', 'gh-actions/v1.0.0'], P)).toEqual({
      alias: 'gh-actions/v1',
      target: 'gh-actions/v1.0.0',
    });
  });

  it('is null when no exact tag exists', () => {
    expect(majorAlias(['gh-actions/v0', '@fmmenchi/ci@0.0.5'], P)).toBeNull();
    expect(majorAlias([], P)).toBeNull();
  });
});

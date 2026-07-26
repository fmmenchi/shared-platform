import { describe, expect, it } from 'vitest';
import { isPackageTag, newTags } from './tags.js';

describe('isPackageTag', () => {
  it('accepts a scoped published-package tag', () => {
    expect(isPackageTag('@fmmenchi/ui@0.0.6')).toBe(true);
    expect(isPackageTag('@fmmenchi/nx-trivy@0.0.8')).toBe(true);
  });

  it('rejects a toolkit tag (no @, e.g. gh-actions/v*)', () => {
    expect(isPackageTag('gh-actions/v0.0.2')).toBe(false);
    expect(isPackageTag('gh-actions/v0')).toBe(false);
  });

  it('rejects a bare version tag', () => {
    expect(isPackageTag('v1.0.0')).toBe(false);
    expect(isPackageTag('')).toBe(false);
  });
});

describe('newTags', () => {
  it('returns only tags present in after but not before, sorted', () => {
    const before = ['@fmmenchi/ui@0.0.5', 'gh-actions/v0.0.1'];
    const after = [
      '@fmmenchi/ui@0.0.5',
      '@fmmenchi/ui@0.0.6',
      'gh-actions/v0.0.1',
      'gh-actions/v0.0.2',
    ];
    expect(newTags(before, after)).toEqual([
      '@fmmenchi/ui@0.0.6',
      'gh-actions/v0.0.2',
    ]);
  });

  it('is empty when nothing changed', () => {
    expect(newTags(['a@1.0.0'], ['a@1.0.0'])).toEqual([]);
  });
});

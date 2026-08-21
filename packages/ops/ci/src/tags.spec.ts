import { describe, expect, it } from 'vitest';
import { isPackageTag } from './tags.js';

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

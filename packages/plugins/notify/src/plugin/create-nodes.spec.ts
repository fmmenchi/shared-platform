import { describe, expect, it } from 'vitest';
import { announceTarget, isPublishable } from './create-nodes';

describe('isPublishable', () => {
  it('is true for a named, non-private package', () => {
    expect(isPublishable({ name: '@fmmenchi/ui' })).toBe(true);
  });

  it('is false for a private package or one with no name', () => {
    expect(isPublishable({ name: '@fmmenchi/ui', private: true })).toBe(false);
    expect(isPublishable({})).toBe(false);
  });
});

describe('announceTarget', () => {
  it('runs the matching announce executor', () => {
    expect(announceTarget('release').executor).toBe(
      '@fmmenchi/nx-notify:announce-release',
    );
    expect(announceTarget('error').executor).toBe(
      '@fmmenchi/nx-notify:announce-error',
    );
  });

  it('depends on the plugin build and is never cached (it posts to Slack)', () => {
    const t = announceTarget('release');
    expect(t.dependsOn).toEqual([
      { projects: ['@fmmenchi/nx-notify'], target: 'build' },
    ]);
    expect(t.cache).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { announceTarget, isReleasable } from './create-nodes';

describe('isReleasable', () => {
  it('is true for a named, non-private package', () => {
    expect(isReleasable({ name: '@fmmenchi/ui' })).toBe(true);
  });

  it('is false for a private package or one with no name', () => {
    // `private` means "not to a registry", NOT "not released": nx release tags and
    // cuts a GitHub Release for these too, and those are worth announcing.
    expect(isReleasable({ name: '@fmmenchi/gh-actions', private: true })).toBe(
      true,
    );
    expect(isReleasable({})).toBe(false);
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

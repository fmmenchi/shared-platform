import { describe, expect, it } from 'vitest';
import {
  assertReleaseGroups,
  formatTag,
  toReleaseRecords,
} from './release-result.js';
import type { ReleaseGroupSummary } from './release-result.types.js';

const groups: ReleaseGroupSummary[] = [
  {
    name: 'packages',
    projects: ['@fmmenchi/ui', '@fmmenchi/notify'],
    releaseTag: { pattern: '{projectName}@{version}' },
  },
  {
    name: 'gh-actions',
    projects: ['@fmmenchi/gh-actions'],
    releaseTag: { pattern: 'gh-actions/v{version}' },
  },
];

describe('formatTag', () => {
  it('fills the package pattern', () => {
    expect(formatTag('{projectName}@{version}', '@fmmenchi/ui', '0.6.1')).toBe(
      '@fmmenchi/ui@0.6.1',
    );
  });

  it('fills a pattern that names no project', () => {
    expect(
      formatTag('gh-actions/v{version}', '@fmmenchi/gh-actions', '0.1.0'),
    ).toBe('gh-actions/v0.1.0');
  });
});

describe('toReleaseRecords', () => {
  it('records every project that got a new version', () => {
    expect(
      toReleaseRecords(
        {
          '@fmmenchi/ui': { currentVersion: '0.6.0', newVersion: '0.6.1' },
          '@fmmenchi/notify': {
            currentVersion: '0.0.11',
            newVersion: '0.0.12',
          },
        },
        groups,
      ),
    ).toEqual([
      { project: '@fmmenchi/ui', version: '0.6.1', tag: '@fmmenchi/ui@0.6.1' },
      {
        project: '@fmmenchi/notify',
        version: '0.0.12',
        tag: '@fmmenchi/notify@0.0.12',
      },
    ]);
  });

  it('uses each project’s OWN group pattern, not the first one', () => {
    expect(
      toReleaseRecords(
        { '@fmmenchi/gh-actions': { newVersion: '0.1.0' } },
        groups,
      ),
    ).toEqual([
      {
        project: '@fmmenchi/gh-actions',
        version: '0.1.0',
        tag: 'gh-actions/v0.1.0',
      },
    ]);
  });

  it('skips the projects nx considered and left alone', () => {
    expect(
      toReleaseRecords(
        {
          '@fmmenchi/ui': { currentVersion: '0.6.0', newVersion: null },
          '@fmmenchi/notify': { currentVersion: '0.0.11' },
        },
        groups,
      ),
    ).toEqual([]);
  });

  it('is empty, not undefined, when nothing was released', () => {
    expect(toReleaseRecords({}, groups)).toEqual([]);
  });
});

describe('the tag mirrors nx, not a convention', () => {
  it('sanitises the project name the way nx does before interpolating', () => {
    expect(formatTag('{projectName}@{version}', ':common:lib', '1.0.0')).toBe(
      'common/lib@1.0.0',
    );
    expect(formatTag('{projectName}@{version}', 'my app', '1.0.0')).toBe(
      'my-app@1.0.0',
    );
  });

  it('fills {releaseGroupName}, which nx supports too', () => {
    expect(
      formatTag('{releaseGroupName}/v{version}', '@x/y', '0.1.0', 'gh-actions'),
    ).toBe('gh-actions/v0.1.0');
  });

  it('replaces EVERY occurrence, not just the first', () => {
    expect(
      formatTag('{projectName}/{projectName}-{version}', 'a', '1.0.0'),
    ).toBe('a/a-1.0.0');
  });

  it('refuses to guess when a group carries no pattern — it would fabricate a tag', () => {
    expect(() =>
      toReleaseRecords({ '@x/y': { newVersion: '1.0.0' } }, [
        { name: 'legacy', projects: ['@x/y'] },
      ]),
    ).toThrow(/no tag pattern/);
  });

  it('refuses just as loudly when the project is in no group at all', () => {
    expect(() =>
      toReleaseRecords({ '@acme/loose': { newVersion: '1.0.0' } }, groups),
    ).toThrow(/no tag pattern/);
  });
});

describe('assertReleaseGroups', () => {
  it('passes through the shape we read', () => {
    expect(assertReleaseGroups(groups)).toEqual(groups);
  });

  it('throws when nx hands back something that is not a list', () => {
    expect(() => assertReleaseGroups(undefined)).toThrow(/expected an array/);
  });

  it('throws when the pattern moved — the rename nx already did once', () => {
    expect(() =>
      assertReleaseGroups([
        {
          name: 'packages',
          projects: ['@x/y'],
          releaseTagPattern: '{version}',
        },
      ]),
    ).toThrow(/shape/);
  });

  it('throws when projects is missing, rather than forming tags for nobody', () => {
    expect(() =>
      assertReleaseGroups([
        { name: 'packages', releaseTag: { pattern: 'v{version}' } },
      ]),
    ).toThrow(/shape/);
  });
});

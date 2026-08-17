import { describe, expect, it } from 'vitest';
import { formatTag, toReleaseRecords } from './release-result.js';
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

  it('falls back to nx’s default pattern for a project in no group', () => {
    expect(
      toReleaseRecords({ '@acme/loose': { newVersion: '1.0.0' } }, groups),
    ).toEqual([
      { project: '@acme/loose', version: '1.0.0', tag: '@acme/loose@1.0.0' },
    ]);
  });

  it('is empty, not undefined, when nothing was released', () => {
    expect(toReleaseRecords({}, groups)).toEqual([]);
  });
});

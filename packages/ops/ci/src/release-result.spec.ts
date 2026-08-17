import { describe, expect, it } from 'vitest';
import { toReleaseRecords } from './release-result.js';

const changelogs = {
  '@fmmenchi/ui': {
    releaseVersion: { gitTag: '@fmmenchi/ui@0.6.1' },
    contents: '### 🚀 Features\n\n- the thing',
  },
  '@fmmenchi/gh-actions': {
    releaseVersion: { gitTag: 'gh-actions/v0.1.0' },
    contents: '### 🩹 Fixes\n\n- the other thing',
  },
};

describe('toReleaseRecords', () => {
  it('records the tag nx handed over, whatever shape it has', () => {
    expect(
      toReleaseRecords(
        {
          '@fmmenchi/ui': { currentVersion: '0.6.0', newVersion: '0.6.1' },
          '@fmmenchi/gh-actions': {
            currentVersion: '0.0.11',
            newVersion: '0.1.0',
          },
        },
        changelogs,
      ).map((r) => r.tag),
    ).toEqual(['@fmmenchi/ui@0.6.1', 'gh-actions/v0.1.0']);
  });

  it('carries the notes nx rendered, so nobody asks GitHub for them again', () => {
    const [record] = toReleaseRecords(
      { '@fmmenchi/ui': { newVersion: '0.6.1' } },
      changelogs,
    );
    expect(record?.notes).toContain('the thing');
  });

  it('omits notes rather than inventing an empty changelog', () => {
    const [record] = toReleaseRecords(
      { '@fmmenchi/ui': { newVersion: '0.6.1' } },
      { '@fmmenchi/ui': { releaseVersion: { gitTag: '@fmmenchi/ui@0.6.1' } } },
    );
    expect(record?.notes).toBeUndefined();
  });

  it('skips the projects nx considered and left alone', () => {
    expect(
      toReleaseRecords(
        {
          '@fmmenchi/ui': { currentVersion: '0.6.0', newVersion: null },
          '@fmmenchi/gh-actions': { currentVersion: '0.0.11' },
        },
        changelogs,
      ),
    ).toEqual([]);
  });

  it('is empty, not undefined, when nothing was released', () => {
    expect(toReleaseRecords({}, changelogs)).toEqual([]);
  });

  it('throws rather than forming a tag nx did not give it', () => {
    expect(() =>
      toReleaseRecords({ '@acme/x': { newVersion: '1.0.0' } }, changelogs),
    ).toThrow(/handed back no git tag/);
  });
});

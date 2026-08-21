import { describe, expect, it } from 'vitest';
import { publishableProjects, toReleaseRecords } from './release-result.js';

const tags = new Map([
  ['@fmmenchi/ui', '@fmmenchi/ui@0.6.1'],
  ['@fmmenchi/gh-actions', 'gh-actions/v0.1.0'],
]);

const changelogs = {
  '@fmmenchi/ui': { contents: '### 🚀 Features\n\n- the thing' },
  '@fmmenchi/gh-actions': { contents: '### 🩹 Fixes\n\n- the other thing' },
};

describe('toReleaseRecords', () => {
  it('records the tag it was given, whatever shape it has', () => {
    expect(
      toReleaseRecords(
        {
          '@fmmenchi/ui': { currentVersion: '0.6.0', newVersion: '0.6.1' },
          '@fmmenchi/gh-actions': {
            currentVersion: '0.0.11',
            newVersion: '0.1.0',
          },
        },
        tags,
        changelogs,
      ).map((r) => r.tag),
    ).toEqual(['@fmmenchi/ui@0.6.1', 'gh-actions/v0.1.0']);
  });

  // THE REGRESSION THIS WHOLE REFACTOR EXISTS FOR. nx populates `projectChangelogs` only
  // when the consumer configured project changelogs, which its DEFAULT config does not — and
  // the record used to take the tag out of that map, so it could not be built at all on a
  // default-config release that had already been cut. The tag no longer comes from there.
  it('is complete on a consumer with no changelogs configured at all', () => {
    expect(
      toReleaseRecords({ '@fmmenchi/ui': { newVersion: '0.6.1' } }, tags),
    ).toEqual([
      {
        project: '@fmmenchi/ui',
        version: '0.6.1',
        tag: '@fmmenchi/ui@0.6.1',
      },
    ]);
  });

  it('carries the notes nx rendered, so nobody asks GitHub for them again', () => {
    const [record] = toReleaseRecords(
      { '@fmmenchi/ui': { newVersion: '0.6.1' } },
      tags,
      changelogs,
    );
    expect(record?.notes).toContain('the thing');
  });

  it('omits notes rather than inventing an empty changelog', () => {
    const [record] = toReleaseRecords(
      { '@fmmenchi/ui': { newVersion: '0.6.1' } },
      tags,
      { '@fmmenchi/ui': {} },
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
        tags,
        changelogs,
      ),
    ).toEqual([]);
  });

  it('is empty, not undefined, when nothing was released', () => {
    expect(toReleaseRecords({}, tags, changelogs)).toEqual([]);
  });

  it('throws rather than recording a release with no tag', () => {
    expect(() =>
      toReleaseRecords({ '@acme/x': { newVersion: '1.0.0' } }, tags),
    ).toThrow(/no tag was formed/);
  });
});

describe('publishableProjects', () => {
  const record = {
    project: '@fmmenchi/ui',
    version: '0.6.1',
    tag: '@fmmenchi/ui@0.6.1',
  };

  it('keeps a project that has the publish target', () => {
    expect(
      publishableProjects([record], {
        '@fmmenchi/ui': { data: { targets: { 'nx-release-publish': {} } } },
      }),
    ).toEqual([record]);
  });

  it('is empty for a private deliverable — nx creates no publish target for it', () => {
    expect(
      publishableProjects([record], {
        '@fmmenchi/ui': { data: { targets: { build: {} } } },
      }),
    ).toEqual([]);
  });

  it('keeps the publishable half of a mixed release', () => {
    const priv = { project: 'blog', version: '1.0.0', tag: 'v1.0.0' };
    expect(
      publishableProjects([record, priv], {
        '@fmmenchi/ui': { data: { targets: { 'nx-release-publish': {} } } },
        blog: { data: { targets: {} } },
      }),
    ).toEqual([record]);
  });

  it('is empty, not a crash, for a project missing from the graph', () => {
    expect(publishableProjects([record], {})).toEqual([]);
  });
});

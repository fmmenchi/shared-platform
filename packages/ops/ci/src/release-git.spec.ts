import { describe, expect, it } from 'vitest';
import { remoteReleaseProviderOf, tagsByProject } from './release-git.js';
import type {
  ReleaseVersionCtor,
  ReleaseVersionCtorArg,
  TagPatternSource,
} from './release-git.types.js';

/**
 * A stand-in for nx's `ReleaseVersion`.
 *
 * It interpolates the three placeholders and nothing else — deliberately NOT a reproduction
 * of nx's class. What is under test here is the mapping: which group a project belongs to,
 * which projects are in the release at all, and the cross-check against the tags nx says it
 * will cut. The interpolation itself is nx's, and the entrypoint passes nx's real class.
 */
const FakeReleaseVersion: ReleaseVersionCtor = class {
  gitTag: string;
  constructor({
    version,
    releaseTagPattern,
    projectName,
    releaseGroupName,
  }: ReleaseVersionCtorArg) {
    this.gitTag = releaseTagPattern
      .replace('{version}', version)
      .replace('{projectName}', projectName ?? '')
      .replace('{releaseGroupName}', releaseGroupName ?? '');
  }
};

const graphOf = (
  groups: Record<string, { name: string; pattern: string }>,
): TagPatternSource => ({
  getReleaseGroupForProject: (project) => {
    const group = groups[project];
    return group
      ? { name: group.name, releaseTag: { pattern: group.pattern } }
      : undefined;
  },
});

const independent = graphOf({
  '@fmmenchi/ui': { name: 'packages', pattern: '{projectName}@{version}' },
  '@fmmenchi/gh-actions': {
    name: 'gh-actions',
    pattern: 'gh-actions/v{version}',
  },
});

describe('tagsByProject', () => {
  it('maps each released project to its own tag', () => {
    const tags = tagsByProject(
      {
        '@fmmenchi/ui': { newVersion: '0.6.1' },
        '@fmmenchi/gh-actions': { newVersion: '0.1.0' },
      },
      independent,
      FakeReleaseVersion,
      new Set(['@fmmenchi/ui@0.6.1', 'gh-actions/v0.1.0']),
    );

    expect([...tags]).toEqual([
      ['@fmmenchi/ui', '@fmmenchi/ui@0.6.1'],
      ['@fmmenchi/gh-actions', 'gh-actions/v0.1.0'],
    ]);
  });

  // The case a flat list of tags cannot express, and the reason this mapping exists: one tag
  // for a whole fixed group, with no project name in it. Every project in the group maps to
  // that same tag, and reading it back out of git could never say which projects those were.
  it('maps every project of a fixed group to the one tag the group cuts', () => {
    const fixed = graphOf({
      a: { name: 'core', pattern: 'v{version}' },
      b: { name: 'core', pattern: 'v{version}' },
    });

    const tags = tagsByProject(
      { a: { newVersion: '2.0.0' }, b: { newVersion: '2.0.0' } },
      fixed,
      FakeReleaseVersion,
      new Set(['v2.0.0']),
    );

    expect(tags.get('a')).toBe('v2.0.0');
    expect(tags.get('b')).toBe('v2.0.0');
  });

  it('skips the projects nx considered and left alone', () => {
    const tags = tagsByProject(
      {
        '@fmmenchi/ui': { newVersion: '0.6.1' },
        '@fmmenchi/gh-actions': { currentVersion: '0.1.0', newVersion: null },
      },
      independent,
      FakeReleaseVersion,
      new Set(['@fmmenchi/ui@0.6.1']),
    );

    expect([...tags.keys()]).toEqual(['@fmmenchi/ui']);
  });

  it('is empty, not a crash, when nothing was released', () => {
    expect(
      tagsByProject({}, independent, FakeReleaseVersion, new Set()).size,
    ).toBe(0);
  });

  // The cross-check. Two answers out of nx — the tag values it is cutting, and the pattern it
  // resolved — and a release must stop rather than record a tag that will not exist.
  it('throws when the tag it formed is not one nx is cutting', () => {
    expect(() =>
      tagsByProject(
        { '@fmmenchi/ui': { newVersion: '0.6.1' } },
        independent,
        FakeReleaseVersion,
        new Set(['@fmmenchi/ui@0.6.0']),
      ),
    ).toThrow(/Refusing to record a tag that will not exist/);
  });

  it('throws when a released project belongs to no release group', () => {
    expect(() =>
      tagsByProject(
        { '@acme/x': { newVersion: '1.0.0' } },
        independent,
        FakeReleaseVersion,
        new Set(['@acme/x@1.0.0']),
      ),
    ).toThrow(/belongs to no release group/);
  });
});

describe('remoteReleaseProviderOf', () => {
  it('has no provider for a changelog that is disabled outright', () => {
    expect(remoteReleaseProviderOf(false)).toBeUndefined();
    expect(remoteReleaseProviderOf(undefined)).toBeUndefined();
    expect(remoteReleaseProviderOf(null)).toBeUndefined();
  });

  it('has no provider when the resolved config explicitly asks for none', () => {
    expect(remoteReleaseProviderOf({ createRelease: false })).toBeUndefined();
  });

  // Stricter than nx's own `!== false`, deliberately: nx only ever asks this of a resolved
  // config, where the field is always set. Absent here means none, because a client built
  // from an undefined provider is the worse failure.
  it('has no provider when the field is absent', () => {
    expect(remoteReleaseProviderOf({})).toBeUndefined();
    expect(remoteReleaseProviderOf({ createRelease: undefined })).toBe(
      undefined,
    );
  });

  it('hands back the configured provider, whatever shape it has', () => {
    expect(remoteReleaseProviderOf({ createRelease: 'github' })).toBe('github');
    expect(
      remoteReleaseProviderOf({ createRelease: { provider: 'gitlab' } }),
    ).toEqual({ provider: 'gitlab' });
  });
});

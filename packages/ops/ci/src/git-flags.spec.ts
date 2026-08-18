import { describe, expect, it } from 'vitest';
import { gitFlagsFor } from './git-flags.js';

describe('gitFlagsFor — nx defaults, when a consumer configures nothing', () => {
  it('versions without committing or tagging, but stages', () => {
    expect(gitFlagsFor('version', undefined)).toEqual({
      gitCommit: false,
      gitTag: false,
      stageChanges: true,
    });
  });

  it('changelogs by committing and tagging, and does not push without a hosted release', () => {
    expect(gitFlagsFor('changelog', undefined)).toEqual({
      gitCommit: true,
      gitTag: true,
      stageChanges: true,
      gitPush: false,
    });
  });

  it('never commits or tags at the version step, even when the consumer commits', () => {
    // One commit and one tag per release, at the end. Propagating the top-level config to both
    // steps would commit twice and then die on a duplicate tag.
    const release = { git: { commit: true, tag: true } };

    expect(gitFlagsFor('version', release)).toEqual({
      gitCommit: false,
      gitTag: false,
      stageChanges: true,
    });
  });

  it('pushes when a GitHub release has to be created — it cannot come from an unpushed commit', () => {
    expect(
      gitFlagsFor('changelog', {
        changelog: { projectChangelogs: { createRelease: 'github' } },
      }).gitPush,
    ).toBe(true);
  });

  it('sees createRelease on a release GROUP too', () => {
    expect(
      gitFlagsFor('changelog', {
        groups: { packages: { changelog: { createRelease: 'github' } } },
      }).gitPush,
    ).toBe(true);
  });

  it('does not mistake createRelease: false for a hosted release', () => {
    expect(
      gitFlagsFor('changelog', {
        changelog: { projectChangelogs: { createRelease: false } },
      }).gitPush,
    ).toBe(false);
  });
});

describe("gitFlagsFor — the consumer's config wins", () => {
  // The defect this function exists for: a consumer that deliberately does not commit version
  // bumps had `gitCommit: true` forced on it by a published script.
  it('does not commit when the consumer says not to', () => {
    const release = {
      git: { commit: false, stageChanges: false, tag: true, push: true },
    };

    expect(gitFlagsFor('changelog', release).gitCommit).toBe(false);
    expect(gitFlagsFor('version', release).stageChanges).toBe(false);
  });

  it('still tags for a consumer that does not commit — versions in tags only', () => {
    // The model this workspace itself used until today, and the one the consumer that found
    // the bug still uses: no bump commits, the truth lives in the tags.
    const release = {
      git: { commit: false, stageChanges: false, tag: true, push: true },
    };

    expect(gitFlagsFor('changelog', release)).toEqual({
      gitCommit: false,
      gitTag: true,
      stageChanges: false,
      gitPush: true,
    });
  });

  it('commits when the consumer says to', () => {
    const release = {
      git: { commit: true, stageChanges: true, tag: true, push: true },
    };

    expect(gitFlagsFor('changelog', release)).toEqual({
      gitCommit: true,
      gitTag: true,
      stageChanges: true,
      gitPush: true,
    });
  });

  it('lets a per-subcommand override beat the top-level one, as nx documents', () => {
    const release = {
      git: { commit: true },
      version: { git: { commit: false } },
      changelog: { git: { commit: true } },
    };

    expect(gitFlagsFor('version', release).gitCommit).toBe(false);
    expect(gitFlagsFor('changelog', release).gitCommit).toBe(true);
  });

  it('reads `false` as false, not as "unset"', () => {
    // `??` and `||` differ here, and getting it wrong would turn every explicit false back
    // into nx's default true — which is precisely the bug being fixed.
    expect(
      gitFlagsFor('changelog', { git: { tag: false, push: false } }),
    ).toEqual({
      gitCommit: true,
      gitTag: false,
      stageChanges: true,
      gitPush: false,
    });
  });
});

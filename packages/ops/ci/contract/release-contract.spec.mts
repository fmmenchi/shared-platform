/**
 * THE CONTRACT TEST: does `fmmenchi-release` still do what `nx release` does?
 *
 * This script composes `nx release`'s three subcommands and performs the git operations itself,
 * because the combined `release()` discards the tags and notes the release record is made of,
 * exits the process when a publish fails, and publishes unconditionally. That composition buys
 * those three things and costs one: we now own an ORDER that nx could change underneath us, and
 * no type covers an order. This is the thing that covers it.
 *
 * It builds a throwaway nx workspace, runs BOTH implementations over it as a rehearsal, and
 * compares the `git` commands each says it would run. Not the logs, not the versions — the git
 * commands, because those are the release: what gets committed, what gets tagged, what gets
 * pushed, and in which order.
 *
 * It is a separate target (`nx run @fmmenchi/ci:contract`) rather than part of `test`, because it
 * spawns two full nx runs per scenario and the unit suite runs in milliseconds. Keeping them apart
 * keeps both readable — the same reasoning the workspace applies to the browser suite.
 *
 * The instrument this depends on is `RELEASE_VERBOSE=true`, which exists because of a defect it
 * would have caught on its own: nx's `gitCommit`/`gitTag` print the command only when verbose, so
 * a premature push from the version step was invisible in a normal rehearsal. That is the shape of
 * bug this test is for.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const workspaceRoot = resolve(packageRoot, '../../..');
const ourEntrypoint = join(packageRoot, 'dist', 'release.js');
// Resolved, not joined: under pnpm `node_modules/nx` is a symlink into `.pnpm/…`, and nx's own
// exports map sends `bin/nx.js` to `dist/bin/nx.js`. A hand-built path is wrong on both counts.
const nxBin = createRequire(import.meta.url).resolve('nx/bin/nx.js');

const fixtures: string[] = [];
afterAll(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf-8' });

/**
 * A throwaway nx workspace with one package, one tag to resolve the current version from, and one
 * releasable commit. `node_modules` is a symlink to this repo's: nx resolves its version actions
 * plugin from the workspace root, and installing into a temp dir for every scenario would make
 * this test cost minutes instead of seconds.
 */
function makeFixture(release: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'fmmenchi-release-contract-'));
  fixtures.push(dir);

  mkdirSync(join(dir, 'packages', 'a'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', private: true }, null, 2),
  );
  // This is what makes nx discover `packages/a` as a project at all — without it every release
  // group "matches no projects" and BOTH implementations fail identically, which would be a green
  // comparison proving nothing. It has to be `pnpm-workspace.yaml` and not package.json
  // `workspaces`: nx resolves the package manager from the symlinked node_modules, sees pnpm, and
  // pnpm ignores that field.
  writeFileSync(
    join(dir, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/*'\n",
  );
  writeFileSync(join(dir, 'nx.json'), JSON.stringify({ release }, null, 2));
  // `projectType: library` is load-bearing. nx's implicit default release group takes only
  // projects whose graph node is a `lib` and is not private (`getDefaultProjects`), so without it
  // BOTH implementations die with "release group __default__ matches no projects" — equally, and
  // a comparison of two identical failures proves nothing.
  writeFileSync(
    join(dir, 'packages', 'a', 'package.json'),
    JSON.stringify(
      { name: 'pkg-a', version: '1.0.0', nx: { projectType: 'library' } },
      null,
      2,
    ),
  );
  symlinkSync(
    join(workspaceRoot, 'node_modules'),
    join(dir, 'node_modules'),
    'dir',
  );

  git(dir, 'init', '--initial-branch=main');
  git(dir, 'config', 'user.email', 'contract@example.com');
  git(dir, 'config', 'user.name', 'contract');
  git(dir, 'config', 'commit.gpgsign', 'false');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'chore: the workspace');
  git(dir, 'tag', 'pkg-a@1.0.0');

  // The releasable change. `feat` so conventional commits resolves a minor bump.
  writeFileSync(
    join(dir, 'packages', 'a', 'index.js'),
    'export const a = 1;\n',
  );
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'feat(pkg-a): a thing worth releasing');

  return dir;
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * The git commands an implementation says it would run, in order.
 *
 * Both sides print them through the same nx helpers under `--dry-run --verbose`, which is what
 * makes the two comparable at all: this is nx's own rendering of its own intent, not either
 * implementation describing itself.
 */
function gitCommandsOf(output: string): string[] {
  return output
    .replace(ANSI, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^git (add|commit|tag|push)\b/.test(line));
}

const run = (cmd: string[], cwd: string, env: Record<string, string> = {}) => {
  try {
    return execFileSync(process.execPath, cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // A daemon started in a temp workspace outlives the test and answers for the wrong root.
        NX_DAEMON: 'false',
        CI: 'true',
        ...env,
      },
    });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; message: string };
    throw new Error(
      `command failed: node ${cmd.join(' ')}\n--- stdout\n${e.stdout ?? ''}\n--- stderr\n${e.stderr ?? ''}`,
    );
  }
};

const ours = (dir: string) =>
  gitCommandsOf(
    run([ourEntrypoint], dir, {
      RELEASE_DRY_RUN: 'true',
      RELEASE_VERBOSE: 'true',
      RELEASE_RESULT_FILE: join(dir, 'release-result.json'),
      NEW_TAGS_FILE: join(dir, 'new_tags.txt'),
    }),
  );

// `--skip-publish` and not `--yes`: nx rejects the pair as mutually exclusive, and skipping the
// publish is what keeps the two sides comparable — this test is about git, not registries.
const theirs = (dir: string) =>
  gitCommandsOf(
    run([nxBin, 'release', '--dry-run', '--verbose', '--skip-publish'], dir),
  );

describe('fmmenchi-release agrees with `nx release`', () => {
  // THE CASE THE RECORD USED TO DIE ON. nx's `projectChangelogs` defaults to false, so this
  // workspace produces no changelog files — the shape where nx's changelog step has nothing to
  // commit and `commitChanges` throws on an empty list. Both implementations must still stage the
  // version bump, commit it and tag it.
  it('on nx default changelog config (no changelog files)', () => {
    const dir = makeFixture({
      projectsRelationship: 'independent',
      releaseTag: { pattern: '{projectName}@{version}' },
      git: { commit: true, tag: true },
      version: {
        conventionalCommits: true,
        fallbackCurrentVersionResolver: 'disk',
      },
    });

    const mine = ours(dir);
    expect(mine).toEqual(theirs(dir));
    // Non-vacuity: a run where neither side touched git would compare equal and prove nothing.
    expect(mine.some((c) => c.startsWith('git commit'))).toBe(true);
    expect(mine.some((c) => c.startsWith('git tag'))).toBe(true);
  });

  // The other half: changelog files ARE configured, so the changelog step writes and stages one
  // and it must land in the same single commit as the version bump.
  it('with project changelogs written to disk', () => {
    const dir = makeFixture({
      projectsRelationship: 'independent',
      releaseTag: { pattern: '{projectName}@{version}' },
      git: { commit: true, tag: true },
      version: {
        conventionalCommits: true,
        fallbackCurrentVersionResolver: 'disk',
      },
      changelog: {
        workspaceChangelog: false,
        projectChangelogs: {
          createRelease: false,
          file: '{projectRoot}/CHANGELOG.md',
        },
      },
    });

    const mine = ours(dir);
    expect(mine).toEqual(theirs(dir));
    expect(mine.some((c) => c.includes('CHANGELOG.md'))).toBe(true);
  });

  // THE ONE DIVERGENCE, pinned deliberately — and it is the one place this script is RIGHT and
  // `nx release` is wrong. Measured, on `git: { push: true }` with no hosted release configured:
  //
  //   ours:       add → commit → tag → push
  //   nx release: add → push → commit → tag
  //
  // nx's top-level command never passes `gitPush: false` to its version step, so that step falls
  // back to the resolved `release.version.git.push`, which INHERITS the consumer's top-level
  // `push`. It therefore pushes right after staging the bumps — before the release commit exists
  // and before anything is tagged, so `--follow-tags` carries nothing and the trunk receives a push
  // that describes no release. Its own later push (which it decides from "does a changelog ask for
  // a hosted release?", never from `git.push`) does not happen here at all.
  //
  // This script had the identical defect for exactly as long as it took to run one verbose
  // rehearsal, which is what `RELEASE_VERBOSE` and this test exist for. The fix is the explicit
  // `gitPush: false` on the version step.
  //
  // If nx ever fixes it upstream, this test goes red, and the exception gets deleted rather than
  // outliving the reason for it.
  it('pushes ONCE and LAST, where nx release pushes before it has committed', () => {
    const dir = makeFixture({
      projectsRelationship: 'independent',
      releaseTag: { pattern: '{projectName}@{version}' },
      git: { commit: true, tag: true, push: true },
      version: {
        conventionalCommits: true,
        fallbackCurrentVersionResolver: 'disk',
      },
    });

    const mine = ours(dir);
    const nx = theirs(dir);
    const verb = (commands: string[]) =>
      commands.map((c) => c.split(' ').slice(0, 2).join(' '));

    expect(verb(mine)).toEqual([
      'git add',
      'git commit',
      'git tag',
      'git push',
    ]);

    // Documenting nx, not endorsing it: the push lands second, before the commit.
    expect(verb(nx)).toEqual(['git add', 'git push', 'git commit', 'git tag']);

    // Whatever the order, the operations themselves must still match one for one.
    const sorted = (commands: string[]) => [...commands].sort();
    expect(sorted(mine)).toEqual(sorted(nx));
  });
});

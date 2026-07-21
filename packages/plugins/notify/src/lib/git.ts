import { execFileSync } from 'node:child_process';
import type { Commit } from '@fmmenchi/notify';

/**
 * Parses `git log --pretty=%h%x09%s` output (short-sha TAB subject, one per line) into
 * commits. Pure and tab-delimited so a subject containing spaces or `→` survives intact;
 * blank lines are dropped. Kept separate from {@link collectCommits} so the parsing — the
 * only part with edge cases — is unit-tested without spawning git.
 */
export function parseCommits(raw: string): Commit[] {
  return raw
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.length > 0)
    .map((line) => {
      const tab = line.indexOf('\t');
      return tab === -1
        ? { sha: line, subject: '' }
        : { sha: line.slice(0, tab), subject: line.slice(tab + 1) };
    });
}

/**
 * The commits in `from..to`, newest first — the changelog a release announces.
 *
 * `includeMerges` defaults to true: a squash-merge trunk shows the PR merge commits as
 * the meaningful history (this is what a Wishew-style message lists). Turn it off for a
 * rebase-merge repo where merges are noise.
 */
export function collectCommits(
  from: string,
  to: string,
  includeMerges = true,
): Commit[] {
  const args = ['log', '--pretty=%h%x09%s'];
  if (!includeMerges) args.push('--no-merges');
  args.push(`${from}..${to}`);

  const raw = execFileSync('git', args, { encoding: 'utf8' });
  return parseCommits(raw);
}

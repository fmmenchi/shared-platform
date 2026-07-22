import type {
  Changelog,
  Notification,
  ReleaseChangelog,
} from './notification.types.js';

/** How many commit lines a changelog shows before it collapses to `+N more`. */
const MAX_COMMITS = 15;

/**
 * The changelog as plain markdown: a range line, then one bullet per commit. Long
 * histories are **capped** at {@link MAX_COMMITS} with an explicit `+N more` — the cut is
 * stated, never silent. Transports convert this markdown to their own format.
 */
export function formatChangelog({
  fromRef,
  toRef,
  commits,
}: Changelog): string {
  const header = `**Changes:** \`${fromRef}\` → \`${toRef}\``;
  if (commits.length === 0) return `${header}\n_no commits_`;

  const shown = commits
    .slice(0, MAX_COMMITS)
    .map((c) => `- \`${c.sha}\` ${c.subject}`);
  const overflow = commits.length - MAX_COMMITS;
  if (overflow > 0) shown.push(`_+${overflow} more_`);

  return `${header}\n${shown.join('\n')}`;
}

function changelogBody(changelog?: ReleaseChangelog): string | undefined {
  if (!changelog) return undefined;
  return 'body' in changelog ? changelog.body : formatChangelog(changelog);
}

/**
 * A release announcement. `version` is the bare tag (no leading `v`; the title adds it).
 * `appName` names the project so one channel can carry releases from many. Omit
 * `changelog` for a thin announcement.
 */
export function releaseNotification(
  appName: string,
  version: string,
  url: string,
  changelog?: ReleaseChangelog,
): Notification {
  return {
    kind: 'release',
    text: `${appName} v${version} released`,
    title: `${appName} \`v${version}\` is out`,
    body: changelogBody(changelog),
    actions: [{ label: 'View release', url }],
  };
}

/** An error alert with a link back to whatever produced it. */
export function errorNotification(
  appName: string,
  message: string,
  url: string,
): Notification {
  return {
    kind: 'error',
    text: `${appName}: ${message}`,
    title: `${appName} — ${message}`,
    actions: [{ label: 'See the run', url }],
  };
}

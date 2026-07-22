const ENDPOINT = 'https://slack.com/api/chat.postMessage';

/** Block Kit, kept loose: this library does not police Slack's schema. */
export type SlackBlock = Record<string, unknown>;

export interface SlackMessage {
  /** A bot token (`xoxb-…`) carrying the `chat:write` scope. */
  token: string;
  /** Channel ID (`C…`), not the name: a renamed channel keeps its ID. */
  channel: string;
  /**
   * Plain-text fallback. NOT optional, even when blocks are given: it is what appears in
   * the phone notification, in the sidebar, and to a screen reader. A message carrying
   * only blocks arrives as an empty line.
   */
  text: string;
  blocks?: SlackBlock[];
}

interface SlackResponse {
  ok: boolean;
  error?: string;
}

/** One line of a changelog: a short sha and the commit subject. */
export interface Commit {
  sha: string;
  subject: string;
}

/**
 * The set of changes a release carries: the range it spans and the commits inside it.
 * `fromRef`/`toRef` are whatever the caller wants shown — short shas or tags.
 */
export interface Changelog {
  fromRef: string;
  toRef: string;
  commits: Commit[];
}

/**
 * A release's changes, either **structured** (commits this library renders) or a
 * **pre-rendered** markdown body (e.g. the notes `nx release` already wrote into a GitHub
 * Release) that only needs light conversion to Slack mrkdwn.
 */
export type ReleaseChangelog = Changelog | { body: string };

/** How many commit lines a changelog section shows before it collapses to `+N more`. */
const MAX_COMMITS = 15;

/** Slack's per-section text ceiling is 3000 chars; leave room for the trailing note. */
const MAX_BODY = 2800;

/**
 * Posts to Slack, and fails loudly when Slack refuses.
 *
 * The whole reason this is a tested function and not three lines of curl: **Slack
 * answers HTTP 200 even when it rejects the message.** A bad token, a channel the bot
 * was never invited to, a malformed block — every one of them comes back 200, with
 * `{"ok": false}` in the body. Verified against the live API with a deliberately invalid
 * token: HTTP 200, `error: invalid_auth`.
 *
 * A caller that checks only the status code prints "notification sent" and sends
 * nothing. That is the exact class of silent failure this codebase keeps digging out of
 * itself — and it is something a unit test can pin down and a shell script cannot.
 */
export async function postToSlack({
  token,
  channel,
  text,
  blocks,
}: SlackMessage): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  if (!response.ok) {
    /* Transport-level: Slack down, or a proxy in the way. Rare, and not the same bug. */
    throw new Error(`Slack is unreachable: HTTP ${response.status}`);
  }

  const body = (await response.json()) as SlackResponse;

  if (!body.ok) {
    /*
     * `not_in_channel` is the one everybody hits: the token is valid, the channel is
     * real, and the bot was simply never invited to it. Surfacing the code saves the
     * next person an hour of staring at a green pipeline.
     */
    throw new Error(
      `Slack refused the message: ${body.error ?? 'unknown error'}`,
    );
  }
}

/**
 * An error alert with a link back to whatever produced it.
 *
 * A notification you cannot act on is noise. The button is the difference between "the
 * scan is red" and "here is the scan". `appName` names the source so a shared channel
 * can carry alerts from more than one project.
 */
export function errorBlocks(
  appName: string,
  message: string,
  url: string,
): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:rotating_light: *${appName}* — ${message}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'See the run' },
          url,
        },
      ],
    },
  ];
}

/**
 * The changelog as a single mrkdwn string: the range on one line, then one bullet per
 * commit. Long histories are **capped** at {@link MAX_COMMITS} with an explicit
 * `+N more` — the cut is stated, never silent, and it keeps the section under Slack's
 * 3000-character limit.
 */
export function formatChangelog({ fromRef, toRef, commits }: Changelog): string {
  const header = `*Changes:* \`${fromRef}\` → \`${toRef}\``;
  if (commits.length === 0) return `${header}\n_no commits_`;

  const shown = commits
    .slice(0, MAX_COMMITS)
    .map((c) => `• \`${c.sha}\` ${c.subject}`);
  const overflow = commits.length - MAX_COMMITS;
  if (overflow > 0) shown.push(`_+${overflow} more_`);

  return `${header}\n${shown.join('\n')}`;
}

/**
 * Turns a GitHub-flavoured markdown release body (the notes `nx release` writes) into
 * Slack mrkdwn: `**bold**` → `*bold*`, `[text](url)` → `<url|text>`, `#` headings and
 * `-`/`*` bullets normalized. Capped at {@link MAX_BODY} with a stated truncation, so it
 * stays under Slack's per-section limit instead of being rejected whole.
 */
export function formatReleaseBody(markdown: string): string {
  let out = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>') // links, before bold
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // **bold** → *bold*
    .replace(/__(.+?)__/g, '*$1*')
    .replace(/^#{1,6}\s+(.*)$/gm, '*$1*') // headings → a bold line
    .replace(/^\s*[-*]\s+/gm, '• ') // bullets
    .trim();

  if (out.length > MAX_BODY) {
    out = `${out.slice(0, MAX_BODY).trimEnd()}\n… _(truncated — see the release)_`;
  }
  return out;
}

/**
 * Announces a release, with a link to its notes and — when a changelog is given — the
 * commits it shipped.
 *
 * Deliberately not `errorBlocks`: a release is not something that went wrong, so it does
 * not borrow the alarm's framing or its "See the run" wording. The button points at the
 * GitHub release, which is the one thing a reader actually wants after "a version shipped".
 *
 * `version` is the tag without its leading `v` — `1.0.0`, not `v1.0.0` — because the
 * heading adds the `v` back, and the caller (a git tag) is the one place the two forms
 * are easy to confuse. `appName` names the project so a shared channel can carry releases
 * from more than one. Omit `changelog` to keep the message thin (name + version + button).
 */
export function releaseBlocks(
  appName: string,
  version: string,
  url: string,
  changelog?: ReleaseChangelog,
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:rocket: *${appName} \`v${version}\`* is out.`,
      },
    },
  ];

  if (changelog) {
    const text =
      'body' in changelog
        ? formatReleaseBody(changelog.body)
        : formatChangelog(changelog);
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View release' },
        url,
      },
    ],
  });

  return blocks;
}

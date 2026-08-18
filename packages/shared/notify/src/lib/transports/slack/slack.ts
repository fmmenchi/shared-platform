import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type {
  Attachment,
  Notification,
  NotificationKind,
} from '../../notification.types.js';
import type { Transport } from '../../transport.types.js';
import type {
  SlackBlock,
  SlackConfig,
  SlackResponse,
  SlackUploadUrlResponse,
} from './slack.types.js';

const ENDPOINT = 'https://slack.com/api/chat.postMessage';
const UPLOAD_URL_ENDPOINT = 'https://slack.com/api/files.getUploadURLExternal';
const UPLOAD_COMPLETE_ENDPOINT =
  'https://slack.com/api/files.completeUploadExternal';

/** Slack's per-section text ceiling is 3000 chars; leave room for the trailing note. */
const MAX_BODY = 2800;

/** Emoji lead per notification kind — the Slack transport's own styling. */
const LEAD: Record<NotificationKind, string> = {
  release: ':rocket:',
  error: ':rotating_light:',
  info: ':information_source:',
};

/**
 * The three characters Slack reserves, escaped as Slack asks the SENDER to escape them.
 *
 * Not optional, and not cosmetic: Slack reads `<…>` as a link or a mention, so an
 * unescaped one that is neither is shown in its escaped form instead — a changelog line
 * reading "add form — the <form> element" arrived in the channel as
 * `add form — the &lt;form&gt; element`. Measured, from a real release.
 *
 * Slack decodes exactly these three on the way in, so escaping here is what makes
 * `<form>` render as `<form>`. Anything else — an apostrophe, an em dash, an emoji —
 * must be left alone: entities Slack does not decode are shown literally.
 */
export function escapeMrkdwn(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Plain markdown → Slack mrkdwn: `**bold**` → `*bold*`, `[text](url)` → `<url|text>`,
 * headings and `-`/`*` bullets normalized. Capped at {@link MAX_BODY} with a stated
 * truncation, so it stays under Slack's per-section limit instead of being rejected whole.
 *
 * Escaping comes FIRST and the link syntax after, in that order on purpose: the `<url|text>`
 * spans are ours and must survive, while every `<` that came from the source must not.
 */
export function toMrkdwn(markdown: string): string {
  let out = escapeMrkdwn(markdown.replace(/\r\n/g, '\n'))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>') // links, before bold
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // **bold** → *bold*
    .replace(/__(.+?)__/g, '*$1*')
    .replace(/^#{1,6}\s+(.*)$/gm, '*$1*') // headings → a bold line
    .replace(/^\s*[-*]\s+/gm, '• ') // bullets
    .trim();

  if (out.length > MAX_BODY) {
    out = `${out
      .slice(0, MAX_BODY)
      // A cut through an entity would leave `&am` on screen, which is the very artefact
      // the escaping exists to remove.
      .replace(/&[a-z#0-9]*$/i, '')
      .trimEnd()}\n… _(truncated — see the source)_`;
  }
  return out;
}

/** Renders a channel-neutral notification into Slack Block Kit. */
export function slackBlocks(notification: Notification): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${LEAD[notification.kind]} *${toMrkdwn(notification.title)}*`,
      },
    },
  ];

  if (notification.body) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: toMrkdwn(notification.body) },
    });
  }

  if (notification.actions?.length) {
    blocks.push({
      type: 'actions',
      elements: notification.actions.map((a) => ({
        type: 'button',
        // NOT escaped: `plain_text` is not parsed, so Slack would show `&lt;` verbatim.
        text: { type: 'plain_text', text: a.label },
        url: a.url,
      })),
    });
  }

  return blocks;
}

/**
 * Posts to Slack, and fails loudly when Slack refuses.
 *
 * The whole reason this is a tested function and not three lines of curl: **Slack answers
 * HTTP 200 even when it rejects the message.** A bad token, a channel the bot was never
 * invited to, a malformed block — every one comes back 200 with `{"ok": false}` in the
 * body. A caller that checks only the status code reports success and delivers nothing.
 */
async function post(
  { token, channel }: SlackConfig,
  notification: Notification,
): Promise<string | undefined> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel,
      // The fallback text is parsed like any other message text — a `<` in an error
      // message would be read as a link span there too.
      text: escapeMrkdwn(notification.text),
      blocks: slackBlocks(notification),
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack is unreachable: HTTP ${response.status}`);
  }

  const body = (await response.json()) as SlackResponse;
  if (!body.ok) {
    throw new Error(
      `Slack refused the message: ${body.error ?? 'unknown error'}`,
    );
  }

  // The message timestamp is the thread. Files go INTO it rather than beside it, so a report
  // cannot end up in the channel detached from the failure it belongs to.
  return body.ts;
}

/**
 * Uploads one file and returns nothing — or throws with Slack's own reason.
 *
 * Three calls, because that is what the current API is: ask for a URL, PUT the bytes there,
 * then tell Slack to attach the finished file to a channel. The old one-shot `files.upload`
 * is deprecated. Every step is checked for `{ok:false}` on an HTTP 200, the same trap as
 * posting: a token without `files:write` answers 200 and uploads nothing.
 */
async function upload(
  { token, channel }: SlackConfig,
  attachment: Attachment,
  threadTs: string | undefined,
): Promise<void> {
  const bytes = await readFile(attachment.path);
  const filename = attachment.title ?? basename(attachment.path);

  const urlResponse = await fetch(
    `${UPLOAD_URL_ENDPOINT}?${new URLSearchParams({
      filename,
      length: String(bytes.byteLength),
    })}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  );
  const urlBody = (await urlResponse.json()) as SlackUploadUrlResponse;
  if (
    !urlResponse.ok ||
    !urlBody.ok ||
    !urlBody.upload_url ||
    !urlBody.file_id
  ) {
    throw new Error(
      `Slack refused an upload URL for ${filename}: ${urlBody.error ?? `HTTP ${urlResponse.status}`}`,
    );
  }

  const put = await fetch(urlBody.upload_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
  });
  if (!put.ok) {
    throw new Error(
      `Slack rejected the bytes of ${filename}: HTTP ${put.status}`,
    );
  }

  const complete = await fetch(UPLOAD_COMPLETE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      files: [{ id: urlBody.file_id, title: filename }],
      channel_id: channel,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    }),
  });
  const completeBody = (await complete.json()) as SlackResponse;
  if (!complete.ok || !completeBody.ok) {
    throw new Error(
      `Slack refused to attach ${filename}: ${completeBody.error ?? `HTTP ${complete.status}`}`,
    );
  }
}

/**
 * Posts, then uploads every attachment, then reports what failed.
 *
 * The order is the point. The message goes first so a broken report cannot swallow the
 * alert — an alert with no attachment is degraded, an attachment with no alert is silence.
 * Every file is attempted before throwing, so one unreadable path does not hide a second
 * one; and it DOES throw, because a step asked to send a report and sending nothing is the
 * failure this whole package exists to make visible. The thrown message says the
 * notification itself arrived, so whoever retries knows they will duplicate it.
 */
async function postWithAttachments(
  config: SlackConfig,
  notification: Notification,
): Promise<void> {
  const threadTs = await post(config, notification);
  const attachments = notification.attachments ?? [];
  if (attachments.length === 0) return;

  const failures: string[] = [];
  for (const attachment of attachments) {
    try {
      await upload(config, attachment, threadTs);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Slack: the notification was posted, but ${failures.length} of ${attachments.length} attachment(s) were not — ` +
        `a retry will duplicate the message. ${failures.join(' | ')}`,
    );
  }
}

/**
 * The Slack transport. Give it a bot token and channel; `notify()` (or a direct
 * `.send()`) delivers channel-neutral notifications to it.
 */
export function slack(config: SlackConfig): Transport {
  return { send: (notification) => postWithAttachments(config, notification) };
}

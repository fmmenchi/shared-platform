import type { Notification, NotificationKind } from './notification.types.js';
import type { Transport } from './transport.types.js';
import type { SlackBlock, SlackConfig } from './slack.types.js';

const ENDPOINT = 'https://slack.com/api/chat.postMessage';

/** Slack's per-section text ceiling is 3000 chars; leave room for the trailing note. */
const MAX_BODY = 2800;

/** Slack's response shape — an internal cast for the parsed body. */
interface SlackResponse {
  ok: boolean;
  error?: string;
}

/** Emoji lead per notification kind — the Slack transport's own styling. */
const LEAD: Record<NotificationKind, string> = {
  release: ':rocket:',
  error: ':rotating_light:',
  info: ':information_source:',
};

/**
 * Plain markdown → Slack mrkdwn: `**bold**` → `*bold*`, `[text](url)` → `<url|text>`,
 * headings and `-`/`*` bullets normalized. Capped at {@link MAX_BODY} with a stated
 * truncation, so it stays under Slack's per-section limit instead of being rejected whole.
 */
export function toMrkdwn(markdown: string): string {
  let out = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>') // links, before bold
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // **bold** → *bold*
    .replace(/__(.+?)__/g, '*$1*')
    .replace(/^#{1,6}\s+(.*)$/gm, '*$1*') // headings → a bold line
    .replace(/^\s*[-*]\s+/gm, '• ') // bullets
    .trim();

  if (out.length > MAX_BODY) {
    out = `${out.slice(0, MAX_BODY).trimEnd()}\n… _(truncated — see the source)_`;
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
): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel,
      text: notification.text,
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
}

/**
 * The Slack transport. Give it a bot token and channel; `notify()` (or a direct
 * `.send()`) delivers channel-neutral notifications to it.
 */
export function slack(config: SlackConfig): Transport {
  return { send: (notification) => post(config, notification) };
}

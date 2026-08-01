import type {
  Notification,
  NotificationKind,
} from '../../notification.types.js';
import type { Transport } from '../../transport.types.js';
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
): Promise<void> {
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
}

/**
 * The Slack transport. Give it a bot token and channel; `notify()` (or a direct
 * `.send()`) delivers channel-neutral notifications to it.
 */
export function slack(config: SlackConfig): Transport {
  return { send: (notification) => post(config, notification) };
}

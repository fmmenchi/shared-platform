import type { ShareChannel } from './channels.js';
import type { ShareContent } from './share.types.js';

/**
 * `encodeURIComponent`, never `URLSearchParams`: the latter writes a space as
 * `+`, which a mail client shows as a literal plus in a `mailto:` body.
 */
const query = (params: Record<string, string | undefined>): string =>
  Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');

/** For the channels with ONE text field: the link goes inside it, last. */
const withUrl = (words: string | undefined, url: string): string =>
  words ? `${words} ${url}` : url;

const BUILDERS: Record<ShareChannel, (content: ShareContent) => string> = {
  whatsapp: ({ url, title, text }) =>
    `https://wa.me/?${query({ text: withUrl(text ?? title, url) })}`,
  x: ({ url, title, text }) =>
    `https://x.com/intent/post?${query({ url, text: text ?? title })}`,
  /* Takes the url and nothing else: the preview is the page's own metadata. */
  facebook: ({ url }) =>
    `https://www.facebook.com/sharer/sharer.php?${query({ u: url })}`,
  telegram: ({ url, title, text }) =>
    `https://t.me/share/url?${query({ url, text: text ?? title })}`,
  email: ({ url, title, text }) =>
    `mailto:?${query({ subject: title, body: withUrl(text, url) })}`,
  bluesky: ({ url, title, text }) =>
    `https://bsky.app/intent/compose?${query({ text: withUrl(text ?? title, url) })}`,
  linkedin: ({ url }) =>
    `https://www.linkedin.com/sharing/share-offsite/?${query({ url })}`,
  /* A submission, and a submission is named: the title comes first here. */
  hackernews: ({ url, title, text }) =>
    `https://news.ycombinator.com/submitlink?${query({ u: url, t: title ?? text })}`,
};

/**
 * The link that opens a channel's own compose screen with the content filled
 * in. A plain `href`: it works with the page's JavaScript switched off.
 *
 * These urls belong to the channels, not to us, and none of them is a
 * versioned API — this function is the one place they are kept current.
 */
export function shareHref(
  channel: ShareChannel,
  content: ShareContent,
): string {
  return BUILDERS[channel](content);
}

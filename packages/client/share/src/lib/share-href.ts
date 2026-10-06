import type { ShareChannel } from './channels.js';
import { given } from './given.js';
import type { ShareContent } from './share.types.js';

/**
 * `encodeURIComponent`, never `URLSearchParams`: the latter writes a space as
 * `+`, which a mail client shows as a literal plus in a `mailto:` body.
 *
 * `toWellFormed` first, because `encodeURIComponent` THROWS on half a
 * surrogate pair — which is what `title.slice(0, n)` leaves behind when it
 * cuts an emoji — and this runs inside a render.
 */
const query = (params: Record<string, string | undefined>): string =>
  Object.entries(params)
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent((value as string).toWellFormed())}`,
    )
    .join('&');

/** For the channels with ONE text field: the link goes inside it, last. */
const withUrl = (words: string | undefined, url: string): string =>
  [words, url].filter(Boolean).join(' ');

/** RFC 6068 §5: a line break in a `mailto:` body is CRLF, whatever it was. */
const crlf = (body: string): string => body.replace(/\r\n|\r|\n/g, '\r\n');

/*
 * Each builder names the page its address was taken from. Two channels publish
 * no such page — the address is the one they serve, observed — and those are
 * the two to check first when a link is reported dead.
 */
const BUILDERS: Record<ShareChannel, (content: ShareContent) => string> = {
  /* https://faq.whatsapp.com/5913398998672934 */
  whatsapp: ({ url, title, text }) =>
    `https://wa.me/?${query({ text: withUrl(text ?? title, url) })}`,
  /* https://docs.x.com/x-for-websites/post-button/guides/web-intent — the
     documented path still says `tweet`. */
  x: ({ url, title, text }) =>
    `https://x.com/intent/tweet?${query({ url, text: text ?? title })}`,
  /* UNDOCUMENTED, observed. Takes the url and nothing else: the preview is the
     page's own metadata. */
  facebook: ({ url }) =>
    `https://www.facebook.com/sharer/sharer.php?${query({ u: url })}`,
  /* https://core.telegram.org/widgets/share */
  telegram: ({ url, title, text }) =>
    `https://t.me/share/url?${query({ url, text: text ?? title })}`,
  /* RFC 6068. No fallback: a subject is a title or nothing. */
  email: ({ url, title, text }) =>
    `mailto:?${query({ subject: title, body: crlf(withUrl(text, url)) })}`,
  /* https://docs.bsky.app/docs/advanced-guides/intent-links */
  bluesky: ({ url, title, text }) =>
    `https://bsky.app/intent/compose?${query({ text: withUrl(text ?? title, url) })}`,
  /* UNDOCUMENTED, observed. */
  linkedin: ({ url }) =>
    `https://www.linkedin.com/sharing/share-offsite/?${query({ url })}`,
  /* https://news.ycombinator.com/bookmarklet.html — a submission, and a
     submission is named: the title comes first here. */
  hackernews: ({ url, title, text }) =>
    `https://news.ycombinator.com/submitlink?${query({ u: url, t: title ?? text })}`,
};

/**
 * The link that opens a channel's own compose screen with the content filled
 * in. A plain `href`: it works with the page's JavaScript switched off.
 *
 * Never throws. An empty `url` is not refused either — it yields a link that
 * carries the words and no address, so check the url where it is produced.
 *
 * These urls belong to the channels, not to us, and none of them is a
 * versioned API — this function is the one place they are kept current.
 */
export function shareHref(
  channel: ShareChannel,
  content: ShareContent,
): string {
  return BUILDERS[channel]({
    url: content.url,
    title: given(content.title),
    text: given(content.text),
  });
}

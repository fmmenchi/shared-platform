import { describe, it, expect } from 'vitest';
import { SHARE_CHANNELS, SHARE_CHANNEL_NAMES } from './channels.js';
import { shareHref } from './share-href.js';

const url = 'https://example.com/blog/a-post';

describe('shareHref', () => {
  it('builds the compose link of each channel', () => {
    const content = { url, title: 'A post', text: 'Worth reading' };

    expect(shareHref('whatsapp', content)).toBe(
      'https://wa.me/?text=Worth%20reading%20https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('x', content)).toBe(
      'https://x.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post&text=Worth%20reading',
    );
    expect(shareHref('facebook', content)).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('telegram', content)).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post&text=Worth%20reading',
    );
    expect(shareHref('email', content)).toBe(
      'mailto:?subject=A%20post&body=Worth%20reading%20https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('bluesky', content)).toBe(
      'https://bsky.app/intent/compose?text=Worth%20reading%20https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('linkedin', content)).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('hackernews', content)).toBe(
      'https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fexample.com%2Fblog%2Fa-post&t=A%20post',
    );
  });

  it('carries the url to every channel, whole', () => {
    // A url with its own query and fragment is the one that breaks a builder
    // which forgot to encode: the `&` ends the parameter and the rest is lost.
    const awkward = 'https://example.com/tours?id=7&lang=it#prezzi';

    for (const channel of SHARE_CHANNELS) {
      const href = shareHref(channel, { url: awkward, title: 'T' });
      const carried = [...new URL(href).searchParams.values()].join(' ');
      expect(carried, channel).toContain(awkward);
    }
  });

  it('writes a space as %20, which is the only form every channel reads', () => {
    // `URLSearchParams` would write `+`, and a mail client shows the plus.
    const href = shareHref('email', { url, title: 'Due parole', text: 'a b' });

    expect(href).not.toContain('+');
    expect(href).toContain('subject=Due%20parole');
  });

  it('keeps what the words contain: an ampersand, a plus, an accent', () => {
    const text = 'Perù & Bolivia: 2+2 giorni';

    const href = shareHref('telegram', { url, text });

    expect(new URL(href).searchParams.get('text')).toBe(text);
  });

  it('falls back to the title where no text was given', () => {
    for (const channel of ['whatsapp', 'x', 'telegram', 'bluesky'] as const) {
      const href = shareHref(channel, { url, title: 'A post' });
      const carried = [...new URL(href).searchParams.values()].join(' ');
      expect(carried, channel).toContain('A post');
    }
  });

  it('reads an empty or blank text as not given, as a form would send it', () => {
    // `text ?? title` kept the `''` a CMS writes for an optional field, and the
    // title was then never used: the link went out with no words at all.
    for (const text of ['', '   ']) {
      expect(shareHref('x', { url, title: 'A post', text })).toBe(
        'https://x.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post&text=A%20post',
      );
    }
    expect(shareHref('hackernews', { url, title: ' ', text: 'x' })).toMatch(
      /&t=x$/,
    );
  });

  it('gives an email no subject for want of a title, and no words for want of a text', () => {
    // No fallback either way: a subject is a title or nothing, and a title is
    // not repeated in the body.
    expect(shareHref('email', { url, text: 'Worth reading' })).toBe(
      'mailto:?body=Worth%20reading%20https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('email', { url, title: 'A post' })).toBe(
      'mailto:?subject=A%20post&body=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
  });

  it('writes a line break in an email body as CRLF, which is what a mail client reads', () => {
    for (const text of ['one\ntwo', 'one\r\ntwo', 'one\rtwo']) {
      expect(shareHref('email', { url: 'https://e.com', text })).toBe(
        'mailto:?body=one%0D%0Atwo%20https%3A%2F%2Fe.com',
      );
    }
  });

  it('does not throw on half an emoji, which is what a truncated title ends in', () => {
    // `encodeURIComponent` throws a URIError on a lone surrogate, and this runs
    // inside a render: one card with a clipped title would take the page down.
    const title = 'Cusco in 3 days 🏔️'.slice(0, 17);

    for (const channel of SHARE_CHANNELS) {
      expect(() => shareHref(channel, { url, title }), channel).not.toThrow();
    }
    expect(shareHref('x', { url, title })).toContain(
      'text=Cusco%20in%203%20days',
    );
  });

  it('builds a link with no address for an empty url, without a stray space', () => {
    // Not refused — it cannot throw from a render — but not padded either.
    const content = { url: '', title: 'A post', text: 'Words' };

    expect(shareHref('whatsapp', content)).toBe('https://wa.me/?text=Words');
    expect(shareHref('bluesky', content)).toBe(
      'https://bsky.app/intent/compose?text=Words',
    );
    expect(shareHref('email', content)).toBe(
      'mailto:?subject=A%20post&body=Words',
    );
  });

  it('names a submission by its title, and by the text only for want of one', () => {
    expect(shareHref('hackernews', { url, title: 'T', text: 'x' })).toMatch(
      /&t=T$/,
    );
    expect(shareHref('hackernews', { url, text: 'x' })).toMatch(/&t=x$/);
  });

  it('leaves out a field it has nothing for, rather than sending it empty', () => {
    expect(shareHref('x', { url })).toBe(
      'https://x.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    expect(shareHref('email', { url })).toBe(
      'mailto:?body=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
    // No stray space in front of the link when there are no words before it.
    expect(shareHref('whatsapp', { url })).toBe(
      'https://wa.me/?text=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
    );
  });
});

describe('SHARE_CHANNEL_NAMES', () => {
  it('spells each channel the way the channel does', () => {
    expect(SHARE_CHANNEL_NAMES).toEqual({
      whatsapp: 'WhatsApp',
      x: 'X',
      facebook: 'Facebook',
      telegram: 'Telegram',
      email: 'Email',
      bluesky: 'Bluesky',
      linkedin: 'LinkedIn',
      hackernews: 'Hacker News',
    });
  });
});

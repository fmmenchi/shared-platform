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
      'https://x.com/intent/post?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post&text=Worth%20reading',
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
    expect(shareHref('x', { url, title: 'A post' })).toContain(
      '&text=A%20post',
    );
    expect(shareHref('whatsapp', { url, title: 'A post' })).toContain(
      'text=A%20post%20https',
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
      'https://x.com/intent/post?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post',
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
  it('names every channel', () => {
    for (const channel of SHARE_CHANNELS) {
      expect(SHARE_CHANNEL_NAMES[channel], channel).toBeTruthy();
    }
  });
});

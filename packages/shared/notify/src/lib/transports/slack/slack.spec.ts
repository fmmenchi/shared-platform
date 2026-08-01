import { slack, slackBlocks, toMrkdwn } from './slack.js';
import { errorNotification, releaseNotification } from '../../notification.js';

/** Slack's shape: a status code, and the truth somewhere else entirely. */
function slackReplies(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const config = { token: 'xoxb-test', channel: 'C0123' };

describe('slack transport — send', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the notification with the bot token, blocks and fallback text', async () => {
    const fetchMock = slackReplies({ ok: true });

    await slack(config).send(
      releaseNotification('dev-blog', '1.0.0', 'https://x'),
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(init.headers.Authorization).toBe('Bearer xoxb-test');

    const sent = JSON.parse(init.body);
    expect(sent.channel).toBe('C0123');
    /* The fallback text is what the phone notification actually shows. */
    expect(sent.text).toBe('dev-blog v1.0.0 released');
    expect(Array.isArray(sent.blocks)).toBe(true);
  });

  it('escapes the fallback text too — it is parsed like any other message', async () => {
    const fetchMock = slackReplies({ ok: true });

    await slack(config).send(
      errorNotification('app', 'cannot read <form> config', 'https://x'),
    );

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.text).toBe('app: cannot read &lt;form&gt; config');
  });

  /* The reason this exists: Slack answers 200 and REFUSES, in the body. */
  it('throws when Slack refuses the message, despite the 200', async () => {
    slackReplies({ ok: false, error: 'invalid_auth' }, 200);
    await expect(
      slack(config).send(errorNotification('app', 'boom', 'https://x')),
    ).rejects.toThrow(/invalid_auth/);
  });

  it('names not_in_channel, the one everybody hits', async () => {
    slackReplies({ ok: false, error: 'not_in_channel' }, 200);
    await expect(
      slack(config).send(errorNotification('app', 'boom', 'https://x')),
    ).rejects.toThrow(/not_in_channel/);
  });

  it('throws when Slack cannot be reached at all', async () => {
    slackReplies({}, 503);
    await expect(
      slack(config).send(errorNotification('app', 'boom', 'https://x')),
    ).rejects.toThrow(/HTTP 503/);
  });
});

describe('slackBlocks', () => {
  it('leads with a kind emoji, adds a body section and action buttons', () => {
    const blocks = slackBlocks(
      releaseNotification('app', '1.0.0', 'https://gh', {
        body: '- one',
      }),
    );

    expect(blocks).toHaveLength(3); // heading + body + actions
    expect((blocks[0] as { text: { text: string } }).text.text).toContain(
      ':rocket:',
    );
    const button = (blocks[2] as { elements: { url: string }[] }).elements[0];
    expect(button.url).toBe('https://gh');
  });

  it('omits the body section when there is none', () => {
    const blocks = slackBlocks(
      releaseNotification('app', '1.0.0', 'https://gh'),
    );
    expect(blocks).toHaveLength(2); // heading + actions only
  });

  it('uses the alarm emoji for errors', () => {
    const blocks = slackBlocks(errorNotification('app', 'boom', 'https://x'));
    expect((blocks[0] as { text: { text: string } }).text.text).toContain(
      ':rotating_light:',
    );
  });
});

describe('toMrkdwn', () => {
  it('converts GitHub markdown to Slack mrkdwn', () => {
    const out = toMrkdwn(
      '## What changed\n- **bold** and a [link](https://ex.com)\n* second',
    );
    expect(out).toContain('*What changed*');
    expect(out).toContain('• *bold*');
    expect(out).toContain('<https://ex.com|link>');
    expect(out).toContain('• second');
    expect(out).not.toContain('**');
  });

  it('caps an oversized body with a stated truncation', () => {
    const out = toMrkdwn('x'.repeat(5000));
    expect(out.length).toBeLessThan(5000);
    expect(out).toContain('truncated');
  });

  /**
   * Slack asks the SENDER to escape `&`, `<` and `>`, and decodes exactly those three.
   * Skipping it is not a cosmetic loss: Slack reads `<…>` as a link or a mention, and
   * shows one that is neither in its escaped form instead. This is the real line that
   * went out — `@fmmenchi/ui@0.0.30` — arriving as `the &lt;form&gt; element`.
   */
  describe('the three characters Slack reserves', () => {
    it('escapes a tag from a commit subject, so Slack renders it', () => {
      const out = toMrkdwn('- **ui:** add form — the <form> element');
      expect(out).toContain('the &lt;form&gt; element');
      expect(out).not.toContain('<form>');
    });

    it('escapes ampersands and stray closing angles', () => {
      expect(toMrkdwn('A & B, and a > b')).toBe('A &amp; B, and a &gt; b');
    });

    it('keeps OUR link spans, which are added after the escaping', () => {
      const out = toMrkdwn('see [the commit](https://ex.com/c/1)');
      expect(out).toContain('<https://ex.com/c/1|the commit>');
    });

    it('escapes an ampersand inside a link URL, as Slack asks', () => {
      const out = toMrkdwn('[q](https://ex.com/s?a=1&b=2)');
      expect(out).toContain('<https://ex.com/s?a=1&amp;b=2|q>');
    });

    it('never truncates through an entity', () => {
      // A cut landing mid-`&amp;` would put `&am` on screen — the exact artefact the
      // escaping exists to remove.
      const out = toMrkdwn(`${'x'.repeat(2798)}&&&&`);
      expect(out).not.toMatch(/&[a-z#0-9]*\n/);
      expect(out).toContain('truncated');
    });

    it('leaves everything else alone — apostrophes, dashes, emoji', () => {
      const out = toMrkdwn("a field's errors — 🚀");
      expect(out).toBe("a field's errors — 🚀");
    });
  });
});

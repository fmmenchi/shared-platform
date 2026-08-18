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

describe('slack transport — attachments', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** The three calls Slack needs, in order, each answering 200 like it always does. */
  function uploadReplies() {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, ts: '1700.1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          upload_url: 'https://files.slack/upload',
          file_id: 'F1',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  async function withFile<T>(run: (path: string) => Promise<T>): Promise<T> {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(join(tmpdir(), 'notify-attach-'));
    const path = join(dir, 'trivy-report.json');
    await writeFile(path, '{"findings":[]}');
    try {
      return await run(path);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it('posts first, then uploads the file into the message thread', async () => {
    const fetchMock = uploadReplies();

    await withFile((path) =>
      slack(config).send(
        errorNotification('dev-blog', 'the audit failed', 'https://run', {
          attachments: [{ path }],
        }),
      ),
    );

    const urls = fetchMock.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls[0]).toContain('chat.postMessage');
    expect(urls[1]).toContain('files.getUploadURLExternal');
    expect(urls[2]).toBe('https://files.slack/upload');
    expect(urls[3]).toContain('files.completeUploadExternal');

    // The file belongs to the alert, not to the channel at large: same thread as the message.
    const complete = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(complete).toMatchObject({
      channel_id: 'C0123',
      thread_ts: '1700.1',
      files: [{ id: 'F1', title: 'trivy-report.json' }],
    });
  });

  it('asks for the URL with the real byte length, not a guess', async () => {
    const fetchMock = uploadReplies();

    await withFile((path) =>
      slack(config).send(
        errorNotification('dev-blog', 'the audit failed', 'https://run', {
          attachments: [{ path, title: 'report.json' }],
        }),
      ),
    );

    const url = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(url.searchParams.get('filename')).toBe('report.json');
    expect(url.searchParams.get('length')).toBe('15');
  });

  it('throws — and says the message already went out — when a file cannot be sent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, ts: '1700.1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: false, error: 'missing_scope' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      withFile((path) =>
        slack(config).send(
          errorNotification('dev-blog', 'the audit failed', 'https://run', {
            attachments: [{ path }],
          }),
        ),
      ),
    ).rejects.toThrow(/notification was posted.*missing_scope/s);
  });

  it('attempts every file before failing, so one bad path cannot hide a second', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      String(url).includes('chat.postMessage')
        ? {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, ts: '1700.1' }),
          }
        : {
            ok: true,
            status: 200,
            json: async () => ({ ok: false, error: 'missing_scope' }),
          },
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      slack(config).send(
        errorNotification('dev-blog', 'the audit failed', 'https://run', {
          attachments: [{ path: '/nope/a.json' }, { path: '/nope/b.json' }],
        }),
      ),
    ).rejects.toThrow(/2 of 2 attachment\(s\) were not/);
  });
});

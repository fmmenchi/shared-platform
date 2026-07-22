import {
  errorBlocks,
  formatChangelog,
  formatReleaseBody,
  postToSlack,
  releaseBlocks,
  type Changelog,
} from './slack.js';

const message = {
  token: 'xoxb-test',
  channel: 'C0123',
  text: 'the scan went red',
};

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

describe('postToSlack', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the message with the bot token', async () => {
    const fetchMock = slackReplies({ ok: true });

    await postToSlack({
      ...message,
      blocks: errorBlocks('dev-blog', 'red', 'https://x'),
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(init.headers.Authorization).toBe('Bearer xoxb-test');

    const sent = JSON.parse(init.body);
    expect(sent.channel).toBe('C0123');
    /* The fallback text is what the phone notification actually shows. */
    expect(sent.text).toBe('the scan went red');
    expect(sent.blocks).toHaveLength(2);
  });

  /*
   * The reason this library exists at all. Slack answers 200 and REFUSES, putting the
   * failure in the body. Verified against the live API with an invalid token: HTTP 200,
   * {"ok": false, "error": "invalid_auth"}.
   *
   * A caller that trusts the status code reports success and delivers nothing.
   */
  it('throws when Slack refuses the message, despite the 200', async () => {
    slackReplies({ ok: false, error: 'invalid_auth' }, 200);

    await expect(postToSlack(message)).rejects.toThrow(/invalid_auth/);
  });

  it('names not_in_channel, the one everybody hits', async () => {
    /* Valid token, real channel — and the bot was never invited to it. */
    slackReplies({ ok: false, error: 'not_in_channel' }, 200);

    await expect(postToSlack(message)).rejects.toThrow(/not_in_channel/);
  });

  it('throws when Slack cannot be reached at all', async () => {
    slackReplies({}, 503);

    await expect(postToSlack(message)).rejects.toThrow(/HTTP 503/);
  });
});

describe('errorBlocks', () => {
  it('names the source app and carries a link back to the run', () => {
    const blocks = errorBlocks('dev-blog', 'the scan went red', 'https://ci/run/1');

    const heading = (blocks[0] as { text: { text: string } }).text.text;
    /* A shared channel needs to know which project is shouting. */
    expect(heading).toContain('dev-blog');

    /* An alert you cannot act on is noise. */
    const button = (blocks[1] as { elements: { url: string }[] }).elements[0];
    expect(button.url).toBe('https://ci/run/1');
  });
});

describe('releaseBlocks', () => {
  it('renders the app name and version with a single leading v', () => {
    const blocks = releaseBlocks(
      'dev-blog',
      '1.0.0',
      'https://gh/releases/tag/v1.0.0',
    );

    const heading = (blocks[0] as { text: { text: string } }).text.text;
    expect(heading).toContain('dev-blog');
    /* The caller passes the bare version; exactly one `v` comes back. */
    expect(heading).toContain('`v1.0.0`');
    expect(heading).not.toContain('vv');

    /* No changelog given → thin message: heading + button only. */
    expect(blocks).toHaveLength(2);
    const button = (
      blocks[1] as { elements: { text: { text: string }; url: string }[] }
    ).elements[0];
    expect(button.text.text).toBe('View release');
    expect(button.url).toBe('https://gh/releases/tag/v1.0.0');
  });

  it('inserts a changelog section between heading and button when given one', () => {
    const changelog: Changelog = {
      fromRef: 'e99cade',
      toRef: '7a831c7',
      commits: [{ sha: '565fee8', subject: 'fix(mobile): restore stack semantics' }],
    };
    const blocks = releaseBlocks('wishew', '3.0.4', 'https://gh', changelog);

    expect(blocks).toHaveLength(3);
    const section = (blocks[1] as { text: { text: string } }).text.text;
    expect(section).toContain('e99cade');
    expect(section).toContain('7a831c7');
    expect(section).toContain('565fee8');
  });

  it('accepts a pre-rendered markdown body (the notes nx release already wrote)', () => {
    const blocks = releaseBlocks('@fmmenchi/notify', '0.0.2', 'https://gh', {
      body: '### Features\n\n- **notify:** add [changelog](https://x) support',
    });

    expect(blocks).toHaveLength(3);
    const section = (blocks[1] as { text: { text: string } }).text.text;
    /* GitHub markdown converted to Slack mrkdwn. */
    expect(section).toContain('*Features*');
    expect(section).toContain('*notify:*');
    expect(section).toContain('<https://x|changelog>');
  });
});

describe('formatReleaseBody', () => {
  it('converts GitHub markdown to Slack mrkdwn', () => {
    const out = formatReleaseBody(
      '## What changed\n- **bold** and a [link](https://ex.com)\n* second',
    );
    expect(out).toContain('*What changed*');
    expect(out).toContain('*bold*');
    expect(out).toContain('<https://ex.com|link>');
    expect(out).toContain('• *bold*'); // bullet normalized, bold preserved
    expect(out).toContain('• second');
    expect(out).not.toContain('**');
  });

  it('caps an oversized body with a stated truncation', () => {
    const out = formatReleaseBody('x'.repeat(5000));
    expect(out.length).toBeLessThan(5000);
    expect(out).toContain('truncated');
  });
});

describe('formatChangelog', () => {
  it('renders the range and one bullet per commit', () => {
    const out = formatChangelog({
      fromRef: 'aaa',
      toRef: 'bbb',
      commits: [
        { sha: 'c1', subject: 'first' },
        { sha: 'c2', subject: 'second' },
      ],
    });

    expect(out).toContain('`aaa` → `bbb`');
    expect(out).toContain('• `c1` first');
    expect(out).toContain('• `c2` second');
  });

  it('states an empty range rather than rendering a bare header', () => {
    const out = formatChangelog({ fromRef: 'aaa', toRef: 'bbb', commits: [] });
    expect(out).toContain('no commits');
  });

  it('caps a long history and says how many it hid — never a silent cut', () => {
    const commits = Array.from({ length: 20 }, (_, i) => ({
      sha: `c${i}`,
      subject: `commit ${i}`,
    }));

    const out = formatChangelog({ fromRef: 'aaa', toRef: 'bbb', commits });

    /* 15 shown, 5 folded into an explicit "+N more". */
    expect(out).toContain('• `c14` commit 14');
    expect(out).not.toContain('• `c15` commit 15');
    expect(out).toContain('+5 more');
  });
});

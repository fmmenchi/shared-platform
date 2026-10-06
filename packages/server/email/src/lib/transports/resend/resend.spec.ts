import type { EmailMessage } from '../../message.types.js';
import { EmailSendError } from '../../send-error.js';
import { formatAddress, resend, resendRequest } from './resend.js';

/** Resend's shape: a status, and a JSON body that may or may not be there. */
function resendReplies(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const config = { apiKey: 're_test' };

const message: EmailMessage = {
  from: { email: 'hello@app.test', name: 'App' },
  to: ['ada@example.test'],
  subject: 'Hi',
  html: '<p>Hi</p>',
  text: 'Hi',
};

describe('resend transport — send', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the message with the API key and returns the id Resend gave it', async () => {
    const fetchMock = resendReplies({ id: '49a3999c' });

    const result = await resend(config).send(message);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toEqual({
      from: '"App" <hello@app.test>',
      to: ['ada@example.test'],
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
    expect(result).toEqual({ messageId: '49a3999c' });
  });

  it.each([
    [401, 'unauthorized', false],
    [403, 'unauthorized', false],
    [422, 'rejected', false],
    [429, 'rate_limited', true],
    [500, 'unreachable', true],
    [503, 'unreachable', true],
  ] as const)(
    'HTTP %i is %s (retryable: %s)',
    async (status, code, retryable) => {
      resendReplies({ name: 'some_reason', message: 'because' }, status);

      const sending = resend(config).send(message);

      await expect(sending).rejects.toBeInstanceOf(EmailSendError);
      await expect(sending).rejects.toMatchObject({ code, retryable });
    },
  );

  it("reports Resend's own reason, under either name it uses for it", async () => {
    resendReplies({ name: 'validation_error', message: 'bad from' }, 422);
    await expect(resend(config).send(message)).rejects.toThrow(
      'Resend refused the message: validation_error: bad from',
    );

    resendReplies({ type: 'invalid_parameter', message: 'bad to' }, 422);
    await expect(resend(config).send(message)).rejects.toThrow(
      'Resend refused the message: invalid_parameter: bad to',
    );
  });

  /* A gateway's error page is not JSON; the status is all there is to report. */
  it('reports the status when the refusal has no JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }),
    );

    await expect(resend(config).send(message)).rejects.toMatchObject({
      code: 'unreachable',
      message: 'Resend refused the message: HTTP 502',
    });
  });

  it('is unreachable, with the cause kept, when the request itself fails', async () => {
    const cause = new TypeError('fetch failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

    await expect(resend(config).send(message)).rejects.toMatchObject({
      code: 'unreachable',
      retryable: true,
      cause,
    });
  });

  /* An acceptance nobody can point at later is not reported as one. */
  it.each([{}, null, { id: '' }])(
    'throws on a 200 whose body is %j — no message id',
    async (body) => {
      resendReplies(body);

      await expect(resend(config).send(message)).rejects.toMatchObject({
        code: 'unreachable',
      });
    },
  );
});

describe('resendRequest', () => {
  it('renames what Resend names differently and encodes attachments as base64', () => {
    const request = resendRequest({
      ...message,
      cc: [{ email: 'cc@example.test' }],
      bcc: ['bcc@example.test'],
      replyTo: [{ email: 'support@app.test', name: 'Support' }],
      headers: { 'X-Entity-Ref-ID': '42' },
      attachments: [
        {
          filename: 'invoice.pdf',
          content: new TextEncoder().encode('%PDF'),
          contentType: 'application/pdf',
        },
        { filename: 'note.txt', content: new TextEncoder().encode('hi') },
      ],
    });

    expect(request).toMatchObject({
      cc: ['cc@example.test'],
      bcc: ['bcc@example.test'],
      reply_to: ['"Support" <support@app.test>'],
      headers: { 'X-Entity-Ref-ID': '42' },
      attachments: [
        {
          filename: 'invoice.pdf',
          content: 'JVBERg==',
          content_type: 'application/pdf',
        },
        { filename: 'note.txt', content: 'aGk=' },
      ],
    });
    expect(request).not.toHaveProperty('replyTo');
  });

  it('leaves absent optional fields out, rather than sending them as null', () => {
    expect(Object.keys(resendRequest(message)).sort()).toEqual([
      'from',
      'html',
      'subject',
      'text',
      'to',
    ]);
  });
});

describe('formatAddress', () => {
  it('passes a bare address through', () => {
    expect(formatAddress('ada@example.test')).toBe('ada@example.test');
    expect(formatAddress({ email: 'ada@example.test' })).toBe(
      'ada@example.test',
    );
  });

  /* Unquoted, the comma would make this two mailboxes, the first one invalid. */
  it('quotes the name, so a comma stays part of it', () => {
    expect(
      formatAddress({ email: 'm@example.test', name: 'Rossi, Mario' }),
    ).toBe('"Rossi, Mario" <m@example.test>');
  });

  it('escapes a quote and a backslash inside the name', () => {
    expect(formatAddress({ email: 'a@example.test', name: 'Ada "A\\B"' })).toBe(
      '"Ada \\"A\\\\B\\"" <a@example.test>',
    );
  });
});

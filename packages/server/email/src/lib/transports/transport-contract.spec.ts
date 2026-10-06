import type { EmailMessage } from '../message.types.js';
import type { EmailTransport } from '../transport.types.js';
import { fake } from './fake/fake.js';
import { resend } from './resend/resend.js';

/**
 * What every `EmailTransport` owes its caller, run against each implementation.
 *
 * A new transport is added to this table: it is accepted when it passes the same
 * assertions as the others, not when its own spec says it works.
 */
const implementations: [name: string, create: () => EmailTransport][] = [
  ['fake', () => fake()],
  ['resend', () => resend({ apiKey: 're_test' })],
];

const message: EmailMessage = {
  from: { email: 'hello@app.test', name: 'App' },
  to: ['ada@example.test', { email: 'bob@example.test', name: 'Bob' }],
  replyTo: ['support@app.test'],
  subject: 'Hi',
  html: '<p>Hi</p>',
  text: 'Hi',
  headers: { 'X-Entity-Ref-ID': '42' },
  attachments: [{ filename: 'a.txt', content: new Uint8Array([104, 105]) }],
};

describe.each(implementations)('EmailTransport contract — %s', (_, create) => {
  beforeEach(() => {
    // The provider accepting. A transport that never touches the network ignores it.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'provider-id' }),
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('resolves an accepted message to a non-empty message id, and nothing else', async () => {
    const result = await create().send(message);

    expect(Object.keys(result)).toEqual(['messageId']);
    expect(result.messageId).toEqual(expect.any(String));
    expect(result.messageId).not.toBe('');
  });

  it('does not mutate the message it was given', async () => {
    const given = structuredClone(message);

    await create().send(given);

    expect(given).toEqual(message);
  });
});

import type { EmailMessage } from '../../message.types.js';
import { fake } from './fake.js';

const message: EmailMessage = {
  from: 'hello@app.test',
  to: ['ada@example.test'],
  subject: 'Hi',
  html: '<p>Hi</p>',
  text: 'Hi',
};

describe('fake transport', () => {
  it('keeps every message, in order, and numbers them', async () => {
    const transport = fake();

    const first = await transport.send(message);
    const second = await transport.send({ ...message, subject: 'Again' });

    expect([first.messageId, second.messageId]).toEqual(['fake-1', 'fake-2']);
    expect(transport.sent.map((sent) => sent.subject)).toEqual(['Hi', 'Again']);
  });

  /* What a test reads back is what was sent, not what the caller's object became. */
  it('records the message as it was when sent', async () => {
    const transport = fake();
    const mutable = { ...message, to: ['ada@example.test'] };

    await transport.send(mutable);
    mutable.to.push('late@example.test');

    expect(transport.sent[0].to).toEqual(['ada@example.test']);
  });

  it('shares nothing between two fakes', async () => {
    const one = fake();
    const other = fake();

    await one.send(message);

    expect(other.sent).toHaveLength(0);
  });
});

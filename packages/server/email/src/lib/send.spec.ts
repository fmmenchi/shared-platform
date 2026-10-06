import type { Envelope } from './message.types.js';
import { sendEmail } from './send.js';
import { EmailSendError } from './send-error.js';
import type { EmailTemplate, Renderer } from './template.types.js';
import { fake } from './transports/fake/fake.js';

interface Welcome {
  name: string;
}

const welcome: EmailTemplate<Welcome> = {
  subject: (data) => `Welcome, ${data.name}`,
  text: (data) => `Hi ${data.name}`,
  body: (data) => `<mjml>${data.name}</mjml>`,
};

/** A renderer that shows what it was given, so a test can see the body reached it. */
const renderer: Renderer = {
  render: async (source) => ({ html: `<html>${source}</html>` }),
};

const envelope: Envelope = {
  from: { email: 'hello@app.test', name: 'App' },
  to: ['ada@example.test'],
};

describe('sendEmail', () => {
  it('renders the template with its data and hands the transport one whole message', async () => {
    const transport = fake();

    const result = await sendEmail(
      transport,
      renderer,
      welcome,
      { name: 'Ada' },
      { ...envelope, replyTo: ['support@app.test'] },
    );

    expect(result).toEqual({ messageId: 'fake-1' });
    expect(transport.sent).toEqual([
      {
        from: { email: 'hello@app.test', name: 'App' },
        to: ['ada@example.test'],
        replyTo: ['support@app.test'],
        subject: 'Welcome, Ada',
        text: 'Hi Ada',
        html: '<html><mjml>Ada</mjml></html>',
      },
    ]);
  });

  it('refuses a message with no recipient before rendering anything', async () => {
    const transport = fake();
    const render = vi.fn(renderer.render);

    const sending = sendEmail(
      transport,
      { render },
      welcome,
      { name: 'Ada' },
      { ...envelope, to: [] },
    );

    await expect(sending).rejects.toMatchObject({
      name: 'EmailSendError',
      code: 'invalid_message',
    });
    expect(render).not.toHaveBeenCalled();
    expect(transport.sent).toHaveLength(0);
  });

  /* A line break in a subject is how a second header gets into a message. */
  it.each(['\n', '\r', '\r\n'])(
    'refuses a subject containing %j',
    async (lineBreak) => {
      const transport = fake();

      await expect(
        sendEmail(
          transport,
          renderer,
          welcome,
          { name: `Ada${lineBreak}Bcc: everyone@example.test` },
          envelope,
        ),
      ).rejects.toMatchObject({ code: 'invalid_message', retryable: false });
      expect(transport.sent).toHaveLength(0);
    },
  );

  it('lets a renderer failure through and sends nothing', async () => {
    const transport = fake();
    const broken: Renderer = {
      render: async () => {
        throw new Error('unknown tag');
      },
    };

    await expect(
      sendEmail(transport, broken, welcome, { name: 'Ada' }, envelope),
    ).rejects.toThrow('unknown tag');
    expect(transport.sent).toHaveLength(0);
  });

  it('lets the transport error through unchanged', async () => {
    const refusal = new EmailSendError('rate_limited', 'slow down');

    await expect(
      sendEmail(
        { send: () => Promise.reject(refusal) },
        renderer,
        welcome,
        { name: 'Ada' },
        envelope,
      ),
    ).rejects.toBe(refusal);
  });
});

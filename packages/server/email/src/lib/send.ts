import type { Envelope } from './message.types.js';
import { EmailSendError } from './send-error.js';
import type { EmailTemplate, Renderer } from './template.types.js';
import type { EmailTransport, SendResult } from './transport.types.js';

/**
 * Renders a template with its data and delivers it: the one call an app makes.
 *
 * The checks here are the ones no transport should have to repeat. A line break in a
 * subject is how a header gets injected into a message — an HTTP provider happens to
 * neutralise it, an SMTP one does not, and the core cannot know which it was handed.
 */
export async function sendEmail<Data>(
  transport: EmailTransport,
  renderer: Renderer,
  template: EmailTemplate<Data>,
  data: Data,
  envelope: Envelope,
): Promise<SendResult> {
  if (envelope.to.length === 0) {
    throw new EmailSendError(
      'invalid_message',
      'The message has no recipient.',
    );
  }

  const subject = template.subject(data);
  if (/[\r\n]/.test(subject)) {
    throw new EmailSendError(
      'invalid_message',
      'The subject contains a line break.',
    );
  }

  const { html } = await renderer.render(template.body(data));

  return transport.send({
    ...envelope,
    subject,
    html,
    text: template.text(data),
  });
}

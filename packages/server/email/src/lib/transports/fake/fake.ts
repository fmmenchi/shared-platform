import type { EmailMessage } from '../../message.types.js';
import type { FakeTransport } from './fake.types.js';

/**
 * A transport that delivers nowhere and remembers everything: for a consumer's tests, and
 * for an environment that must not send mail.
 *
 * A real implementation of the interface, not a switch inside another one — the code under
 * test takes an `EmailTransport` and cannot tell. Each message is copied on the way in, so
 * what a test reads back is what was sent, whatever the caller did to its object afterwards.
 */
export function fake(): FakeTransport {
  const sent: EmailMessage[] = [];
  return {
    sent,
    send: async (message) => {
      sent.push(structuredClone(message));
      return { messageId: `fake-${sent.length}` };
    },
  };
}

import type { EmailMessage } from './message.types.js';

/** What a provider hands back for an accepted message — and nothing provider-shaped. */
export interface SendResult {
  /** The provider's own id for the message: the handle for its logs and webhooks. */
  messageId: string;
}

/**
 * Delivers one message through one provider. This is the abstraction the package exists
 * for: `resend()` and `fake()` return one, and an app may write its own.
 *
 * The contract is more than the signature:
 * - a message the provider did not accept REJECTS with an `EmailSendError` — never a
 *   resolved promise carrying a failure flag;
 * - a field the provider cannot carry is refused the same way, never silently dropped;
 * - the message is not mutated.
 */
export interface EmailTransport {
  send(message: EmailMessage): Promise<SendResult>;
}

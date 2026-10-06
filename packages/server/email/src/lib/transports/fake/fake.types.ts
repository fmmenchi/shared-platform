import type { EmailMessage } from '../../message.types.js';
import type { EmailTransport } from '../../transport.types.js';

/** An `EmailTransport` that keeps what it was asked to send. */
export interface FakeTransport extends EmailTransport {
  /** Every message accepted so far, oldest first. */
  readonly sent: readonly EmailMessage[];
}

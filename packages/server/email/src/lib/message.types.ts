/** A mailbox: the bare address, or the address with the name a mail client shows beside it. */
export type Address = string | { email: string; name?: string };

/**
 * A file sent with a message.
 *
 * BYTES, not a path — the opposite call from `@fmmenchi/notify`, and for the opposite
 * reason. A notification carries a report something already wrote to disk; an email
 * attachment is usually produced for the recipient (an invoice, a ticket) by code that may
 * run where there is no disk at all.
 */
export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  /** MIME type. Omitted, the provider infers it from the filename. */
  contentType?: string;
}

/**
 * A provider-neutral email, fully rendered. This is the seam: a renderer produces `html`,
 * a transport delivers the whole — neither knows the other exists.
 */
export interface EmailMessage {
  from: Address;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  replyTo?: Address[];
  subject: string;
  html: string;
  /**
   * The plain-text alternative. Never optional: it is what a screen reader, a watch and a
   * client with images off actually show, and a message without one scores as spam.
   */
  text: string;
  headers?: Record<string, string>;
  /** A transport that cannot carry files must refuse the message, not drop them. */
  attachments?: EmailAttachment[];
}

/** Who a message is from and for — everything in it that a template does not render. */
export type Envelope = Omit<EmailMessage, 'subject' | 'html' | 'text'>;

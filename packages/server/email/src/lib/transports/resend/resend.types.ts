/** What the Resend transport needs to send on an app's behalf. */
export interface ResendConfig {
  /** A Resend API key (`re_…`) allowed to send from the message's `from` domain. */
  apiKey: string;
}

/** The body of `POST /emails`, in Resend's own field names. */
export interface ResendRequest {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  attachments?: ResendAttachment[];
}

export interface ResendAttachment {
  filename: string;
  /** Base64. */
  content: string;
  content_type?: string;
}

/**
 * What Resend answers. Every field optional on purpose: this is parsed from a body we do
 * not control, and the transport decides from the HTTP status, not from a field that a
 * proxy's error page would not have.
 */
export interface ResendResponse {
  id?: string;
  /** The machine-readable reason of a refusal, e.g. `validation_error`. */
  name?: string;
  /** The same reason under the name Resend's error reference documents it by. */
  type?: string;
  message?: string;
}

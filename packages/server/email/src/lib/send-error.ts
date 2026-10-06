/**
 * Why a message was not sent, in terms every transport can map its provider's answer to.
 *
 * - `invalid_message` — refused before leaving: no recipient, a line break in the subject.
 * - `unauthorized` — the provider does not accept these credentials, or not for this sender.
 * - `rejected` — the provider understood the request and said no.
 * - `rate_limited` — a quota or rate limit; the same message can succeed later.
 * - `unreachable` — no usable answer: the network failed, or the provider did.
 */
export type EmailSendErrorCode =
  | 'invalid_message'
  | 'unauthorized'
  | 'rejected'
  | 'rate_limited'
  | 'unreachable';

/** The codes for which sending the SAME message again can succeed. */
const RETRYABLE: ReadonlySet<EmailSendErrorCode> = new Set([
  'rate_limited',
  'unreachable',
]);

/**
 * The one error a transport throws. A caller decides what to do from `code` and
 * `retryable` without knowing which provider is behind the interface; the provider's own
 * wording stays in `message`, and whatever it threw stays in `cause`.
 */
export class EmailSendError extends Error {
  readonly code: EmailSendErrorCode;
  readonly retryable: boolean;

  constructor(
    code: EmailSendErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'EmailSendError';
    this.code = code;
    this.retryable = RETRYABLE.has(code);
  }
}

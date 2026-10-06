import type { Address, EmailMessage } from '../../message.types.js';
import { EmailSendError, type EmailSendErrorCode } from '../../send-error.js';
import type { EmailTransport, SendResult } from '../../transport.types.js';
import type {
  ResendConfig,
  ResendRequest,
  ResendResponse,
} from './resend.types.js';

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * An address as a mail header writes it: `Name <email>`.
 *
 * The name is quoted, always. An unquoted `Rossi, Mario <m@x.it>` is two mailboxes to a
 * parser, the first of them invalid — quoting is what makes the comma part of the name.
 */
export function formatAddress(address: Address): string {
  if (typeof address === 'string') return address;
  if (!address.name) return address.email;
  return `"${address.name.replace(/[\\"]/g, '\\$&')}" <${address.email}>`;
}

/** A neutral message in Resend's field names. Absent optional fields stay absent. */
export function resendRequest(message: EmailMessage): ResendRequest {
  return {
    from: formatAddress(message.from),
    to: message.to.map(formatAddress),
    ...(message.cc && { cc: message.cc.map(formatAddress) }),
    ...(message.bcc && { bcc: message.bcc.map(formatAddress) }),
    ...(message.replyTo && { reply_to: message.replyTo.map(formatAddress) }),
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.headers && { headers: message.headers }),
    ...(message.attachments && {
      attachments: message.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content).toString('base64'),
        ...(attachment.contentType && {
          content_type: attachment.contentType,
        }),
      })),
    }),
  };
}

/**
 * Which of our codes an HTTP status is. Decided from the status alone: Resend's `name`
 * is finer-grained, but the status is the part of the answer that is still there when
 * the body is a gateway's error page.
 */
function codeFor(status: number): EmailSendErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'unreachable';
  return 'rejected';
}

async function post(
  { apiKey }: ResendConfig,
  message: EmailMessage,
): Promise<SendResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(resendRequest(message)),
    });
  } catch (cause) {
    throw new EmailSendError('unreachable', 'Resend is unreachable.', {
      cause,
    });
  }

  // Parsed leniently: a refusal is reported with Resend's reason when the body has one,
  // and with the status when it does not — never with a JSON parse error in its place.
  const body = (await response
    .json()
    .catch(() => ({}))) as ResendResponse | null;

  if (!response.ok) {
    const reason = [body?.name ?? body?.type, body?.message]
      .filter(Boolean)
      .join(': ');
    throw new EmailSendError(
      codeFor(response.status),
      `Resend refused the message: ${reason || `HTTP ${response.status}`}`,
    );
  }

  // A 2xx without an id is not an acceptance we can point at later, so it is not one.
  if (!body?.id) {
    throw new EmailSendError(
      'unreachable',
      `Resend answered HTTP ${response.status} without a message id.`,
    );
  }

  return { messageId: body.id };
}

/**
 * The Resend transport, over its HTTP API with `fetch` — no SDK, so nothing here is tied
 * to a runtime. Give it an API key; `sendEmail()` (or a direct `.send()`) delivers through it.
 */
export function resend(config: ResendConfig): EmailTransport {
  return { send: (message) => post(config, message) };
}

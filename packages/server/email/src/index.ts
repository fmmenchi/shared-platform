export type {
  Address,
  EmailAttachment,
  EmailMessage,
  Envelope,
} from './lib/message.types.js';
export type { EmailTransport, SendResult } from './lib/transport.types.js';
export type {
  EmailTemplate,
  RenderedBody,
  Renderer,
} from './lib/template.types.js';
export { EmailSendError } from './lib/send-error.js';
export type { EmailSendErrorCode } from './lib/send-error.js';
export { sendEmail } from './lib/send.js';
export { escape } from './lib/escape.js';

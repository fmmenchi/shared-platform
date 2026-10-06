import { EmailSendError } from './send-error.js';

describe('EmailSendError', () => {
  it.each([
    ['rate_limited', true],
    ['unreachable', true],
    ['invalid_message', false],
    ['unauthorized', false],
    ['rejected', false],
  ] as const)('%s — retryable: %s', (code, retryable) => {
    expect(new EmailSendError(code, 'x').retryable).toBe(retryable);
  });

  it('is an Error a caller can catch by class, and keeps what caused it', () => {
    const cause = new TypeError('fetch failed');
    const error = new EmailSendError('unreachable', 'down', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('EmailSendError');
    expect(error.message).toBe('down');
    expect(error.cause).toBe(cause);
  });
});

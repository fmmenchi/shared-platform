---
title: '@fmmenchi/email'
sidebar_label: email
sidebar_position: 1
---

# @fmmenchi/email

Transactional email in three seams: a **template** your app authors, a **renderer** that compiles
its markup (MJML), and a **transport** that delivers it — behind one interface, so the provider is
a line of wiring and not a dependency of your templates.

```bash
pnpm add @fmmenchi/email mjml
```

`mjml` is an optional peer: install it if you use `@fmmenchi/email/mjml`.

## Usage

```ts
// emails/welcome.ts — the template lives in YOUR app
import { escape, type EmailTemplate } from '@fmmenchi/email';

export const welcome: EmailTemplate<{ name: string; url: string }> = {
  subject: (data) => `Welcome, ${data.name}`,
  text: (data) => `Hi ${data.name}, confirm your address: ${data.url}`,
  body: (data) => `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Hi ${escape(data.name)}</mj-text>
            <mj-button href="${escape(data.url)}">Confirm</mj-button>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>`,
};
```

```ts
// wiring — the one place that knows the provider
import { sendEmail } from '@fmmenchi/email';
import { mjmlRenderer } from '@fmmenchi/email/mjml';
import { resend } from '@fmmenchi/email/resend';

const transport = resend({ apiKey: process.env.RESEND_API_KEY! });
const renderer = mjmlRenderer();

const { messageId } = await sendEmail(
  transport,
  renderer,
  welcome,
  { name: 'Ada', url: 'https://app.example/confirm/…' },
  {
    from: { email: 'hello@app.example', name: 'App' },
    to: ['ada@example.com'],
  },
);
```

## Entry points

| Import                   | What                                                                 | Needs  |
| ------------------------ | -------------------------------------------------------------------- | ------ |
| `@fmmenchi/email`        | Contracts, `sendEmail`, `EmailSendError`, `escape`. No dependencies. | —      |
| `@fmmenchi/email/mjml`   | `mjmlRenderer()` — MJML → HTML, strict validation.                   | `mjml` |
| `@fmmenchi/email/resend` | `resend({ apiKey })` — Resend's HTTP API over `fetch`.               | —      |
| `@fmmenchi/email/fake`   | `fake()` — delivers nowhere, keeps every message in `.sent`.         | —      |

## Failure is an exception, with a reason you can act on

A transport either returns `{ messageId }` or throws an `EmailSendError`:

| `code`            | Meaning                                                            | `retryable` |
| ----------------- | ------------------------------------------------------------------ | ----------- |
| `invalid_message` | Refused before leaving: no recipient, a line break in the subject. | no          |
| `unauthorized`    | The provider rejects the credentials, or the sender.               | no          |
| `rejected`        | The provider understood the request and said no.                   | no          |
| `rate_limited`    | A quota or rate limit.                                             | yes         |
| `unreachable`     | The network failed, or the provider did.                           | yes         |

```ts
try {
  await sendEmail(transport, renderer, welcome, data, envelope);
} catch (error) {
  if (error instanceof EmailSendError && error.retryable) queue.retryLater(job);
  else throw error;
}
```

A template that does not compile throws MJML's own error from `sendEmail` — nothing is sent.

## Testing your app

```ts
import { fake } from '@fmmenchi/email/fake';

const transport = fake();
await signUp({ transport, renderer }, 'ada@example.com');

expect(transport.sent).toHaveLength(1);
expect(transport.sent[0].subject).toBe('Welcome, Ada');
```

## Writing a transport

Implement one method; map the provider's refusals to `EmailSendError`.

```ts
import { EmailSendError, type EmailTransport } from '@fmmenchi/email';

export function myProvider(config: MyConfig): EmailTransport {
  return {
    send: async (message) => {
      // … call the provider; throw new EmailSendError('rejected', reason) when it says no
      return { messageId };
    },
  };
}
```

## Boundaries

- **Escape what you interpolate.** A template is a function returning a string; `escape()` is what
  keeps a user's name from being compiled as markup. This package cannot do it for you.
- **No templates, layouts or brand** ship here — they are your app's content.
- **Deliverability is yours** — SPF, DKIM and DMARC on the sending domain are configuration, not
  code.
- **Node.** `scope:server`; the core and the transports use only `fetch` and `Buffer`, the MJML
  renderer needs MJML's Node toolchain.

Why this is a package of its own and not a `@fmmenchi/notify` transport:
[ADR-0036](../../adr/0036-transactional-email-is-its-own-layer.md).

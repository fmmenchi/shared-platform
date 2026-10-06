# AGENTS.md — @fmmenchi/email

Transactional email as three seams: a **template** the app authors, a **renderer** that compiles
its markup (MJML), and a **transport** that delivers the result (Resend over HTTP, a fake for
tests). Part of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md).
Scope `server`, type `util`. Why it is its own package and not a `@fmmenchi/notify` transport:
[ADR-0036](../../../apps/docusaurus/docs/adr/0036-transactional-email-is-its-own-layer.md).

## Commands

```bash
pnpm nx typecheck @fmmenchi/email
pnpm nx build @fmmenchi/email
pnpm nx lint @fmmenchi/email
pnpm nx test @fmmenchi/email    # node vitest; fetch stubbed via vi.stubGlobal, MJML runs for real
```

## Shape

`template → renderer → EmailMessage → transport`. Everything lives under `src/lib/`.

- **Core** (`.`, zero dependencies) — the contracts (`EmailMessage`, `Envelope`, `EmailTemplate`,
  `Renderer`, `EmailTransport`, `SendResult`), `sendEmail()`, `EmailSendError`, `escape()`. The
  core imports no renderer and no transport.
- **`lib/renderers/<name>/`** — implementations of `Renderer`. `mjml/` → `@fmmenchi/email/mjml`,
  with `mjml` as an **optional peer**.
- **`lib/transports/<name>/`** — implementations of `EmailTransport`. `resend/` →
  `@fmmenchi/email/resend` (plain `fetch`, no SDK); `fake/` → `@fmmenchi/email/fake`.
- **`lib/transports/transport-contract.spec.ts`** — what every transport owes its caller, run
  against each one.

## Rules

- **No templates, layouts or brand here.** They are consumer content (ADR-0008). The package ships
  the engine; an app's emails live in the app.
- **A new provider = a new folder under `lib/transports/`, its own subpath export, and a row in
  `transport-contract.spec.ts`.** Same for a renderer under `lib/renderers/`. A dependency an
  implementation needs is an optional peer, never a `dependency` of the package.
- **A transport throws `EmailSendError` or returns a `messageId`** — nothing in between. Map the
  provider's answer to a `code` from the HTTP status; keep its wording in `message`. A field the
  provider cannot carry is refused, not dropped. Never mutate the message.
- **`text` is never optional**, on a template or a message.
- **MJML validation stays `strict`.** Its default (`soft`) drops markup it does not understand and
  returns usable HTML with the problem in an `errors` array nobody reads — measured against
  `mjml@5.4.1`. The renderer spec pins it.
- **Interpolated values go through `escape()`.** A template is a function returning a string;
  nothing downstream can tell data from markup.
- **The fake is an implementation, not a mode.** No `if (test)` inside a real transport.
- **Types in `*.types.ts`**, except a type that is derived from, or inseparable from, the code
  beside it (`EmailSendErrorCode` with `EmailSendError`).

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

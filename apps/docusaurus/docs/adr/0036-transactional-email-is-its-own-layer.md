# ADR 0036 — Transactional email is its own layer, not a notify transport

- **Status:** proposed
- **Date:** 2026-10-06
- **Deciders:** Fabio Menchicchi

## Context and problem statement

`@fmmenchi/notify` was written with email in mind. Its contract says so twice: "email/webhook are
future transports, not future packages", and "adding a channel = a new `Transport`, not a new
package". Taken literally, the first app that needs to send an email adds `email(...)` beside
`slack(...)` and is done.

What an app needs to send is not that. A welcome message, a password reset, a receipt: one
recipient, a subject and a body composed for that recipient from the app's own template, in HTML
that mail clients render — which in practice means a markup like MJML compiled to table-based
HTML — with a hand-written plain-text alternative. And the app needs to be able to change provider
without touching a template.

Two things called "email" are in play, and they pull in different directions.

## Decision drivers

- **[ADR-0008](./0008-cross-app-framework-agnostic-layers.md)** — a layer is cross-app reusable and
  framework-agnostic; one cohesive concept per package; content authored per app is never a layer; a
  port with adapters only for an ongoing runtime capability.
- **The scope rule** ([architecture](../architecture.md)) — `shared` runs anywhere and depends only
  on `shared`.
- **One fact, one owner** — the same reason `notify` has one `Transport` interface.

## Decision

### 1. Two concepts, two packages

- **A notification** tells a channel that something happened. Its payload is neutral on purpose —
  `kind`, `title`, a markdown `body` — and it has no recipient: the channel is configuration.
  This stays `@fmmenchi/notify`.
- **A transactional email** is a message composed for one recipient from a template. Its payload is
  an email — `from`, `to`, `subject`, `html`, `text`. This is **`@fmmenchi/email`**, in
  `packages/server/`.

Folding the second into the first fails on the payload before anything else: `Transport.send`
takes a `Notification`, and making it carry an email means either widening `Notification` until it
is no longer neutral, or smuggling the email through a field the other transports ignore.

It fails on scope second. `notify` is `scope:shared` and pure — `fetch` and nothing else — which is
what lets a CI step call it. An MJML toolchain does not belong in a package with that profile, even
behind an optional peer.

### 2. Three seams, and the core imports none of the implementations

`template → renderer → EmailMessage → transport`.

- **`EmailTemplate<Data>`** — `subject`, `text` and `body` as functions of the same data. Authored
  by the consumer. **No template, layout or brand value lives in the package** (ADR-0008: the engine
  may be a layer, the content never is).
- **`Renderer`** — compiles the body's markup to HTML. One implementation: MJML.
- **`EmailTransport`** — delivers an `EmailMessage`. Two implementations: Resend over its HTTP API,
  and a fake that records what it was asked to send.

Sending is exactly the "ongoing runtime capability" for which ADR-0008 allows a port. The renderer
is an interface for a different reason: it is one file, and it is what keeps MJML — 110 transitive
packages — out of the core and behind an optional peer.

### 3. Implementations are folders with their own subpath, in one package

`lib/transports/<name>/` and `lib/renderers/<name>/`, each exported as `@fmmenchi/email/<name>`,
each bringing its dependency as an **optional peer**. This is the shape `@fmmenchi/ui-form-ports`
already has for five form libraries. Separate packages per provider would be versions that only
ever move together: a change to `EmailMessage` touches all of them.

### 4. What the transport contract says beyond its signature

- A message the provider did not accept **rejects** with an `EmailSendError` carrying a
  provider-neutral `code` and whether the same message is worth retrying. Never a resolved promise
  with a failure flag — the lesson `notify` learnt from Slack's HTTP 200.
- A field a provider cannot carry is refused, not dropped.
- `SendResult` is `{ messageId }` and nothing provider-shaped.

One spec runs these against every implementation; a new transport joins that table.

### 5. `notify`'s rule is narrowed, not withdrawn

"A channel is a transport, not a package" still holds for **notifications**. An ops alert delivered
by email is a `notify` transport that renders a `Notification` as a plain message. `shared` cannot
depend on `server`, so when that transport is wanted the adapter is exported from the email side
(`@fmmenchi/email/notify`, implementing `notify`'s `Transport`). It is not built now: nothing asks
for it.

## Consequences

- `@fmmenchi/email` is the second inhabitant of the `server` scope.
- `packages/shared/notify/AGENTS.md` says which "email" its rule is about.
- **Escaping is the consumer's job, and the package can only help.** A template is a function
  returning a string, so nothing downstream can tell a user's name from markup. `escape()` is
  provided; forgetting it is not detectable here. An auto-escaping tagged template would close that
  gap and is the obvious next step if it bites.
- **MJML runs when the email is sent.** That is right for a Node server and wrong for an edge
  runtime, where its toolchain does not fit. The answer there is a renderer that compiles at build
  time and interpolates afterwards — which changes what `EmailTemplate.body` returns. It is not
  designed here because no consumer is on that runtime yet; it is named so that the first one is
  not a surprise.

## Where this departs from ADR-0008

ADR-0008 says new layers are "extracted, not invented — anchored to a proven implementation". This
one is not extracted: it was designed from the contract down, with `notify` as the model for its
shape, and no app's working email code was read first. The two admission gates hold; the anchor
does not exist. The first consumer is therefore also the first test of the design, and its findings
are expected to change this package rather than be worked around in the app.

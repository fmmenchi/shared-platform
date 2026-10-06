# @fmmenchi/share

Share a page: the **intent link** of each channel, a **clipboard write** that reports whether it
happened, and the **native share sheet** with its dismissal told apart from a failure.
Framework-agnostic, browser-side, **no dependencies**.

```bash
pnpm add @fmmenchi/share
```

## Why

Two apps wrote this on their own and it diverged where it matters: one announced "link copied" for a
write the clipboard had refused, the two linked the same channel at two different addresses, and
both swallowed every error from the native sheet in the `catch` meant for a dismissal.

## Use

```ts
import {
  shareHref,
  copyText,
  canShareNatively,
  shareNatively,
  SHARE_CHANNEL_NAMES,
} from '@fmmenchi/share';

const content = { url: 'https://example.com/blog/a-post', title: 'A post' };

shareHref('x', content);
// 'https://x.com/intent/post?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post&text=A%20post'

SHARE_CHANNEL_NAMES.hackernews; // 'Hacker News'

await copyText(content.url); // true ONLY for a write that went through

canShareNatively(); // false on a server — ask after mount
await shareNatively(content); // 'shared' | 'cancelled' | 'unavailable' | 'failed'
```

Channels: `whatsapp`, `x`, `facebook`, `telegram`, `email`, `bluesky`, `linkedin`, `hackernews`. An
app passes its own subset, in its own order.

### The url is absolute

A relative url is not a link outside the page, and nothing here can know which origin was meant.
Resolve it first — `new URL(path, SITE_URL).href` — and prefer the canonical origin to
`window.location`.

### What is not here

No component, no icons, no translated labels, and no rule for when the native sheet replaces the
channel list: each is a product decision, and the apps that led to this package disagree on all of
them. The [package page](./docs/index.md) has the per-channel table and a React example.

## Decisions

- [ADR-0008 — Cross-app, framework-agnostic layers](../../../apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md)

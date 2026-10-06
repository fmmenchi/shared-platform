---
title: '@fmmenchi/share'
sidebar_label: share
sidebar_position: 0
---

# @fmmenchi/share

Share a page: the **intent link** of each channel, a **clipboard write** that reports whether it
happened, and the **native share sheet** with its dismissal told apart from a failure.
Framework-agnostic, browser-side, **no dependencies**.

Built under [ADR-0008](../../adr/0008-cross-app-framework-agnostic-layers.md)'s bar: four functions
and a list, and no component.

## The problem

Two apps wrote this code on their own, and it came out different in the places that matter:

|                                          |                                                                                                                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A copy that did not happen**           | One showed its tick — and had a screen reader announce "link copied" — whether or not the clipboard took the write. It refuses on an insecure origin and on a denied permission.                      |
| **A channel's url going stale**          | The one channel both apps offered, they linked to at two different addresses. These urls belong to the channels and none is a versioned API; kept in two places, one of them is always the older one. |
| **A dismissal that looks like an error** | Closing the native sheet rejects the promise. Both apps answered with an empty `catch` — which also swallowed the refusals that are real: no user gesture, content the sheet will not take.           |
| **A link cut in half**                   | A url with its own `?id=7&lang=it` ends at the first `&` unless it is encoded, and a space written as `+` reaches a mail client as a plus sign.                                                       |

## Use

```ts
import { shareHref, copyText, shareNatively } from '@fmmenchi/share';

const content = {
  url: 'https://example.com/blog/a-post',
  title: 'A post',
};

shareHref('linkedin', content);
// 'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fblog%2Fa-post'

if (await copyText(content.url)) showTheTick(); // true ONLY for a write that went through

const outcome = await shareNatively(content); // 'shared' | 'cancelled' | 'unavailable' | 'failed'
```

`ShareContent` has the shape of the platform's own `ShareData` (`url`, `title`, `text`), so one
object serves a channel's link and the sheet alike.

## What each channel receives

The words that travel with the link are `text`, or `title` where no text was given. A field with
nothing in it is left out rather than sent empty.

| Channel      | Link                                               | Notes                                                 |
| ------------ | -------------------------------------------------- | ----------------------------------------------------- |
| `whatsapp`   | `wa.me/?text=<words> <url>`                        | One field; the link goes inside it, last.             |
| `x`          | `x.com/intent/post?url=<url>&text=<words>`         |                                                       |
| `facebook`   | `facebook.com/sharer/sharer.php?u=<url>`           | The url only: the preview is the page's own metadata. |
| `telegram`   | `t.me/share/url?url=<url>&text=<words>`            |                                                       |
| `email`      | `mailto:?subject=<title>&body=<text> <url>`        | No fallback: a subject is a title or nothing.         |
| `bluesky`    | `bsky.app/intent/compose?text=<words> <url>`       | One field.                                            |
| `linkedin`   | `linkedin.com/sharing/share-offsite/?url=<url>`    | The url only.                                         |
| `hackernews` | `news.ycombinator.com/submitlink?u=<url>&t=<name>` | A submission: `title` first, `text` for want of one.  |

`SHARE_CHANNELS` is that list as a tuple, `ShareChannel` its union, and `SHARE_CHANNEL_NAMES` the
proper noun of each — never translated, so an app's `"Share on {name}"` has something to interpolate.

## The url is absolute

A relative url stops being a link the moment it leaves the page, and this package cannot know which
origin was meant — so it does not guess, and it does not validate either: it would have to throw
from inside a render. Resolve it where the origin is known, and prefer the **canonical** one to
wherever the page happens to be served from:

```ts
const url = new URL(post.path, SITE_URL).href; // not window.location — nobody wants a localhost link
```

## The native sheet

```ts
import { canShareNatively, shareNatively } from '@fmmenchi/share';
```

`canShareNatively()` is `false` on a server, so it cannot be answered during a render without the
server's markup disagreeing with the browser's. Ask after mount.

`shareNatively()` never rejects. Call it from a click: without a user gesture the browser refuses,
and that is a `failed`.

**When** to offer the sheet is the app's policy, and both answers are in use: one app shows it
_instead of_ its channel list on a touch device, another shows it _beside_ the list wherever it
exists. Neither is the right one for everybody, so neither is in here.

## In React

The package has no React in it. The two pieces of state a component needs stay in the app, and are
a few lines each:

```tsx
import { canShareNatively, copyText, shareHref } from '@fmmenchi/share';

function ShareBar({ url, title }: { url: string; title: string }) {
  const [native, setNative] = useState(false);
  const [copied, setCopied] = useState(false);

  /* After mount, never during render: the server has no share sheet. */
  useEffect(() => setNative(canShareNatively()), []);

  /* The tick is a confirmation, not a state: it goes away on its own. */
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <>
      <a href={shareHref('bluesky', { url, title })}>Share on Bluesky</a>
      <button
        type="button"
        onClick={async () => setCopied(await copyText(url))}
      >
        Copy link
      </button>
      {/* Otherwise the copy is silent to anyone not watching the icon. */}
      <span role="status">{copied ? 'Link copied' : ''}</span>
    </>
  );
}
```

## Reference

| Export                | Purpose                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| `shareHref`           | The compose link of one channel, for an `href`. Works without JavaScript.      |
| `SHARE_CHANNELS`      | Every channel a link can be built for; an app passes its own subset and order. |
| `SHARE_CHANNEL_NAMES` | The proper noun of each channel.                                               |
| `copyText`            | Write to the clipboard; resolves `true` only for a write that happened.        |
| `canShareNatively`    | Whether there is a share sheet — and, given content, whether it would take it. |
| `shareNatively`       | Open the sheet; resolves to how it ended, and never rejects.                   |
| `ShareContent`        | `{ url, title?, text? }`.                                                      |
| `NativeShareOutcome`  | `'shared' \| 'cancelled' \| 'unavailable' \| 'failed'`.                        |

## Boundaries

- **No component.** Which channels, in what order, with which icons and behind what kind of control
  is a product decision, and the two apps that led to this package disagree on every one of them.
  The component is the app's; it composes this with its own buttons and links.
- **No icons.** A channel's logo is somebody else's trademark and the app's asset.
- **Not the preview.** How a shared link _looks_ is decided by the page's Open Graph metadata, which
  is content, rendered by the app's own server.
- **Not tracking.** Campaign parameters on the url are the app's to add before it passes it in.
- **No files.** `ShareContent` leaves `files` out; it joins when a consumer shares one.

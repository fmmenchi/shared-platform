# Brief — web-platform review of `@fmmenchi/share`, revision 1

Revision reviewed: commit `4d5806d` on branch `feat/share-package`.

You are reviewing as someone who knows the web platform and the share endpoints of the channels
below, and who checks against primary sources rather than memory. You have web access: use it.
Prefer the channel's own documentation, the specifications (W3C Web Share, Clipboard API, RFC 6068)
and MDN; say which source settled each point, with its url.

Read this, read-only — in `/Users/fabiomenchicchi/Develop/fmmenchi/shared-platform`:

- `packages/client/share/src/lib/share-href.ts`
- `packages/client/share/src/lib/channels.ts`
- `packages/client/share/src/lib/clipboard.ts`
- `packages/client/share/src/lib/native.ts`
- `packages/client/share/src/lib/share.types.ts`
- `packages/client/share/docs/index.md`
- `packages/client/share/README.md`
- `packages/client/share/AGENTS.md`

It must be consistent with (inconsistencies are findings): the current behaviour of each channel's
share endpoint, the Web Share API and Clipboard API as specified and as shipped in current
Chrome, Safari and Firefox, and RFC 6068 for `mailto:`.

Attack surface — go after all of these, and anything else found:

- Each of the eight urls in `share-href.ts` — host, path and parameter names. Is each the endpoint
  the channel documents or serves TODAY, and does it take the parameters given? In particular:
  `https://x.com/intent/post` (vs `twitter.com/intent/tweet`), `https://wa.me/?text=`,
  `https://www.facebook.com/sharer/sharer.php?u=`, `https://t.me/share/url?url=&text=`,
  `https://bsky.app/intent/compose?text=`,
  `https://www.linkedin.com/sharing/share-offsite/?url=`,
  `https://news.ycombinator.com/submitlink?u=&t=`.
- `mailto:?subject=…&body=<text> <url>`: is that well-formed under RFC 6068? The code comment
  claims `URLSearchParams` would write a space as `+` and that a mail client shows it as a literal
  plus — true? Should text and url be separated by a line break rather than a space, and how is a
  line break encoded in a `mailto:` body?
- One-field channels (WhatsApp, Bluesky) get `<words> <url>` in a single `text`. Does each channel
  still turn the trailing url into a link/preview that way?
- `shareNatively` maps `AbortError` to `cancelled` and every other rejection to `failed`. Which
  errors does `navigator.share()` reject with per the specification, and does any browser reject
  with something other than `AbortError` when the user dismisses the sheet? Does any browser
  resolve, rather than reject, on dismissal?
- `canShareNatively` treats a missing `navigator.canShare` as "yes". Which browsers have `share`
  without `canShare`? Is `canShare()` ever a false negative for plain `{ url, title, text }`?
- The docs say `navigator.share` needs a user gesture and that without one the result is `failed`.
  Correct for all three engines?
- `copyText` resolves `false` when `navigator.clipboard.writeText` rejects. In which real
  situations does it reject (insecure context, permission, document not focused, Safari and a
  write that is not synchronous with the gesture)? Is there a situation where it RESOLVES and
  nothing was written?
- The docs state that a channel's preview is "the page's own metadata" for Facebook and LinkedIn,
  and that Instagram/TikTok/Mastodon are not offered. Anything in the docs that is no longer true?
- A channel that a package like this would be expected to have and does not, only if its share url
  is stable and documented — name it with its source, do not pad.

Format: findings ranked most severe first. Each finding opens with a line of exactly this shape,
bold, numbered from 1: `**N. one-sentence defect**`. Then, for each: (1) the exact passage it
anchors to, quoted, with its file path; (2) a concrete failure scenario — inputs/state → wrong
outcome; (3) verdict CONFIRMED (a primary source settles it — cite the url) or PLAUSIBLE (needs a
fact you could not fetch — name it); (4) the smallest change that would fix it. At most 12
findings; zero is a valid answer and is stated as such. No preamble, no praise, no restating the
artefact. Your final message is the review itself, verbatim, and nothing else.

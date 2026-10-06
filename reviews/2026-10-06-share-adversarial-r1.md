**1. `shareHref` throws `URIError` on a title or text holding a lone surrogate, although the package promises it never throws inside a render.**

1. Anchor — `packages/client/share/AGENTS.md`: "**The url is the caller's, absolute, and not validated.** No fallback to `window.location` and no throw: `shareHref` runs inside a render, on a server too." Code — `packages/client/share/src/lib/share-href.ts`: ``.map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)``.
2. Scenario — an app truncates a title for a card: `'Cusco in 3 days 🏔️'.slice(0, 17)` gives `"Cusco in 3 days \ud83c"`. Run against `dist`: `shareHref('x', { url, title })` → `THREW URIError URI malformed`; `email` the same. `facebook` and `linkedin` return normally, so the crash depends on which channels the page lists. During SSR this takes the whole render down.
3. Verdict — CONFIRMED (ran against the built `dist/index.js`).
4. Fix — pass each value through `String.prototype.toWellFormed()` before `encodeURIComponent` in `query()` (ES2024, so check it against the platform target), and add a spec with a cut emoji.

**2. With `url: ''` every builder returns a well-formed link to the channel's compose screen that shares nothing, and three of them carry a trailing space.**

1. Anchor — `packages/client/share/src/lib/share-href.ts`: `.filter(([, value]) => value)` and ``words ? `${words} ${url}` : url``.
2. Scenario — `shareHref(ch, { url: '', title: 'A post', text: 'Words' })`, run against `dist`:
   - `whatsapp` → `https://wa.me/?text=Words%20`
   - `bluesky` → `https://bsky.app/intent/compose?text=Words%20`
   - `email` → `mailto:?subject=A%20post&body=Words%20`
   - `x` → `https://x.com/intent/post?text=Words`
   - `telegram` → `https://t.me/share/url?text=Words`
   - `facebook` → `https://www.facebook.com/sharer/sharer.php?`
   - `linkedin` → `https://www.linkedin.com/sharing/share-offsite/?`
   - `hackernews` → `https://news.ycombinator.com/submitlink?t=A%20post`

   With `{ url: '' }` alone all eight end in a bare `?` (`mailto:?`, `https://wa.me/?`). A CMS record with an empty canonical url ships a row of working-looking buttons that post words with no link. The docs say the url is "not validated", but nowhere say an empty one yields a link without it.

3. Verdict — CONFIRMED (ran).
4. Fix — make `withUrl` drop the separator when either side is empty (`[words, url].filter(Boolean).join(' ')`), and state the empty-url result in `docs/index.md` under "The url is absolute". If a link with no url is unacceptable, the alternative is a documented `''` return the app can test.

**3. `text: ''` suppresses the `title` fallback, so the words vanish even though a title was given.**

1. Anchor — `packages/client/share/docs/index.md`: "The words that travel with the link are `text`, or `title` where no text was given." Code — `share-href.ts`: `text ?? title` in `whatsapp`, `x`, `telegram`, `bluesky`, and `title ?? text` in `hackernews`.
2. Scenario — `shareHref('x', { url: 'https://e.com/a', title: 'A post', text: '' })` → `https://x.com/intent/post?url=https%3A%2F%2Fe.com%2Fa`. The title is lost, because `??` treats `''` as given and `query()` then drops it as falsy. Same for `whatsapp`, `telegram` and `bluesky`. An optional "excerpt" field that a form or CMS serialises as `''` is the ordinary source. Symmetrically, `hackernews` with `title: ''` and a `text` gets no `t`.
3. Verdict — CONFIRMED (ran).
4. Fix — use `||` where the code now uses `??` for these fallbacks, so "given" means the same thing in the fallback as in `query()`. Add the `text: ''` case to the fallback spec.

**4. The dismissal test `error instanceof Error && error.name === 'AbortError'` misreports in both directions.**

1. Anchor — `packages/client/share/src/lib/native.ts`: `return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'failed';`. Promise — `packages/client/share/src/lib/share.types.ts`: "`cancelled` is the reader closing it, which is not an error and must not be reported as one."
2. Scenario —
   - Dismissal reported as `failed`: a rejection from another realm fails `instanceof Error`. Ran it with `vm.runInNewContext("Object.assign(new Error('x'),{name:'AbortError'})")` → `'failed'`; a plain `{ name: 'AbortError' }` → `'failed'`. In practice that is a `navigator` from an iframe, or a consumer's jsdom test realm.
   - Failure reported as `cancelled`: any `AbortError` is taken as the reader's choice. `Object.assign(new Error('boom'), { name: 'AbortError' })` → `'cancelled'`. If the platform also rejects with `AbortError` when no share target exists, the app stays silent on a real failure.
3. Verdict — first direction CONFIRMED (ran). Second direction PLAUSIBLE: it needs the fact of whether shipping browsers reject `navigator.share` with `AbortError` for anything but a user dismissal (my recollection is that the Web Share spec does so for "no share targets", not checked against a browser).
4. Fix — replace the `instanceof` with a structural read: `(error as { name?: unknown } | null)?.name === 'AbortError'`. Document in `share.types.ts` that `cancelled` means "the platform reported an abort".

**5. The specs leave promised behaviour unpinned: six mutants of the source survive the full suite and typecheck.**

1. Anchor — `packages/client/share/src/lib/share-href.spec.ts` and `native.spec.ts`, against `packages/client/share/docs/index.md`: "`email` … No fallback: a subject is a title or nothing." and "The words that travel with the link are `text`, or `title` where no text was given."
2. Scenario — each mutation applied to my copy, then `pnpm nx run-many -t test,typecheck -p @fmmenchi/share --skip-nx-cache`; all SURVIVED:
   - `email` body `withUrl(text, url)` → `withUrl(text ?? title, url)` (the documented "no fallback" is untested).
   - `telegram` `text ?? title` → `text`, and `bluesky` likewise (the fallback spec covers only `x` and `whatsapp`).
   - `query` `.filter(([, value]) => value)` → `value !== undefined` (no spec has an empty string).
   - `shareNatively` `canShareNatively()` → `canShareNatively(content)`, which changes the outcome for refused content from `failed` to `unavailable` (no spec stubs `canShare` under `shareNatively`).
   - `hackernews: 'Hacker News'` → `'Hackernews'` (`names every channel` asserts `toBeTruthy()`, which the `Record` type already guarantees, so that test cannot fail on anything the typecheck passes).

   Controls were KILLED: url moved first in `withUrl`, fragment truncated before building (the "whole" test does catch it, `mailto:` included), `copyText` without `await`, `catch` returning `true`, any non-`TypeError` as `cancelled`. All three tuple/`Record` mismatches (channel only in the tuple, a name without a channel, a builder without a channel) fail `typecheck`, as `AGENTS.md` claims.

   Separately, the title "is false on a server, where there is no navigator" (`native.spec.ts`, `clipboard.spec.ts`) describes a state Node 24 does not have: unstubbed, `typeof navigator === 'object'` and `typeof navigator.share === 'undefined'`. The real server path is never run unstubbed.

3. Verdict — CONFIRMED (ran).
4. Fix — add: an `email` case with a title and no text asserting `body=<url>`; the fallback loop over all four `text ?? title` channels; `toEqual` on the full `SHARE_CHANNEL_NAMES` map; a `shareNatively` case with `canShare: () => false` asserting `failed` and that `share` was called; one unstubbed `canShareNatively()` and `copyText()` case.

**6. `shareNatively` forwards the caller's object untouched, so `files` and anything else on it reach `navigator.share`, and an empty url means something different to the sheet than to the links.**

1. Anchor — `packages/client/share/src/lib/native.ts`: `await navigator.share(content);`. Promise — `packages/client/share/docs/index.md`: "**No files.** `ShareContent` leaves `files` out; it joins when a consumer shares one." and "so one object serves a channel's link and the sheet alike."
2. Scenario —
   - A consumer holding a `ShareData` (structurally assignable, so no type error) calls `shareNatively(data)`. Ran with a stub: the platform received `{ url: '', title: undefined, text: undefined, files: [ 1 ], secret: 'x' }`. Files are shared through a package that documents it does not share files, and `canShareNatively()` never asked about them.
   - `{ url: '' }`: `shareHref` omits the url (finding 2), while the sheet resolves `''` against the document base and shares the current page — the `window.location` fallback `AGENTS.md` says does not exist. A relative url likewise works in the sheet and is broken in every link.
3. Verdict — pass-through CONFIRMED (ran). The empty/relative url resolution is PLAUSIBLE: it needs the fact that browsers parse `ShareData.url` against the document base URL (the Web Share spec says so; not run in a browser here).
4. Fix — build the argument explicitly: `navigator.share({ url, ...(title && { title }), ...(text && { text }) })`, and return `'failed'` without calling the platform when `url` is empty.

**7. The React example in the docs does not typecheck and does not behave as its comments say.**

1. Anchor — `packages/client/share/docs/index.md`, "In React": `import { canShareNatively, copyText, shareHref } from '@fmmenchi/share';` followed by `const [native, setNative] = useState(false);` and `{/* Otherwise the copy is silent to anyone not watching the icon. */}`.
2. Scenario — compiled verbatim with `tsc` (strict, `noUnusedLocals`, `react-jsx`):
   - `TS2304: Cannot find name 'useState'` (twice) and `'useEffect'` (twice) — there is no React import.
   - With the import added: `TS6133: 'native' is declared but its value is never read`. The example detects the sheet and never uses it, so it demonstrates the "ask after mount" pattern with no consumer.

   Behaviour: a second click within 2.5 s sets `copied` to `true` again — no state change, no timer reset, no change in the `role="status"` text — so the second copy is silent to a screen reader, which is what the comment says the span prevents. A refused write sets `false`, so the failure the package was extracted to surface is shown to nobody.

3. Verdict — typecheck failures CONFIRMED (ran). The repeat-click and failure behaviour is CONFIRMED by the text (not rendered).
4. Fix — add `import { useEffect, useState } from 'react';`, render something from `native` (a `shareNatively` button), and hold a tri-state `'idle' | 'copied' | 'refused'` so the status region has words for a refusal.

**8. A whitespace-only `title` or `text` is sent as an empty-looking field, against "left out rather than sent empty".**

1. Anchor — `packages/client/share/docs/index.md`: "A field with nothing in it is left out rather than sent empty." Spec title in `share-href.spec.ts`: "No stray space in front of the link when there are no words before it."
2. Scenario — `{ url: 'https://e.com/a', title: '   ' }`, run against `dist`:
   - `x` → `…&text=%20%20%20`
   - `email` → `mailto:?subject=%20%20%20&body=…`
   - `hackernews` → `…&t=%20%20%20`
   - `whatsapp` → `https://wa.me/?text=%20%20%20%20https%3A%2F%2Fe.com%2Fa` (four stray spaces in front of the link)

   With `text: ' '` and `title: 'T'` the space also wins over the title: `x` → `&text=%20`.

3. Verdict — CONFIRMED (ran). Whether whitespace counts as "nothing" is the docs' call, but the stray-space guarantee is broken either way.
4. Fix — trim once at the top of `shareHref` (`title?.trim()`, `text?.trim()`) before the builders; this also makes finding 3's `||` see whitespace as empty.

**9. The package states "no dependencies" three times and declares one, which the emitted code never imports.**

1. Anchor — `packages/client/share/package.json`: `"description": "… Framework-agnostic, browser-side, no dependencies."` beside `"dependencies": { "tslib": "^2.3.0" }`. Also `README.md` and `docs/index.md`: "Framework-agnostic, browser-side, **no dependencies**."
2. Scenario — `grep` for `tslib` or `__` helpers across `dist/**/*.js` returns nothing (target `es2022`, native `async`), yet every consumer installing from the registry resolves and installs `tslib`. Removing the entry is not free today: with it deleted, `pnpm nx lint @fmmenchi/share` fails with `@nx/dependency-checks: … following dependencies were detected: "tslib"` (driven by `importHelpers: true` in `tsconfig.base.json`). `@fmmenchi/formatting` carries the same contradiction.
3. Verdict — CONFIRMED (ran build, grep and lint).
4. Fix — either say "no runtime dependencies beyond `tslib`" in the three places, or add `ignoredDependencies: ['tslib']` to the package's `@nx/dependency-checks` options and drop the entry.

**10. The per-channel table prints two hosts the code does not use.**

1. Anchor — `packages/client/share/docs/index.md`: "| `facebook` | `facebook.com/sharer/sharer.php?u=<url>` |" and "| `linkedin` | `linkedin.com/sharing/share-offsite/?url=<url>` |".
2. Scenario — the code returns `https://www.facebook.com/sharer/sharer.php?u=…` and `https://www.linkedin.com/sharing/share-offsite/?url=…`. The other six rows match their hosts exactly (scheme omitted throughout). Someone checking a stale-url report against the table — the one signal `AGENTS.md` names — compares against an address the package never emitted.
3. Verdict — CONFIRMED (ran and compared). The two literal examples (`README.md` `x`, `docs/index.md` `linkedin`) match the output character for character.
4. Fix — write `www.facebook.com/…` and `www.linkedin.com/…` in those two rows.

Traced with no finding:

- `copyText`: no real path found that resolves `true` without a write, or `false` after one. On Node 24 it resolves `false`.
- `canShareNatively()` on Node 24 returns `false`.
- `shareNatively` when `canShare(content)` is false still calls `navigator.share` and resolves `failed`, which is what `docs/index.md` promises for "content the sheet will not take" — though untested (finding 5).
- `types: ["node"]` is the workspace norm for client packages.
- `dist/*.d.ts` references no DOM type.

The worktree is back at `4d5806d` with no changes left in it.

# AGENTS.md — @fmmenchi/share

Share a page: the intent link of each channel, a clipboard write that reports whether it happened,
and the native share sheet with its dismissal told apart from a failure. Part of `shared-platform`;
workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `client`, type `util`. Built
under the cross-app + framework-agnostic bar of
[ADR-0008](../../../apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md).

## Commands

```bash
pnpm nx typecheck @fmmenchi/share
pnpm nx build @fmmenchi/share
pnpm nx lint @fmmenchi/share
pnpm nx test @fmmenchi/share
```

## Shape

- Public surface (`src/index.ts`): `shareHref`, `SHARE_CHANNELS`, `SHARE_CHANNEL_NAMES`, `copyText`,
  `canShareNatively`, `shareNatively`, and the types `ShareChannel`, `ShareContent`,
  `NativeShareOutcome`.
- `src/lib/`: `channels.ts` (the tuple, its union, the names), `share-href.ts` (one builder per
  channel), `clipboard.ts`, `native.ts`, `share.types.ts`, and `given.ts` — internal, not exported.
  `index.ts` re-exports only.
- Tests run in Node with `navigator` stubbed — there is no DOM to render, so no browser mode.

## Rules

- **Framework-agnostic.** No React, no hook, no component. The two pieces of state a share
  control needs (the sheet detected after mount, the tick's timer) are the app's, and stay there
  even though both apps write them alike: a hook would make this a React package.
- **No component, here or in `@fmmenchi/ui`.** Which channels, their order, their icons and the
  control they sit behind are product decisions. A `ShareButton` in the design system would wire no
  semantics a `Button` and a link do not already carry.
- **Policy stays out.** `canShareNatively()` says whether a sheet exists, never whether to prefer
  it; a `(pointer: coarse)` test belongs to the app that wants one.
- **Nothing rejects, and nothing lies.** `copyText` resolves `false` for a write that did not
  happen; `shareNatively` resolves `cancelled` for a dismissal and `failed` for everything else.
  Collapsing those — an optimistic `true`, an empty `catch` — is the defect this package was
  extracted to remove, and the one change that must not pass review.
- **One definition of "given".** Absent, empty and blank are the same thing, decided once in
  `given.ts` and used by the links and the sheet alike. A `??` on a raw `title`/`text` anywhere else
  brings back the bug where a form's `''` suppressed the fallback.
- **`encodeURIComponent`, never `URLSearchParams`.** The latter writes a space as `+`, which a mail
  client shows as a literal plus in a `mailto:` body.
- **The url is the caller's, absolute, and not validated.** No fallback to `window.location` — which
  is why an empty url is left OUT of what the sheet is handed: the platform reads `''` as "this page".
- **`shareHref` never throws**; it runs inside a render, on a server too. That includes a string cut
  through a surrogate pair, hence `toWellFormed()` before the encoding (and `es2024.string` in the
  package's `lib`).
- **An outcome claims only what the platform reports.** `shared` is "the sheet took it" — Windows
  resolves when the sheet opens — and `cancelled` covers "no target to offer", because the
  specification gives both the same `AbortError`. Do not tighten either wording.
- **A new channel is a row in three places** — `SHARE_CHANNELS`, `SHARE_CHANNEL_NAMES`, the builder
  — plus its line in the spec and in `docs/index.md`. Both maps are `Record<ShareChannel, …>`, so a
  channel added to the tuple and to nothing else fails the typecheck.
- **The intent urls are not ours.** No channel versions them and no test here can tell when one
  stops working; a report from an app is the only signal. When one changes, change it here and
  release — that is what the package is for. Each builder names the page its address came from, and
  takes the DOCUMENTED address over one that merely works (`x.com/intent/tweet`, not `/intent/post`).
  Facebook and LinkedIn document none: check those two first.
- **`tslib` is declared and never imported.** The workspace compiles with `importHelpers`, so
  `@nx/dependency-checks` requires the entry; the emitted code uses no helper. It is why the docs do
  not say "no dependencies".
- **Promote to `shared` only on a real server dependency** (a backend building these links, e.g.
  into an email). `shareHref` is pure and would move alone; the other two are browser-only.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

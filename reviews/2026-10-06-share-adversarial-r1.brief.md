# Brief — adversarial review of `@fmmenchi/share`, revision 1

Revision reviewed: commit `4d5806d` on branch `feat/share-package`.

Do not edit anything under `packages/client/share/` in the main tree. In your own working copy you
may run, probe and mutate anything (`pnpm install` first if `node_modules` is missing; tasks run
through Nx: `pnpm nx test @fmmenchi/share`, `pnpm nx typecheck @fmmenchi/share`,
`pnpm nx build @fmmenchi/share`, `pnpm nx lint @fmmenchi/share`).

The artefact is the whole package:

- `packages/client/share/src/index.ts`
- `packages/client/share/src/lib/channels.ts`
- `packages/client/share/src/lib/share-href.ts`
- `packages/client/share/src/lib/clipboard.ts`
- `packages/client/share/src/lib/native.ts`
- `packages/client/share/src/lib/share.types.ts`
- `packages/client/share/src/lib/*.spec.ts`
- `packages/client/share/package.json`, `tsconfig*.json`, `vitest.config.mts`, `eslint.config.mjs`
- `packages/client/share/README.md`, `AGENTS.md`, `docs/index.md`

It must be consistent with (inconsistencies are findings):

- `AGENTS.md` (workspace contract: barrels, where types live, definition of done)
- `.agents/doc/architecture.md` (scopes, tags, what earns a package)
- `apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md`
- `packages/shared/formatting/` (the sibling package its manifest and docs were modelled on)
- itself: every statement in README.md, AGENTS.md and docs/index.md against the code

Attack surface — go after all of these, and anything else found:

- `query()` in `share-href.ts` drops every falsy value. What does each of the eight builders return
  for `url: ''`, for `text: ''`, for a `title` of whitespace? Is any of those a link that looks
  valid and shares nothing?
- `withUrl()` joins words and url with a space. Is there an input for which the result has a
  leading or trailing space, or loses the url?
- The claim "carries the url to every channel, whole" is tested by joining
  `new URL(href).searchParams.values()`. Does that test actually prove it for `mailto:` and for the
  one-field channels, or can a builder be broken with the test still green? Mutate and see.
- Every literal url in README.md and docs/index.md (examples, the per-channel table) — is it
  exactly what the code returns? Run the code and compare character by character.
- `copyText` catches everything. Is there a path where it resolves `true` and nothing was written,
  or resolves `false` after the write happened?
- `shareNatively` calls `canShareNatively()` WITHOUT the content, then `navigator.share(content)`.
  Trace what happens when `canShare(content)` would be false. Is the outcome the one the docs
  promise?
- `error instanceof Error && error.name === 'AbortError'` — find a rejection value for which a
  dismissal is reported as `failed`, or a failure as `cancelled`.
- `ShareContent` is passed to `navigator.share` as is. Extra properties, `undefined` members, an
  empty `url`: does anything reach the platform that should not?
- `canShareNatively` is documented as safe on a server. Is it, on Node 24, where `navigator`
  exists as a global?
- The React example in `docs/index.md`: would it typecheck and behave as its comments say?
- AGENTS.md says a channel added to the tuple and to nothing else fails the typecheck. Does it?
  And the reverse — a name or a builder for a channel not in the tuple?
- `package.json`: `exports`, `files`, `types: ["node"]` and `lib: ["dom"]` in a browser package,
  the `tslib` dependency (is it used by the emitted code?), anything a consumer installing from the
  registry would trip on. Build it and read `dist/`.
- The specs stub `navigator` with plain objects. Is any test unable to fail? Is any behaviour the
  docs promise left without a test?

Format: findings ranked most severe first. Each finding opens with a line of exactly this shape,
bold, numbered from 1: `**N. one-sentence defect**`. Then, for each: (1) the exact passage it
anchors to, quoted, with its file path; (2) a concrete failure scenario — inputs/state → wrong
outcome; (3) verdict CONFIRMED (follows from the text, or you ran it) or PLAUSIBLE (needs a fact
the text does not settle — name the fact); (4) the smallest change that would fix it. At most 12
findings; zero is a valid answer and is stated as such. No preamble, no praise, no restating the
artefact. Your final message is the review itself, verbatim, and nothing else.

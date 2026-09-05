# AGENTS.md — @fmmenchi/theme

What a theme IS, and whether one is allowed. Part of `shared-platform`; workspace contract in
[../../../AGENTS.md](../../../AGENTS.md). Scope `shared`, type `util`. **Private — not published.**

## Commands

```bash
pnpm nx typecheck @fmmenchi/theme
pnpm nx build @fmmenchi/theme
pnpm nx lint @fmmenchi/theme
pnpm nx test @fmmenchi/theme
```

## Why this package exists

**A boundary, and it is the whole justification.** `@fmmenchi/tokens` is `scope:client` and
`@fmmenchi/nx-theme-generator` is `scope:plugins`, and the workspace forbids a plugin from depending
on a client library. Yet both need the same three things: the enumeration of every role, the rules a
theme must satisfy, and the maths to measure a colour.

Before this package, the generator reached them through `createRequire` and dynamic `import()`
against whatever version the consumer had installed — with two `tokensPath` escape hatches, a
"could not resolve" branch, and a comment-stripping regex inlined **by hand in two files**, each
carrying a comment apologising for it.

`scope:shared` is the one scope a client library, a plugin AND an app may all depend on. So the
contract lives here and everything reaches it by a plain import.

## Where this package stops

It answers three questions:

```
what a theme IS        the as-const arrays, and every type derived from them
is this one allowed    parseTheme -> toTheme -> validateTheme
how is one BUILT       generateTheme(declared, bases, ramp) — aliases and greys read from CSS
what its DARK half is  deriveDarkBases(bases) — the seven a brand does not hand over
```

Plus the colour maths those answers need — `resolveCssVar` (which evaluates the relative-colour
ramp), the sRGB gamut fit, WCAG and APCA.

**FOUR VERBS, AND EACH MEANS ONE THING.** They had started to overlap, which is how an emitter ended
up named like a builder:

```
parse*      CSS text          -> declarations      parseTheme, parseCssVars
to*         declarations      -> a typed structure  toTheme, toPalette, readAliases
generate*   data              -> data               generatePalette, generateTheme
emit*       data              -> the TEXT OF A FILE emitProperties, emitTheme
```

**TWO EMITTERS.** `emitProperties` renders `properties.css` from the contract's NAMES;
`emitTheme` renders a `[data-theme]` block from a contract's VALUES, which arrive as data — no
number a designer chose lives here either way. `emitTheme` was a template literal inside
`@fmmenchi/nx-theme-generator`, three lines above a `tree.write`, so the only renderer of a theme
sat behind Nx's `Tree` API: nothing else could produce one and nothing could test the TEXT except by
running a generator against a virtual filesystem. Extracting it is the same move `emitProperties`
made out of tokens, for the same reason. Its header degrades — a generator knows who it is, which
tokens version it read and what command checks the result; a download from a web page knows none of
those and must not claim them.

**THE EMITTERS LIVE HERE AND THE FILES THEY WRITE DO NOT.** `@fmmenchi/tokens` is an ARTEFACT
package: it ships values and stylesheets, and the code that renders one of those stylesheets is
knowledge about the contract, which is this package's subject. The test that pins a rendered file to
`vars.css` stays over there, because it must read that stylesheet and `scope:shared` may not depend
on `scope:client`. It also buys the thing the split was for: `@fmmenchi/nx-theme-generator` is
`scope:plugins` and may not import a client library either, so while `emitProperties` lived in tokens
a consumer could not render their own `properties.css`.

**THE VALUES ARE NOT HERE.** `@fmmenchi/tokens` owns `styles/*.css`: those numbers are the design
work, and this package has no opinion about them. It says what a theme must satisfy; that one says
what ours is.

**AND THAT INCLUDES A RAMP.** A `RAMP` const was added here and removed the same hour, and the two
reasons it failed are the tests to apply to the next candidate:

- **it was eighteen numbers a designer chose** — the same kind of thing as `vars.css`, and this
  package has no file of values at all. `tokens.types.ts` holds NAMES; `emitProperties` renders 481
  lines with not one value in them. The moment something here needs a number somebody picked, it is
  in the wrong package.
- **and its only caller was an app.** The move was justified by "the generator needs it too", which
  is false: the generator takes a theme file with `--from` and injects declarations — it does not
  build palettes. So the const had no caller in this package's audience, which is the failure named
  below: _a model with no caller is a guess, and a guess belongs in the place that will call it._

It lives in `apps/theme-builder/app/ramp.tsx`, with the measured divergence between its absolute
lightnesses (ADR-0033) and the offsets `vars.css` writes — they agree only for a family based at
0.55, and `warning` is out by ΔL 0.05. That resolves when `vars.css` is emitted from a ramp rather
than writing its own offsets, and the ramp then belongs wherever that emitter's inputs live.

**THE WIZARD'S MODEL IS NOT HERE EITHER** — the form, its state, the record of which rung a person
pinned. That was got wrong four times in one day by four different routes (a `ThemeSpec`, a package
of its own, a `pins` parameter, an interchange format), and the tell was the same every time:
nothing in the package consumed it. **A model with no caller is a guess, and a guess belongs in the
place that will call it.**

## Rules

- **PRIVATE AND BUNDLED, which is a constraint on consumers, not a detail.** Nothing publishes this
  package, so anything that DOES publish must bundle it — otherwise its `dist` emits
  `require('@fmmenchi/theme')` and resolves to nothing in an installed package. `exports` carries an
  `@fmmenchi/source` condition so a bundler takes the TypeScript directly.
  - The workspace enforces half of this already: `enforceBuildableLibDependency` refuses a buildable
    library that imports a non-buildable one, which is why this package has a build target at all.
    That rule is a proxy, not the whole truth — it is satisfied by a `dist` existing, while a
    consumer's install needs the code INLINED. Both are required.
- **`tokens` re-exports this package's names, and that is deliberate.** `tokenVars`, `COLOR_ROLES`
  and the types are public API for consumers; a private package cannot be their import path. The
  barrel in `@fmmenchi/tokens` is the only channel, so a name added here that consumers should see
  must be added there too.
- **The arrays are the source of truth, for now.** `ColorRole` and every other type derive from the
  `as const` arrays in `tokens.types.ts`, and `@fmmenchi/tokens`' own suites check the shipped CSS
  against them. That inverts the day the CSS becomes a generated artefact — then the arrays are
  derived from it and those suites become unnecessary. Not yet: it lands with the Tailwind and
  styled-components bindings.
- **A type stays WITH the code it is derived from.** `tokens.types.ts` holds the arrays AND the types
  read off them, because the two cannot be edited apart. `theme.types.ts` is the exception the
  rule allows: those types stand alone (`ThemeViolation`, `ContrastAdvisory`) and the file name says
  what it defines.
- **Every `index.ts` is a barrel — re-exports only.**
- **A FUNCTION HERE TAKES WHAT IT NEEDS, NOT WHAT IT NEEDS ASSEMBLED.** `generateTheme` first took
  `(palette, aliases)` and was misused on its first day: assembling a palette means merging the greys
  the stylesheet STATES with the brand's generated ramps, in that order, and the wizard omitted the
  first half — so with 34 of the 84 roles pointing at `neutral` it threw for every possible set of
  bases, the shipped ones included. It takes `(declared, bases, ramp)` now and does the assembly
  itself. **A signature that can be assembled wrongly will be**, and the cost lands on a consumer
  rather than here.
  - The corollary is that a concept only a consumer's assembly needed stops being public.
    `toPlacements`, `Placement` and `Placements` are gone from the barrel; the reader is
    `utils/read-aliases.ts`. And the name went with them — "placement" meant nothing in this domain,
    while `Placement` was already taken workspace-wide by `@fmmenchi/ui` for where an anchored
    surface sits. What a stylesheet declares is an ALIAS: a token holding no value of its own, only a
    reference to another, which is what DTCG calls it too.
  - **An alias as something a PERSON edits is an app's concept.** Re-pointing `--fm-color-primary`
    at rung 600 is a decision made in a form, so the app that grows that form defines the shape it
    needs. Nothing here is that shape.
- **THE LAYOUT: root is a SUBJECT, `utils/` is a PIECE, and the test sits beside the code.** It came
  over from `@fmmenchi/tokens` at the split and was written down nowhere, so it was carried badly
  twice — `emit-properties.ts` landed at the root when its predecessor had always been
  `utils/generate-properties.ts`, and the alias reader arrived at the root with no test at all.

  ```
  src/theme.ts  theme.types.ts  tokens.types.ts  palette.ts
  src/utils/  parse-css · read-aliases · validate-roles · -contrast · -states · emit-properties
  ```

  A file at the root answers one of the package's questions and is exported by name. A file in
  `utils/` is something a root subject composes — exported too, where a caller has reason to run one
  pass alone, but it is not a subject of its own. There is no `contract/`, `read/`, `build/`,
  `emit/` split: it was proposed, and five directories for a package of eleven files is a filing
  system nobody needs.

- **Every subject has a test, and a subject whose test needs a stylesheet has it in
  `@fmmenchi/tokens`** — `theme.ts`, `validate-roles.ts`, `-contrast.ts` and `-states.ts` take the
  SHIPPED theme as their fixture, which is what makes them worth having, and a `scope:shared` package
  must not reach into a `scope:client` one even by file path. Everything whose fixture it can build
  itself is tested here. **Check both places before concluding something is untested** — and check
  that a test which lives here is not asking about code that lives elsewhere, which is how
  `parseCssVars` ended up with its only two assertions inside a test about an emitter, in another
  package.
- **`validateRoles`, `validateContrast` and `validateStates` are exported individually** as well as
  composed by `validateTheme`: they are what a test exercises one at a time, and a caller measuring
  only contrast should not have to run completeness to get there.
- **Tests that read the SHIPPED stylesheets do not live here** — they live in `@fmmenchi/tokens`,
  beside the stylesheets they read, because a `scope:shared` package must not reach into a
  `scope:client` one even by file path. What is tested here needs no fixture from outside:
  `palette.test.ts` builds its own bases, `parse-css.test.ts` its own CSS.
- **`deriveDarkBases` IS A RULE, NOT A VALUE, which is why it may live here.** It takes no number a
  designer chose: it reads each base's SHARE of the chroma sRGB allows at its lightness and restates
  it at another lightness. The target lightness is an argument with a default, because 0.75 is a
  value and belongs to `@fmmenchi/tokens` — passing it is the caller's job.
  - The rule was found by MEASURING the shipped light bases, not picked: six of the seven sit between
    77.6% and 79.2% of their ceiling (`secondary` is the deliberate exception at 26.8%). Two rival
    rules were measured against the seven dark bases a designer had hand-picked — "keep the chroma"
    is out by 19% mean / 36% worst, "a fixed share of the ceiling" by 37% / 193%, this one by
    14.5% / 20%.
  - **The shipped dark preset is now what it produces**, asserted by
    `@fmmenchi/tokens`' `palette-dark.test.ts`. That is what extends "ours is an invocation of the
    same code path as a consumer's" to the dark theme — it had been true of light only, because the
    dark bases followed no rule at all and a wizard had nothing to compute them from.
- **`resolveCssVar` evaluates exactly one relative-colour form** and refuses any other rather than
  guessing. The shipped ramp is `oklch(from var(--base) calc(l - 0.14) calc(c * 0.96) h)`; a
  validator that cannot follow that reference reports nothing wrong, which is worse than no
  validator.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

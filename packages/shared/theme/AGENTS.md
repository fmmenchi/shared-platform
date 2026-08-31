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

It answers two questions:

```
what a theme IS        the as-const arrays, and every type derived from them
is this one allowed    parseTheme -> toTheme -> validateTheme
```

Plus the colour maths those answers need — `resolveCssVar` (which evaluates the relative-colour
ramp), the sRGB gamut fit, WCAG and APCA — and `generatePalette`, which is measured colour maths
with no caller yet.

**THE VALUES ARE NOT HERE.** `@fmmenchi/tokens` owns `styles/*.css`: those numbers are the design
work, and this package has no opinion about them. It says what a theme must satisfy; that one says
what ours is.

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
  read off them, because the two cannot be edited apart. `validate.types.ts` is the exception the
  rule allows: those types stand alone (`ThemeViolation`, `ContrastAdvisory`) and the file name says
  what it defines.
- **Every `index.ts` is a barrel — re-exports only.**
- **`validateRoles`, `validateContrast` and `validateStates` are exported individually** as well as
  composed by `validateTheme`: they are what a test exercises one at a time, and a caller measuring
  only contrast should not have to run completeness to get there.
- **Tests that read the SHIPPED stylesheets do not live here** — they live in `@fmmenchi/tokens`,
  beside the stylesheets they read, because a `scope:shared` package must not reach into a
  `scope:client` one even by file path. What is tested here needs no fixture from outside:
  `palette.test.ts` builds its own bases, `parse-css.test.ts` its own CSS.
- **`resolveCssVar` evaluates exactly one relative-colour form** and refuses any other rather than
  guessing. The shipped ramp is `oklch(from var(--base) calc(l - 0.14) calc(c * 0.96) h)`; a
  validator that cannot follow that reference reports nothing wrong, which is worse than no
  validator.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

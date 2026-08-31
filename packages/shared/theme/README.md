# @fmmenchi/theme

What a theme **is**, and whether one is **allowed**.

**Private — not published.** You do not install this package. Its names reach consumers through
[`@fmmenchi/tokens`](../../client/tokens), which re-exports them; anything that publishes must bundle
this one, because nothing resolves it from a registry.

## What is in here

|                  |                                                                                                                                                        |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **the contract** | every colour role, every token name, and every type derived from those arrays                                                                          |
| **the gate**     | `parseTheme` → `toTheme` → `validateTheme`: completeness, parseability, sRGB gamut, WCAG AA on every declared pair, an APCA floor, and the state ramps |
| **the maths**    | `resolveCssVar` (it evaluates the relative-colour ramp), the gamut fit, contrast measurement                                                           |
| **a palette**    | `generatePalette`: eight brand colours become the rungs of every family                                                                                |

**What is NOT in here: the values.** `@fmmenchi/tokens` owns `styles/*.css` — those numbers are the
design work. This package says what a theme must satisfy; that one says what ours is.

## Why it is a separate package

`@fmmenchi/tokens` is `scope:client`. `@fmmenchi/nx-theme-generator` is `scope:plugins`. The
workspace forbids a plugin from depending on a client library — and both of them need the same
contract, the same rules and the same colour maths.

`scope:shared` is the one scope a client library, a plugin **and** an app may all depend on. Before
this package existed, the Nx plugin reached the contract through `createRequire` and a dynamic
`import()`, with two escape-hatch options, a "could not resolve" branch, and a regex duplicated by
hand in two files. Now everything imports it.

## Using it

```ts
import { validateTheme, parseTheme, toTheme } from '@fmmenchi/theme';

const violations = validateTheme(toTheme(parseTheme(css)));
if (violations.length > 0) {
  throw new Error(violations.map((v) => v.message).join('\n'));
}
```

`validateTheme` returns `[]` when the theme is allowed. Advisories — pairs that clear both hard
floors but sit under the APCA body-text guideline — come from `adviseContrast` instead, and are
reported rather than failed.

## Working on it

```bash
pnpm nx typecheck @fmmenchi/theme
pnpm nx test @fmmenchi/theme
pnpm nx lint @fmmenchi/theme
```

Conventions and the reasoning behind each rule: [AGENTS.md](./AGENTS.md).

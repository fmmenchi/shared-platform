---
title: API reference
sidebar_label: API
sidebar_position: 1
---

# API reference

## `buildPayload(css, contract)`

Resolves a contract against a stylesheet.

| Parameter  | Type            | Meaning                                                        |
| ---------- | --------------- | -------------------------------------------------------------- |
| `css`      | `string`        | Stylesheet source. Only custom-property declarations are read. |
| `contract` | `TokenContract` | What to map, what to skip, and the root font size.             |

Returns `FigmaTokenPayload`:

| Field       | Type              | Meaning                                                  |
| ----------- | ----------------- | -------------------------------------------------------- |
| `contract`  | `string`          | The contract's `name`, echoed for provenance.            |
| `variables` | `FigmaVariable[]` | Mapped tokens, in declaration order.                     |
| `skipped`   | `SkippedToken[]`  | Deliberately not portable, each with its `reason`.       |
| `problems`  | `string[]`        | Undecided tokens, path collisions, unconvertible values. |

Rules are tried **in order and the first match wins**, so a narrow rule must precede the broad rule
it excepts. Every rule pattern is anchored — it cannot claim a longer property by prefix.

## `TokenContract`

```ts
interface TokenContract {
  readonly name: string;
  readonly rootFontSize: number; // rem → px divisor
  readonly rules: readonly TokenRule[];
  readonly exclusions: readonly TokenExclusion[];
}
```

### `TokenRule`

| Field    | Type                 | Meaning                                                                                        |
| -------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `match`  | `string`             | Regex source, matched against the full `--*` name. Anchored for you.                           |
| `path`   | `string`             | Figma path. `$1`…`$9` interpolate captures; `$2\|default` substitutes when the group is empty. |
| `type`   | `'COLOR' \| 'FLOAT'` | Which Figma variable type the value becomes.                                                   |
| `scopes` | `string[]`           | Figma variable scopes. Required — there is no sensible default.                                |

### `TokenExclusion`

| Field    | Type     | Meaning                                      |
| -------- | -------- | -------------------------------------------- |
| `match`  | `string` | Regex source, as above.                      |
| `reason` | `string` | Why it cannot be a Figma variable. Required. |

## `FigmaVariable`

| Field     | Type                  | Meaning                                                          |
| --------- | --------------------- | ---------------------------------------------------------------- |
| `cssVar`  | `string`              | The property it mirrors — write this into Figma's `description`. |
| `path`    | `string`              | `/`-separated Figma variable path.                               |
| `type`    | `'COLOR' \| 'FLOAT'`  |                                                                  |
| `css`     | `string`              | The declared CSS value, kept for diagnostics.                    |
| `value`   | `FigmaRgba \| number` | `{ r, g, b, a }` in 0–1, or a unitless number meaning px.        |
| `scopes`  | `string[]`            |                                                                  |
| `clipped` | `true?`               | Present only when the colour was outside sRGB and was clipped.   |

## `FM_CONTRACT`

This platform's contract for `@fmmenchi/tokens`: 21 rules, 6 exclusions, `rootFontSize: 16`.
Resolved against the shipped `vars.css` it yields **129 variables and 30 skipped**, with no
problems — asserted by `fm-contract.spec.ts`.

## Lower-level pieces

| Export                             | Purpose                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `parseCustomProperties(css)`       | `Map` of every declared `--*`, last declaration winning.                  |
| `toFigmaColor(css)`                | Any CSS colour → `{ value: FigmaRgba, clipped }` or `{ error }`.          |
| `toFigmaNumber(css, rootFontSize)` | `rem`, `px`, `calc(a / b)` or a bare number → `{ value }` or `{ error }`. |

`toFigmaColor` accepts anything [`culori`](https://culorijs.org) parses — deliberately the same
library the token package's WCAG contrast tests use, so the two cannot disagree about a colour.

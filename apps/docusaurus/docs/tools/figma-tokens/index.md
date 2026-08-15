---
title: '@fmmenchi/figma-tokens'
---

# @fmmenchi/figma-tokens

Turns a CSS custom-property token contract into a Figma variables payload — `oklch()` resolved to
sRGB, `rem` to px, and every property either mapped or explicitly skipped with a reason.

Internal dev tool: **private**, versioned and tagged by `nx release`, never published.

## The problem it solves

The design system's values live in `packages/client/tokens/src/styles/vars.css`, written the way
CSS wants them — `oklch(41% 0.135 255)`, `0.25rem`, `calc(1 / 0.75)`. Figma wants none of that: its
variables are sRGB channels in 0–1 and unitless numbers meaning px.

Translating by hand works once. What it cannot do is stay true: the day somebody adds a colour role
to the contract, the Figma file is silently one role short, and nothing anywhere says so.

So the translation is a package, and the package's real output is not the payload — it is the
**refusal to lose a token**. Every declared property lands in exactly one of three buckets:

| Bucket      | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| `variables` | mapped, with its Figma path, converted value and scopes |
| `skipped`   | deliberately not portable, **with the reason**          |
| `problems`  | matched no rule and no exclusion — an undecided token   |

`fm-contract.spec.ts` asserts `problems` is empty against the real stylesheet. Add a role without
deciding about Figma, and the suite goes red.

## Quick start

```ts
import { buildPayload, FM_CONTRACT } from '@fmmenchi/figma-tokens';
import { readFileSync } from 'node:fs';

const payload = buildPayload(
  readFileSync('packages/client/tokens/src/styles/vars.css', 'utf8'),
  FM_CONTRACT,
);

console.log(payload.variables.length); // 129
console.log(payload.skipped.length); //  30
console.log(payload.problems); //  []
```

## Where to go next

- **[Publish tokens to Figma](./guides/publish-to-figma.md)** — the whole loop, from payload to a
  verified `IN SYNC` Figma collection.
- **[Concepts](./concepts/index.md)** — why the rule lists are closed, why nothing is imported from
  the tokens package, and what deliberately does not cross over.
- **[Reference](./reference/index.md)** — the API and the contract shape.

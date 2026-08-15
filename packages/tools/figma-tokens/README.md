# @fmmenchi/figma-tokens

Turns a CSS custom-property token contract into a Figma variables payload. Internal dev tool —
private, never published.

- **Scope / type:** `tools` / `util`
- **Workspace:** part of [shared-platform](../../../README.md).
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).
- **Documentation:** [docs/](./docs/index.md) — the guide, the API reference, the concepts.

## What it does

A design system whose values live in CSS custom properties has no way to hand those values to
Figma: Figma wants sRGB channels in 0–1 and unitless numbers meaning px, and the stylesheet is
written in `oklch()` and `rem`. This package does that translation, and does one thing beyond it
that matters more — it **refuses to lose a token silently**.

Give it a stylesheet and a contract, and every declared property comes out in exactly one of three
places:

|             |                                                             |
| ----------- | ----------------------------------------------------------- |
| `variables` | mapped to a Figma variable, with its path, value and scopes |
| `skipped`   | deliberately not portable, **with the reason**              |
| `problems`  | matched no rule and no exclusion — nobody decided about it  |

`problems` is the load-bearing one. Adding a role to the design system without deciding what it
becomes in Figma turns the test suite red instead of quietly leaving a gap in the Figma file.

## What does not cross over

Some of a design system genuinely has no Figma counterpart, and pretending otherwise produces
variables that name nothing. For this platform that is 30 of 159 properties: font stacks (Figma
resolves one installed family, not a fallback list), shadows (Figma models them as effect _styles_),
motion — durations, easings, transitions — and z-index. Each is excluded by name, with the reason
attached, so the omissions read as decisions rather than oversights.

## Usage

```ts
import { buildPayload, FM_CONTRACT } from '@fmmenchi/figma-tokens';

const payload = buildPayload(readFileSync('vars.css', 'utf8'), FM_CONTRACT);
if (payload.problems.length) throw new Error(payload.problems.join('\n'));
```

Writing the payload into a Figma file is **not** part of this package — that is a Figma Plugin API
call, made through the Figma MCP. See [the guide](./docs/guides/publish-to-figma.md).

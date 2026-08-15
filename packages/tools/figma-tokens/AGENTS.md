# AGENTS.md — @fmmenchi/figma-tokens

Turns a CSS custom-property token contract into a Figma variables payload. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `tools`,
type `util`, **private** — versioned and tagged by `nx release`, never published. Human
documentation lives in [docs/](./docs/index.md) — keep it current with these rules, never duplicate
them into it.

## Commands

```bash
pnpm nx typecheck @fmmenchi/figma-tokens
pnpm nx build @fmmenchi/figma-tokens
pnpm nx test @fmmenchi/figma-tokens   # unit specs + the contract net against the real vars.css
```

## Rules

- **This package may not import `@fmmenchi/tokens`, and must not try.** `scope:tools` may depend on
  `scope:tools` and `scope:shared` only — the boundary lint enforces it. The engine here is generic:
  it takes CSS text and a contract, and knows nothing about this design system. The one coupling is
  the **relative path** in `fm-contract.spec.ts`, which reads the real stylesheet. That path is
  deliberate: a mapping nobody checks against the thing it maps is worth nothing. If the tokens
  package moves, that spec fails loudly — the correct outcome, not a bug to route around.
- **Every declared property is mapped or skipped. There is no third outcome.** A property matching
  no rule and no exclusion becomes a `problem`, and `fm-contract.spec.ts` asserts `problems` is
  empty. This is the entire point of the package: add a role to `vars.css` without deciding what it
  becomes in Figma, and the suite goes red. Never add a catch-all rule to make a failure go away —
  that trades the guarantee for silence.
- **The lists in `fm-contract.ts` are CLOSED on purpose.** `--fm-color-(.+)` would swallow a new
  role and file it under whichever group it resembled. Enumerating the families and surface roles is
  what makes a new one fail instead of landing somewhere plausible and wrong.
- **Rules are ordered, first match wins.** A narrow rule must precede the broad rule it excepts —
  `-foreground` and `-border` before the family fill rule. Reordering them silently changes scopes,
  and nothing but the spec will notice.
- **Colour conversion goes through `culori`, the same library the token package's WCAG tests use.**
  Not a convenience: it means the colour Figma shows and the colour the contrast assertions were
  computed against come from one implementation, so they cannot disagree.
- **Out-of-gamut is clipped AND reported, never silently clipped.** `oklch()` can describe colours
  sRGB cannot; Figma has no wide-gamut variable. The spec asserts nothing is currently clipped — a
  tripwire, so a new token that renders differently in Figma than in the browser is a decision
  somebody makes, not a discovery in review.
- **`scopes` are always explicit.** The Figma API default (`ALL_SCOPES`) offers every variable for
  every property, which makes the picker useless at 129 variables. A rule without a deliberate scope
  list is a bug.
- **Writing to Figma is not this package's job.** It emits a payload; the Figma Plugin API call is
  made by an agent through the Figma MCP. Keep the transport out — it is the only untestable part,
  and it stays where it cannot contaminate the pure half.
- **`rootFontSize` is declared, not assumed.** Figma variables are unitless numbers meaning px, so
  `rem` resolves against the contract's own root size. A document that has moved its root size needs
  a different contract, not a patch here.

## Layout

`parse.ts` (scan declarations) → `payload.ts` (resolve a contract) ← `convert.ts` (CSS value → Figma
value). `contract.types.ts` / `payload.types.ts` hold the shapes; `fm-contract.ts` is this
platform's contract as data. `index.ts` is a barrel — re-exports only.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

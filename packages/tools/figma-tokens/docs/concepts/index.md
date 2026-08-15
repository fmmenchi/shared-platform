---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Four decisions. Three of them are things this package deliberately refuses to do.

---

## 💡 The Philosophy

### 1. The output is the refusal, not the payload

Converting `oklch()` to sRGB is arithmetic — a library does it in one call. If that were the job,
this would be a script, not a package.

The job is the guarantee that the conversion stays **complete**. A design system gains roles: the
`error` status family arrived after `success`, `warning` and `info` were already there. Every time
that happens, a hand-made Figma mirror falls one role behind, and nothing says so — not the build,
not the types, not review. The gap is discovered by a designer picking a colour that isn't there.

So the resolver has no default branch. A property matches a rule, or matches a named exclusion, or
becomes a `problem` — and the contract spec asserts there are no problems against the real
stylesheet. The payload is a by-product; the red test is the product.

### 2. Nothing is imported from the design system, and that is not a workaround

`scope:tools` may depend on `scope:tools` and `scope:shared` only. `@fmmenchi/tokens` is
`scope:client`, so importing the contract is not available.

The constraint produced a better shape than the one it blocked. The engine takes CSS text and a
contract object; it knows nothing about `--fm-*`, about oklch authoring, or about this platform. A
consumer repo with its own prefix writes its own contract and reuses all of it — which is what
[ADR-0008](../../../adr/0008-cross-app-framework-agnostic-layers.md)
asks of a layer here.

What remains is one **relative path**, in `fm-contract.spec.ts`, reading the real stylesheet. That
coupling is deliberate and load-bearing: a mapping nobody checks against the thing it maps is worth
nothing. If the tokens package moves, that spec fails loudly — which is the correct outcome.

### 3. The rule lists are closed, so a new role fails instead of landing somewhere plausible

The convenient contract is one rule: `--fm-color-(.+)` → `color/$1`. It maps everything, forever,
and never needs touching.

It also silently decides. `--fm-color-brand` would become `color/brand` with fill scopes and no
family grouping, which looks right in a diff and is wrong in the file. Worse, it removes the only
mechanism that could have asked a human.

So the families are enumerated (`primary|secondary|accent|destructive|success|warning|info|error`)
and the surface roles are listed by name. A role added tomorrow matches nothing, becomes a
`problem`, and stops the suite — which is the moment somebody decides where it belongs.

The cost is real and accepted: `fm-contract.ts` must be edited when the contract grows. That edit
is the decision, written down.

### 4. Some of a design system has no Figma counterpart, and pretending otherwise is worse than a gap

30 of 159 properties do not cross over:

| Group                                                 | Why not                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--fm-font-*`                                         | CSS font _stacks_ (`ui-sans-serif, system-ui, sans-serif`). Figma resolves a single installed family, so a stack becomes a string naming no font. |
| `--fm-shadow-*`                                       | Figma models shadows as effect **styles**, a different surface from variables.                                                                    |
| `--fm-duration-*`, `--fm-ease-*`, `--fm-transition-*` | Motion has no Figma variable type.                                                                                                                |
| `--fm-z-*`                                            | Stacking order is a DOM concept; Figma orders by layer position.                                                                                  |

Each is excluded **by name, with the reason attached**, and the reason is a required field. An
unexplained exclusion is indistinguishable from an oversight, which is the failure mode the whole
package exists to prevent — so the exclusion list is held to the same standard as the rules.

---

## ⚠️ The limits worth knowing

**`rem` is resolved, not preserved.** Figma variables are unitless numbers meaning px, so
`0.25rem` becomes `4` against the contract's declared `rootFontSize`. A document that moves its root
size needs a different contract; the conversion cannot follow it.

**Out-of-gamut colours are clipped.** `oklch()` describes colours sRGB cannot, and Figma has no
wide-gamut variable, so clipping is unavoidable — but it is flagged on the variable, and the
contract spec asserts nothing is currently clipped. That assertion is a tripwire: a token that
renders differently in Figma than in the browser should be a decision, not a discovery.

**The dark preset does not fully cross over either.** It is a complete second theme — it overrides
every colour role, plus the three shadows. On a Figma plan with variable modes it would be a second
mode; the shadows still would not come.

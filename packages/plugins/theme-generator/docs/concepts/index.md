---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Understand the philosophy and the internal mechanics behind `@fmmenchi/nx-theme-generator`.

---

## 💡 The Philosophy

A **theme** is a complete assignment of every color role of `@fmmenchi/tokens`, declared under a
`[data-theme='<name>']` selector. Writing one by hand invites two failure modes, and the plugin
exists to remove both.

### 1. Completeness over convenience

Miss a role and the components that consume it render unstyled — silently, because CSS has no
"undefined variable" error. The `theme` generator scaffolds **every** role at once, instantiated
from the contract, so a fresh theme is complete by construction. The editing rule is one line:
change the values, never remove a role.

### 2. Accessibility is a gate, not a guideline

A theme's colors are not free — the design system guarantees contrast on a fixed set of role
pairings (text on its background, a focus ring on the surface, an invalid signal on a field). The
`validate-themes` target enforces those pairings on every CI run and reports the **exact ratio** it
measured, so a regression is a build failure with a number attached, not a design review comment.

### 3. It cannot drift from the contract

The plugin **bundles nothing**. Both the scaffold source and the validator are resolved at run time
from the `@fmmenchi/tokens` version installed in the consumer workspace. Upgrade tokens and the next
generation follows the new contract automatically; if the upgrade added a role, `validate-themes`
fails until every theme assigns it. The contract and its enforcement move together.

---

## 🏗 How it works inside

The plugin is three cooperating pieces — two generators and one executor — that share a single
target name (`validate-themes`).

### The composition

1. **`theme` generator (the scaffold).** Resolves the installed `@fmmenchi/tokens/styles/vars.css`
   from the workspace root (via `createRequire`), scans it for `--fm-color-*` declarations, and
   writes a complete `[data-theme='<name>']` block to `<projectRoot>/<directory>/<name>.css` — the
   starting values are the light reference preset. Unless `--skipValidation` is set, it then **calls
   the `validation` generator** so the new file is gated from day one. The generated file's header
   records the exact tokens version it was instantiated from.

2. **`validation` generator (the wiring).** Adds — or updates — the `validate-themes` target on the
   project, pointing it at the `@fmmenchi/nx-theme-generator:validate` executor and registering the
   theme CSS paths in its `options.themes`. It is **idempotent**: re-running merges the new paths
   with the existing list, dedupes, and sorts, so registering the same theme twice is a no-op.

3. **`validate` executor (the gate).** For each registered file it parses the `--fm-color-*`
   declarations into a role map and runs the `validateTheme()` of the installed `@fmmenchi/tokens`
   (a dynamic `import()` of the `@fmmenchi/tokens/validate` subpath — tokens is ESM). It prints
   `✓ <path> — allowed theme` per passing file and, for a failing one, `✗ <path> is NOT an allowed
theme:` followed by one line per violation. Any violation fails the target.

### What `validateTheme` checks

The executor delegates the verdict entirely to the installed contract's `validateTheme`, which
returns one violation per problem across four checks:

- **Completeness** — every color role is assigned, and no unknown role is present.
- **Parsability** — every value is a real, parsable color (resolved literals, not `var()`
  references).
- **sRGB gamut** — every value is sRGB-displayable; out-of-gamut colors render differently per
  browser and falsify the contrast math, so they are rejected.
- **WCAG contrast** — every _declared pair_ meets its minimum ratio: `4.5:1` for text pairings,
  `3:1` for non-text pairings (the focus ring on its surface, the invalid signal on a field, tinted
  alert borders). `-disabled` pairings are exempt per the WCAG 1.4.3 exception.

### The scope boundary that forces run-time resolution

`@fmmenchi/nx-theme-generator` never statically imports `@fmmenchi/tokens` — the workspace's module
boundaries forbid a `plugins` project from depending on a `client` one. That constraint is also what
makes the plugin correct: because the tokens contract is only ever reached at run time, from the
consumer's own installation, there is no bundled copy that could go stale.

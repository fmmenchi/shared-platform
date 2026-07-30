# AGENTS.md — @fmmenchi/nx-ui

Nx generators for developing the `@fmmenchi/ui` design system — the Button archetype as code. Part
of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope
`plugins`, type `plugin`, `private` (versioned + tagged, not published: the templates hardcode
ui-internal relative imports, so the generator is meaningless outside this repo).

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-ui
pnpm nx build @fmmenchi/nx-ui
pnpm nx lint @fmmenchi/nx-ui
pnpm nx test @fmmenchi/nx-ui   # Tree-based generator specs
```

## Shape

- **generator `component`** — scaffolds `packages/client/ui/src/components/<name>/` with the full
  archetype (component / types / cva variants / token-only module.css / curated stories / mdx /
  tests / barrel; `--element` for the native tag, `--messages` for a colocated catalog, `--context`
  for the component's React context and its `use<Name>Part` warn-by-name hook) and wires the public
  surface: root barrel, `package.json` subpath exports, vite entry. **Throws** if the component
  exists.

**A generator generates a component, not a family.** A compound part is a component in its own right
(ADR-0014), so it is scaffolded by running the generator again — there is no compound mode, and adding
one would contradict the ADR:

```bash
pnpm nx g @fmmenchi/nx-ui:component fieldset --element=fieldset --context
pnpm nx g @fmmenchi/nx-ui:component fieldset-legend --element=legend
```

What relates the two — the context the part reads, the props it takes — is design work on components
that already exist, not scaffolding.

## Rules

- **The templates ARE the archetype.** When a Button-level decision changes (pending semantics,
  geometry, slots, a11y patterns), update the templates in the same PR — otherwise the next
  component is born stale.
- Templates must satisfy the ui gates they'll be judged by: token-only CSS (`lint-css`), curated
  argTypes, axe matrix. Never put raw colours/motion in a template.
- Generate via the wired surface only — the generator updates barrel/exports/vite so tree-shaking
  and subpath docs never drift; don't hand-add components.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

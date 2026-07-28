# @fmmenchi/nx-ui

Nx generators for developing the `@fmmenchi/ui` design system. Internal tooling (`private` —
versioned + tagged, not published).

## `component` — scaffold the archetype

```bash
pnpm nx g @fmmenchi/nx-ui:component badge            # native element: div
pnpm nx g @fmmenchi/nx-ui:component tag --element=span
pnpm nx g @fmmenchi/nx-ui:component alert --messages # + colocated .messages.ts
```

Creates `src/components/<name>/` with the **full archetype the Button established** — component,
types, cva variants, token-only `module.css`, curated stories, mdx doc, tests (semantics + snapshot

- axe per variant×theme), folder barrel — and wires the public surface so nothing is forgotten:
  root barrel re-exports, `package.json` `./<name>` + `./<name>/style.css` subpaths, and the vite
  build entry. Throws if the component already exists.

The templates carry the archetype's rules as TODOs (native-first element, pending-not-disabled
loading, declared contrast pairs, curated argTypes) pointing at Button as the reference.

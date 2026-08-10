---
title: Generators
sidebar_label: Generators
sidebar_position: 1
---

# Generators

`@fmmenchi/nx-ui` ships **one generator** and no executors.

---

## `component`

```bash
pnpm nx g @fmmenchi/nx-ui:component <name> [options]
```

### Options

| Option     | Type      | Default | What it does                                                                    |
| ---------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `name`     | `string`  | —       | **Required.** Component name, kebab-case (`badge`, `radio-group`).              |
| `element`  | `string`  | `div`   | The native element the component builds on. Native-first: pick it deliberately. |
| `messages` | `boolean` | `false` | Also scaffold a colocated `.messages.ts` catalogue.                             |
| `context`  | `boolean` | `false` | Also scaffold the component's React context — the contract its parts read.      |

Throws if `src/components/<name>/` already exists, so it can never half-overwrite a component.

### Files it writes

Into `packages/client/ui/src/components/<name>/`:

| File                   | What it is                                     |
| ---------------------- | ---------------------------------------------- |
| `<name>.component.tsx` | The component                                  |
| `<name>.types.ts`      | Its props — a separate file, always            |
| `<name>.variants.ts`   | The `cva` variants                             |
| `<name>.module.css`    | Token-only styles                              |
| `<name>.stories.tsx`   | Curated stories                                |
| `<name>.mdx`           | The component's documentation page             |
| `<name>.test.tsx`      | Semantics + snapshot + axe per variant × theme |
| `index.ts`             | The folder barrel — re-exports only            |
| `<name>.messages.ts`   | Only with `--messages`                         |
| `<name>.context.tsx`   | Only with `--context`                          |

### Files it edits

This is the half that is easy to forget and impossible to notice:

| File                                 | What it gains                                                         |
| ------------------------------------ | --------------------------------------------------------------------- |
| `packages/client/ui/src/index.ts`    | The root barrel re-exports the component, its variants and its types  |
| `packages/client/ui/package.json`    | The `./<name>` subpath — **JS only**; the CSS ships as one stylesheet |
| `packages/client/ui/vite.config.mts` | The component's build entry, whose KEY becomes the emitted filename   |

There is no `./<name>/style.css` and there must not be: 16 of 32 entries render other components, so
a per-component stylesheet cannot carry what its component needs and the consumer has no way to know
what is missing (ADR-0023).

---

## What the templates carry

Not filler. Each template holds the archetype's rules as TODOs pointing at `Button` as the
reference: the native-first element, pending-not-disabled loading, the contrast pairs a variant must
declare in `@fmmenchi/tokens`, and curated `argTypes` rather than the full generated list.

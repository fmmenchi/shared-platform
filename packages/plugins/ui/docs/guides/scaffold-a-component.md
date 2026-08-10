---
title: Scaffold a component
sidebar_label: Scaffold a component
sidebar_position: 1
---

# Scaffold a component

Create a new `@fmmenchi/ui` component in the archetype, with its public surface already wired.

## Intent

You are adding a component to the design system. Eight files have to exist in the same shape as
every other component, and four existing files have to learn about it — a barrel, a `package.json`
subpath, a build entry. Forgetting the last group is silent: the component works in the suite and is
unreachable from an installed package.

## The call

```bash
pnpm nx g @fmmenchi/nx-ui:component badge
```

`name` is kebab-case and is the only required option. The generator **throws if the component
already exists**, so it cannot half-overwrite one.

Three flags cover the cases the archetype does not assume:

```bash
pnpm nx g @fmmenchi/nx-ui:component tag --element=span   # native-first: pick the element
pnpm nx g @fmmenchi/nx-ui:component alert --messages     # + a colocated message catalogue
pnpm nx g @fmmenchi/nx-ui:component tabs --context       # + the contract its parts read
```

`--element` defaults to `div`, and choosing it is the first native-first decision: a component built
on the right element inherits behaviour nobody then has to write.

Use `--messages` only when the design system owns the copy — a dismiss label, a severity word — never
for text the consumer passes in. Use `--context` for a compound component, whose parts need a
contract to read.

## What you get, and what to do with it

The templates are not filler: they carry the archetype's rules as TODOs, each pointing at `Button`
as the reference implementation — the native-first element, pending-not-disabled loading, the
contrast pairs a variant must declare, curated `argTypes` rather than the whole generated list.

Work through them in this order, because each answers the next:

1. **The element and the semantics** — what it IS, before what it looks like.
2. **The variants** (`*.variants.ts`) — and, for each colour pairing, the entry it needs in
   `CONTRAST_PAIRS` over in `@fmmenchi/tokens`.
3. **The stylesheet** — token values only; `lint-css` refuses raw ones.
4. **The tests** — semantics, then a11y per variant × theme, then behaviour.
5. **The story and the mdx**, last, because they document what the first four settled.

## Verify

```bash
pnpm nx run-many -t typecheck build lint lint-css build-storybook
pnpm nx run-many -t test
```

The two are separated deliberately — see the workspace's definition of done. A component that builds
but has no `./<name>` subpath will not fail either of them, which is exactly why the generator writes
that part rather than leaving it to be remembered.

## Next steps

- [Generators](../reference/generators.md) — the full list of what is written and what is edited.
- [Concepts](../concepts/index.md) — why the wiring is the point.

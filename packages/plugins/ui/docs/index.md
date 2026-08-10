---
title: '@fmmenchi/nx-ui'
sidebar_label: nx-ui
sidebar_position: 0
---

# @fmmenchi/nx-ui

Nx generators for developing the `@fmmenchi/ui` design system. Internal tooling — `private`, so it
is versioned and tagged but never published.

One generator, `component`, which scaffolds a new component in the **archetype the Button
established** and wires the four places a new component has to appear. The value is not the eight
files it writes; it is the wiring nobody remembers and the rules the templates carry as TODOs.

```bash
pnpm nx g @fmmenchi/nx-ui:component badge
```

## Prerequisites

- This workspace. The generator writes into `packages/client/ui` by path, so it is not usable
  anywhere else and is not meant to be.

## 🚀 Guides

- [Scaffold a component](./guides/scaffold-a-component.md) — the call, the options, and what to do
  with the result.

## 📚 Reference

- [Generators](./reference/generators.md) — the `component` generator, every option, every file it
  writes and every file it edits.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — why a generator rather than copying a folder, what the archetype
  is, and why the public surface is edited rather than left to the author.

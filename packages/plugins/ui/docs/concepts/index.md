---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Why a generator exists for something a person could do by copying a folder.

---

## 💡 The Philosophy

### 1. The wiring is the point, not the files

Copying a folder gets you eight files. What it does not get you is the four edits a new component
needs elsewhere: the root barrel, the `package.json` subpath, the build entry. Each of those is
invisible when forgotten — the component renders in Storybook, passes its own tests, and is
unreachable from an installed package. Nothing in the gate fails.

A generator is the only place that knowledge can live where it cannot be skipped.

### 2. The archetype is a decision, and it is `Button`'s

Every component here has the same shape — component, types, variants, token-only stylesheet, stories,
mdx, tests, barrel — because a design system whose components disagree about their own structure
costs more to read than to write. The templates do not merely produce that shape; they carry the
reasoning as TODOs pointing at `Button`, so the next author meets the rule at the moment it applies
rather than in a document they were meant to have read.

### 3. It refuses rather than merges

The generator throws if the component already exists. A generator that overwrites is a generator
nobody dares run twice, and one that merges is one nobody can predict.

### 4. Private on purpose

It is `private`: versioned and tagged by `nx release`, never published. It writes into
`packages/client/ui` by path, so it is unusable outside this workspace — and pretending otherwise
would mean maintaining a configurable target path for a single consumer.

---

## 🎯 What it deliberately does NOT do

**It does not write the component.** The TODOs are questions, not scaffolding to delete: which native
element, which variants, which contrast pairs. A generator that guessed those would produce a
component that compiles and means nothing.

**It does not add a per-component stylesheet subpath.** 16 of 32 entries render other components, so
a per-component stylesheet cannot carry what its component needs — and the consumer has no way to
know what is missing (ADR-0023). One `style.css` for the package, and the generator does not offer
the alternative.

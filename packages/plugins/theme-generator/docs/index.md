---
title: '@fmmenchi/nx-theme-generator'
sidebar_label: Theme Generator
sidebar_position: 0
---

# @fmmenchi/nx-theme-generator

Scaffold a complete brand theme from the `@fmmenchi/tokens` contract you have installed, and gate
it in CI — one command wires both.

## Prerequisites

- An existing Nx workspace.
- `@fmmenchi/tokens` installed in that workspace. The plugin bundles nothing: the scaffold source
  (`vars.css`) and the validator (`validateTheme`) are both resolved **at run time** from your
  installed tokens version, so themes can never drift from the contract.
- An **existing** project (app or library) to own the theme. The generator writes into a project;
  it never creates one.

## 🚀 Guides

Quick start:

1. [Scaffold a theme](./guides/scaffold-a-theme) — generate a complete `[data-theme]` preset into a
   project and wire its CI gate.
2. [Gate themes in CI](./guides/gate-themes-in-ci) — run `validate-themes` on every push.
3. [Register a hand-written theme](./guides/register-existing-theme) — add a CSS file you authored
   by hand to the gate.

## 📚 Reference

- [Generators & executor](./reference/cli) — every generator, the executor, and their real
  arguments, options and defaults.

## 🏗 Concepts

- [Core concepts](./concepts) — why a theme is a complete role assignment, and how run-time
  resolution keeps the scaffold and the gate in sync with your tokens contract.

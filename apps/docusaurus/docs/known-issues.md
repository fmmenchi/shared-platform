---
title: Known issues
sidebar_label: Known issues
sidebar_position: 4
---

# Known issues

A living list of known limitations, upstream incompatibilities, and the workarounds in place.
Each entry says what breaks, why, what we do about it today, and what unblocks it. Add an entry
whenever we hit something that a future contributor (or agent) would otherwise rediscover the hard
way.

## TypeScript 7 is not adoptable yet (Nx incompatibility)

**Status:** blocked upstream · **Since:** 2026-07 · **Tracking:** [nrwl/nx#36306](https://github.com/nrwl/nx/issues/36306)

Bumping `typescript` from 6.x to 7.x breaks the whole Nx plugin/inference layer:

```
Failed to load 3 Nx plugin(s):
  - @fmmenchi/nx-trivy:  tsModule.readConfigFile is not a function
  - @fmmenchi/nx-notify: tsModule.readConfigFile is not a function
  - @nx/storybook/plugin: Cannot convert undefined or null to object
```

**Why.** TypeScript 7 is the native (Go) compiler. Its 7.0 release **dropped the in-process
programmatic API** — `require('typescript')` now exposes little more than `version`, so
`ts.readConfigFile` / `ts.parseJsonConfigFileContent` / `ts.sys` are gone. Nx (and our own
`createNodesV2` plugins) use those to read `tsconfig` files during graph inference, so they fail to
load. TypeScript has said a new (different) programmatic API is expected in **7.1**.

**What we do today.**

- `typescript` stays on **6.x**.
- Dependabot **ignores `typescript` major bumps** (`.github/dependabot.yml`) so the broken PR isn't
  re-proposed weekly.
- We are on the latest **stable** Nx (23.1.0); no stable Nx release fixes this yet.

**What unblocks it.** TypeScript 7.1 (programmatic API restored) **and** Nx support for it. When
adopting, follow Nx's TypeScript 7 guide — a **side-by-side** setup (`typescript@6` for Nx's tooling,
`typescript@7`/`tsgo` for the typecheck) — applied via `nx migrate`, **not** a standalone bump.

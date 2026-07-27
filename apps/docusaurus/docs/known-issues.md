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

## Babel 8 presets are not adoptable yet (Nx pins `@babel/core@7`)

**Status:** blocked upstream · **Since:** 2026-07 · **Applies to:** `@babel/preset-react` (and other Babel 8 presets/plugins)

Bumping `@babel/preset-react` (or a peer Babel preset/plugin) to **8.x** breaks the Storybook build:

```
[BABEL] ./.storybook/preview.tsx: @babel/preset-react:
  Since v8 ... requires @babel/core@^8   (found @babel/core@7.x)
```

**Why.** `@nx/js@23.1.0` **hard-depends on `@babel/core@^7.23.2`**, and the whole `@nx/*` toolchain
(`@nx/react`, `@nx/storybook`, …) pulls that nested copy. Babel 8 presets declare a peer of
`@babel/core@^8`, so inside Nx's Babel-driven builds (Storybook, React) the Babel 8 preset meets Nx's
nested `@babel/core@7` and refuses to run.

> ⚠️ This fails **only in CI**, not the local gate: pnpm may resolve `@babel/core@8` locally while a
> clean install (CI) uses the `@babel/core@7` nested under `@nx/js`. **Trust CI, not the local gate,
> for Babel-preset bumps.** The root `@babel/core` itself is on 8 and harmless (Nx uses its own
> nested 7 for builds); it's the **presets** that need 8 everywhere.

**What we do today.** Babel presets/plugins stay on **7.x**; Dependabot **ignores `@babel/*` major
bumps** (`.github/dependabot.yml`). Forcing `@babel/core@8` into `@nx/js` via `pnpm.overrides` is
untested against Nx's declared range and could break the build — don't.

**What unblocks it.** Nx moving its Babel toolchain to 8, adopted via `nx migrate`.

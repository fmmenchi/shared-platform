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

## ESLint 10 is not adoptable yet (flat-config plugins cap at eslint 9)

**Status:** blocked upstream · **Since:** 2026-07 · **Applies to:** `eslint` major 10

Bumping `eslint` from 9.x to 10.x breaks linting:

```
TypeError: Error while loading rule 'react/no-direct-mutation-state':
  contextOrFilename.getFilename is not a function
```

**Why.** ESLint 10 changed the rule-context API (e.g. removed `context.getFilename()`).
`eslint-plugin-react`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-import` still use the old API and
declare an `eslint` peer of **`≤ 9`** — and we are already on their latest versions, so there's no
newer plugin to move to. This is plugin-ecosystem lag, not an Nx coupling; `typescript-eslint` already
supports eslint 10, but the React/a11y/import plugins don't.

**What we do today.** `eslint` stays on **9.x**; Dependabot **ignores `eslint` major bumps**
(`.github/dependabot.yml`).

**What unblocks it.** `eslint-plugin-react` / `jsx-a11y` / `import` shipping eslint-10 support (their
peer ranges widening to include `^10`).

## A stale Docusaurus cache reports false broken links

**Symptom.** `nx build @fmmenchi/docs` fails with `Docusaurus found broken links!` pointing at a
markdown file that **exists** on disk and whose page is generated in `build/`. Typically after a
document arrives through a `git merge` or a branch switch rather than being written in place.

**Cause.** Docusaurus keeps its own cache in `apps/docusaurus/.docusaurus`. Its file→route map is
built once; a document that appears afterwards is rendered, but relative `./file.md` links to it are
no longer resolvable, so they survive into the HTML as literal paths and fail the link check.
`--skip-nx-cache` does not help — it skips Nx's cache, not Docusaurus's.

**Fix.** `pnpm nx clear @fmmenchi/docs`, then rebuild.

**Do not "fix" the link.** Rewriting it to the route form (`./minimal-semantic-markup`) makes the
build pass and encodes a local cache artifact in the repo — CI builds from a clean checkout and never
sees the problem. If a link is genuinely broken, it fails after a clear too.

## Baseline exceptions in flight (ADR-0010)

**Status:** living section · Newly-available features used as **graceful progressive enhancement**
([ADR-0010](./adr/0010-progressive-enhancement-beyond-widely.md)). Every entry is also marked
in-code by a justified `use-baseline` disable comment; when a feature goes Widely, code comment
**and** ledger entry are removed.

| Feature                                                                                       | Where                                                                                                                                                                                                                               | Degrades to                                                                                                                                                                                                                              | Widely ETA                                                                  |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `@starting-style`                                                                             | Tooltip, Popover and Dialog — ENTRY only. `transition-behavior: allow-discrete` was tried for the exit and removed: measured dead in Gecko and WebKit, and in Chromium the surface is parked off-screen before a frame of it paints | instant open, fully functional                                                                                                                                                                                                           | ~2027-02                                                                    |
| Invoker commands (`command` / `commandfor`)                                                   | `DialogTrigger`, `DialogClose` — the declarative open and close                                                                                                                                                                     | a click handler, feature-detected at click time; identical behaviour                                                                                                                                                                     | ~2027-05                                                                    |
| `::details-content` + `interpolate-size` (with `allow-discrete` riding the same `transition`) | Accordion — the panel's open/close animation (`accordion-item.module.css`, marked in place)                                                                                                                                         | The panel opens and closes instantly where any of the three is missing — the pre-animation behaviour, fully functional. `allow-discrete` here rides on `content-visibility`, not the overlay exit that was measured dead in Gecko/WebKit | ~2027+ — drop the row (and the in-place marker) when the set crosses Widely |
| `<details name>` (exclusive accordion)                                                        | Baseline **newly** (2024-09), widely ~2027-03                                                                                                                                                                                       | The attribute is inert where unsupported: an `exclusive` Accordion stays usable and stops being exclusive. A capability lost quietly, so it is stated in the component docs too.                                                         | Drop the row when it crosses Widely.                                        |
| `closedby="any"`                                                                              | `DialogContent` — dismiss on a backdrop click                                                                                                                                                                                       | `Escape` and the close button, which work everywhere; only the convenience is lost                                                                                                                                                       | ~2027-05                                                                    |
| Popover API (**maintainer waiver, 2026-07**)                                                  | approved for the upcoming Popover/Tooltip anchoring (no code usage yet)                                                                                                                                                             | NOT graceful — content inline or hidden; waived because Widely lands before any consumer ships                                                                                                                                           | ~2026-10                                                                    |
| `@property` typed token roles                                                                 | `tokens/styles/properties.css` — colours + radius registered for interpolation (ADR-0012)                                                                                                                                           | plain untyped custom properties; values hold, only interpolation (theme crossfade) is lost                                                                                                                                               | ~2027-01                                                                    |
| `content` alternative text (`content: '/' / ''`)                                              | Breadcrumb — the CSS-drawn separator (`breadcrumb-link.module.css`, marked in place)                                                                                                                                                | the plain `content: '/'` declaration before it: every engine draws the slash, older ones may also announce it — the trade every aria-hidden-separator library makes                                                                      | ~2027-01 (Firefox 128, 2024-07)                                             |

**Watchlist (degradable, no design need yet):** View Transitions.

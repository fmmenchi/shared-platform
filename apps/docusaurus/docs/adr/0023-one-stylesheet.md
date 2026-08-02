# ADR 0023 — The design system ships one stylesheet

- **Status:** accepted (2026-08-01) — refines [ADR-0018](./0018-how-the-ds-ships-css.md), which stands otherwise
- **Date:** 2026-08-01
- **Deciders:** Fabio Menchicchi

## Context and problem statement

[ADR-0018](./0018-how-the-ds-ships-css.md) says the package ships precompiled CSS as
`@fmmenchi/ui/style.css` **and per-component subpaths**, so a consumer can import only what they use.
Every component's scaffold added its own `./<name>/style.css`, and the docs taught the granular import
as the frugal choice.

Two of those subpaths were found pointing at files the build never emits — `form-input` and
`form-choice` have no stylesheet of their own, so `import '@fmmenchi/ui/form-input/style.css'` was a
hard `ERR_MODULE_NOT_FOUND` for anyone who followed the documented recipe. Deleting the two dead
entries was the obvious repair, and it was wrong: it treated as a typo something that is a property
of the design.

**A component that renders another component needs that component's CSS.** `FormInput` renders
`Field`, `FieldDescription`, `FieldError` and `Input`. `DialogTrigger` renders a `Button`. Even
`Input` needs `field`'s stylesheet for the shape it takes inside a field. Counted across the package:
**16 of 32 entries compose at least one other component whose CSS their own subpath does not carry.**
A consumer cannot know this — nothing in `<DialogTrigger>` says "and also fetch button.css" — so the
granular import silently produces a half-styled control. Half the package was making a promise it
could not keep, and the two hard errors were the only visible symptom.

## Considered options

**Make the subpaths honest.** The build plugin walks each entry's module graph and emits a
`<name>.css` containing (or `@import`ing) the CSS of everything that entry renders. It keeps the
promise — and for the components people actually use it collapses: `form-input.css` would carry five
stylesheets, `choice-field.css` five, and the "granular" import would fetch most of the package one
`@import` at a time. Real work in the build, for an outcome that is granular in name only.

**Narrow the contract.** Document `<name>/style.css` as "this component's own rules; import its
parts' stylesheets yourself". Rejected outright: the composition is an implementation detail, so the
instruction is unfollowable. It converts a broken promise into a documented trap.

**Ship one stylesheet.** Delete the per-component CSS subpaths; keep `@fmmenchi/ui/style.css`.

## Decision

**One stylesheet.** `@fmmenchi/ui/style.css` is the only CSS entry point. The per-component **JS**
subpaths stay exactly as they are — that granularity is real, tree-shaking works, and nothing about
it was ever a promise the package could not keep.

The number that decides it: **the whole design system's CSS is 37.7 kB raw, 4.5 kB gzipped**, with
the largest single component at 6.3 kB raw. Granularity was saving fractions of a kilobyte and
charging for it with a contract that is false for half the entries and a failure mode — a component
rendered without its parts' styles — that shows up as a visual bug in the consumer's app, not as an
error anybody can trace back to here.

The component generator no longer adds the subpath, and its test asserts the absence, so the next
component cannot quietly reintroduce it.

## Consequences

- A consumer importing one component pays for the whole stylesheet: 4.5 kB gzipped, less than a
  single icon font, against a `@fmmenchi/ui` graph that already carries `class-variance-authority`,
  `clsx`, `tslib` and `@floating-ui/dom`.
- **The removal is breaking.** `@fmmenchi/ui/<name>/style.css` stops resolving; the replacement is
  the one line `@import '@fmmenchi/ui/style.css'`. It ships with a major.
- **When this stops being true, the answer is the graph and not the file.** If the package grows to
  where the stylesheet is genuinely heavy, the correct mechanism is the first option above — entries
  that carry their dependencies' CSS — not one file per folder. Written down here so that the next
  person reaches for the mechanism that keeps the promise rather than the one that looks granular.
- ADR-0018 stands: precompiled CSS, no runtime, the cascade layer, typed tokens. Only the sentence
  about per-component subpaths is superseded, and only for CSS.

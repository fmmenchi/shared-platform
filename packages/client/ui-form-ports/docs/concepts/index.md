---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Why `@fmmenchi/ui` asks instead of choosing, and what the four adapters had to absorb so that a
consumer never learns the difference.

---

## 💡 The Philosophy

### 1. The design system declares a port, the app fills it

`@fmmenchi/ui` is framework-agnostic by rule: it may not depend on a consumer's runtime, router or
form library. So it declares the narrowest contract it can and asks for an implementation.

The whole of that contract is two hooks:

```ts
type UseFormField = (name: string) => BoundField;
type UseFormErrors = () => Readonly<Record<string, FieldMessages>>;
```

`UseFormField` names no library, and cannot: what it returns is a bag of **native element props** —
the widest interface there is, and one every form library already produces (react-hook-form's
`register`, Conform's `getInputProps`, Formik's `getFieldProps`). `error` is a message, not a
verdict: deciding WHEN a field is invalid stays with the consumer (ADR-0013).

### 2. They are hooks, and that is load-bearing

Measured: with a closure in context instead, the React Compiler caches the provider — react-hook-form
mutates its `errors` object in place, so the closure's dependencies look unchanged — the provider
never re-renders and the error never reaches the field. Silently.

As a hook it is called inside each bound component, so every field subscribes for itself and
re-renders on its own account. It also subscribes per FIELD rather than per form, so one field's
error does not re-render the rest.

Being hooks, they obey the rules of hooks: called unconditionally, at the top of the component, once
per field.

### 3. A message list, not three shapes

`FieldMessages` is a list, and only a list. An earlier version took the three shapes the libraries
produce — a bare `string`, an array, an object keyed by the failing rule — and normalised them in the
design system. It cost more than it saved: three shapes meant three key policies for one rendered
list, so the SAME messages arriving as a string and as an array remounted differently.

Normalising is the adapter's job anyway — it is the one place that knows which library it is talking
to — and four of them now do it in a line each.

The list is rendered one message per element, never joined: joined, a screen reader reads
"Too short.Needs a digit." as a single run-on statement.

### 4. What is deliberately absent

`submitting`, `isDirty`, `isValid`, `submitCount` are not in the port, because nothing in the design
system would draw them. Submission state in particular: React 19 already reports it
(`useFormStatus()` for a `<form action>`), and outside that an app passes `isLoading` to `Button` in
one line.

A port member is owed by **every** adapter that implements it, so it has to be earned. Adding one
later is backward compatible, so waiting costs nothing.

---

## 📦 One package, five subpaths

The cost of an integration you do not use is **zero**: you never import its subpath, so it never
enters your bundle, and its peer dependency is declared **optional**, so nothing asks you to install
it. Separate packages would cost N releases, N changelogs and N versions to keep in step with
`@fmmenchi/ui`.

This is the shape `@hookform/resolvers` uses for its twenty-four integrations, and the reasoning is
the same.

---

## 🧪 One suite, four libraries

`apps/ui-ports-validation` runs the **same assertions** against the four library subpaths. That is
not a convenience — it is the package's claim to being correct: **if any of them needed its own
assertions, the port would be leaking.**

`./react-19` is tested separately, because its submission model is not a library's at all.

Four libraries as different as an uncontrolled one, a controlled one, a render-prop one and a
`FormData` one have now gone through the contract unmodified. That is the evidence that the port is
the right size — not the argument that it is.

---

## ➕ Adding a library

A new subpath, an optional peer, an entry in the build, a row in the reference table, and a row in
the shared suite — which is the part that matters: the same assertions have to hold for it.

Nothing in `@fmmenchi/ui` changes. The port is already the whole contract.

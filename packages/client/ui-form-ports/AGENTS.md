# AGENTS.md — @fmmenchi/ui-form-ports

The four form libraries bound to `@fmmenchi/ui`'s form port, plus the no-library case. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `client`,
type `ui`. Human documentation lives in [docs/](./docs/index.md) — keep it current with these rules,
never duplicate them into it.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ui-form-ports
pnpm nx build @fmmenchi/ui-form-ports
pnpm nx lint @fmmenchi/ui-form-ports
pnpm nx test @fmmenchi/ui-ports-validation   # THE suite — same assertions, four libraries
```

## Rules

- **The port is the whole contract, and it lives in `@fmmenchi/ui`** (`src/i18n/ports.types.ts`,
  `src/form/form-adapter.types.ts`). An adapter that needs the design system to change is an adapter
  that has found a gap in the port — raise it there, do not widen it from here.
- **Both members are HOOKS, and that is load-bearing.** Measured: with a closure in context instead,
  the React Compiler caches the provider — react-hook-form mutates its `errors` object in place, so
  the closure's dependencies look unchanged — the provider never re-renders and the error never
  reaches the field, silently. They also subscribe per FIELD, so one field's error does not re-render
  the rest.
- **One suite covers the four**, in `apps/ui-ports-validation`. This is the package's claim to being
  correct: **if a library needs its own assertions, the port is leaking.** `./react-19` is tested
  separately, because its submission model is not a library's at all. A new subpath is not done until
  it is a row in that suite.
- **The adapter normalises, the design system does not.** `FieldMessages` is a list and only a list.
  The three shapes the libraries produce (a bare string, an array, an object keyed by the failing
  rule) are flattened in the adapter — the one place that knows which library it is talking to.
- **The port writes the value, so the port undoes the coercion.** A DOM value is always a string; a
  `number` field would put `"31"` where the schema expects `31`, and the form then fails validation
  for ever with a message nothing can fix. Every adapter has its own lever (`valueAsNumber`, schema
  coercion for Conform). Assert the STORED type — `"seats":3`, not `"seats":"3"` — they are different
  assertions.
  - `date` is deliberately NOT converted: the value already is the canonical `YYYY-MM-DD` string, and
    a `Date` would be a decision about time zones that belongs to the schema.
  - There is no `'radio'` and there cannot be: a radio group is N controls sharing one name with a
    distinct value each, so the option's value cannot live in a map keyed by field NAME. Advertising
    it would ship a control that can never be selected.
- **Name checking is a module-level kit, never a provider.** A type does not travel through React
  context (a context's type is fixed where it is created) and does not descend the JSX tree; an
  import is what carries it across a file boundary. The kit takes the VALUES type and derives the
  path type inside the adapter, which is the only place that knows the syntax (`guests.0.name` vs
  `guests[0].name`). Called with no type argument it returns a message type, so the mistake is a
  compile error rather than a silent widening to `string`.
  - **Conform gets no kit, on purpose.** Its names come from the metadata object, so a typo is a
    property that does not exist. Its own `FieldName<Schema>` has an OPTIONAL brand, so it accepts
    any string — typing against it would add nothing. Measured, not assumed.
  - **The `types` map is checked the same way, in all four.** Each field factory takes the VALUES
    type — `createRhfField<T>({ types })` — and checks the map's keys as paths in its own syntax; a
    misspelt key was a field quietly bound as text, the exact failure the map exists to prevent.
    This includes Conform, and does not contradict the no-kit rule: `ConformPath` derives from the
    values type (bracket rows, `tasks[0].content`), never from Conform's accept-anything
    `FieldName`. Without the type argument the keys stay `string`. The compile-time proof is
    `src/field-type.spec.ts`, harnessed by `typecheck` — a `@ts-expect-error` that stops erroring
    fails the build.
- **No `rules` prop, ever.** Library-specific per-field rules are not portable, and the design system
  cannot type `RegisterOptions` without importing react-hook-form — such a prop would be `unknown`,
  and a typo in it would compile. The answers are a schema, a six-line wrapper in the consuming app,
  or a rules map in the app's own adapter. The portable rules are the native constraint attributes,
  which pass straight through (ADR-0013).
- **Adding a library:** a subpath, an OPTIONAL peer + `peerDependenciesMeta`, an entry in the build,
  a row in the reference table in `docs/reference/subpaths.md`, and a row in the shared suite.
  Nothing in `@fmmenchi/ui` changes.
- **Never add a member to the port because one library offers it.** `submitting`, `isDirty`,
  `isValid`, `submitCount` are absent because nothing in the design system would draw them, and a
  member is owed by EVERY adapter that implements it. Adding one later is backward compatible, so
  waiting costs nothing.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

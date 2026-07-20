# Component docs (agent)

Colocated `<name>.mdx`, standard format — fixed order, omit N/A:
`<Meta of>` → `# Name` + intent → `## Anatomy` (composite) → `## Props` (`<Controls of>`) →
`## Usage` (`### State` + when-to-use + `<Canvas of>`) → `## Accessibility` → `## Guidelines` (opt)
→ `## i18n` (if internal copy).

Every shown state is a real story (`<Canvas of>`, never ad-hoc JSX).

- **Intent = consumer-first, 3 moves**: (a) what/when in usage terms, (b) 2–4 key capabilities,
  (c) one-clause a11y/theming guarantee. NO implementation philosophy (native-first etc. → styling
  guide/ADR). Same voice in the component's JSDoc.
- **Props table is curated in story `argTypes`** (docgen can't read the polymorphic signature):
  union types, `table.defaultValue`, descriptions, and EVERY own prop must appear.
- A claimed a11y behavior (e.g. icon-only needs aria-label) must have the story that demonstrates
  it.

**Machine-enforced** by `src/test/component-docs.test.ts`: every component MUST have its colocated
`.mdx`, and the required sections (`<Meta of>` → `#` intent → `## Props`+`<Controls>` →
`## Usage`+`<Canvas>` → `## Accessibility`) must appear in order — missing doc or wrong order
fails the gate.

Spec + skeleton (human): Storybook → **Guidelines/Component docs**; `button.mdx` = reference.

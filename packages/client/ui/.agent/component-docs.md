# Component docs (agent)

Colocated `<name>.mdx`, standard format — fixed order, omit N/A:
`<Meta of>` → `# Name` + intent → `## Anatomy` (composite) → `## Props` (`<Controls of>`) →
`## Usage` (`### State` + when-to-use + `<Canvas of>`) → `## Accessibility` → `## Guidelines` (opt)
→ `## i18n` (if internal copy).

Every shown state is a real story (`<Canvas of>`, never ad-hoc JSX).

**Machine-enforced** by `src/test/component-docs.test.ts`: every component MUST have its colocated
`.mdx`, and the required sections (`<Meta of>` → `#` intent → `## Props`+`<Controls>` →
`## Usage`+`<Canvas>` → `## Accessibility`) must appear in order — missing doc or wrong order
fails the gate.

Spec + skeleton (human): Storybook → **Guidelines/Component docs**; `button.mdx` = reference.

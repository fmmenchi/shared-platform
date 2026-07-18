# Testing (agent)

Split by kind — never mix:

- **Component** `<name>.test.tsx`: rendered — semantics, interaction, a11y (axe, all variants ×
  light/dark), snapshot. Semantic queries only + `user-event`.
- **Logic** `<name>.test.ts` next to the code (e.g. `i18n/provider.test.tsx`): pure fns/hooks,
  tested generically — not through a component.

Vitest **browser mode** (Chromium). axe uses real token values → check contrast per variant in both
themes (dark preset loaded + surface painted in `test-setup.ts`).

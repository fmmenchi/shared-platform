# Testing (agent)

Split by kind — never mix:

- **Component** `<name>.test.tsx`: rendered — semantics, interaction, a11y (axe, all variants ×
  light/dark), snapshot. Semantic queries only + `user-event`.
- **Logic** `<name>.test.ts` next to the code (e.g. `i18n/provider.test.tsx`): pure fns/hooks,
  tested generically — not through a component.

Vitest **browser mode** (Chromium). axe uses real token values → check contrast per variant in both
themes (dark preset loaded + surface painted in `test-setup.ts`).

`pnpm nx test @fmmenchi/ui` runs **two Vitest projects**, configured in `vite.config.mts`:

- `@fmmenchi/ui` — the tests above, the ones you write. Setup: `src/test-setup.ts`.
- `storybook` — every `*.stories.tsx` rendered as a smoke test by `@storybook/addon-vitest`, with
  its `play` function if it has one. Setup: `.storybook/vitest.setup.ts`, which applies
  `preview.tsx`'s decorators so a story under test renders the way the Storybook UI renders it.
  The same run backs the test widget inside Storybook.

A story is NOT a substitute for a component test: it proves the story renders, not that the
semantics, the a11y and the interaction hold. Keep writing the `<name>.test.tsx`.

# Testing (agent)

Split by kind — never mix:

- **Component** `<name>.test.tsx`: rendered — semantics, interaction, a11y (axe, all variants ×
  light/dark), snapshot. Semantic queries only, and the events below.
- **Logic** `<name>.test.ts` next to the code (e.g. `i18n/provider.test.tsx`): pure fns/hooks,
  tested generically — not through a component.

Vitest **browser mode** (Chromium). axe uses real token values → check contrast per variant in both
themes (dark preset loaded + surface painted in `test-setup.ts`).

## Events: one engine

```ts
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';

await browser.click(screen.getByRole('button', { name: 'Save' }));
```

**Testing Library renders and queries. `vitest/browser` produces the events** — always, no exception,
under the alias `browser` so a call site says which it is. There is no `setup()`: the module is the
instance.

**Never `@testing-library/user-event`.** It dispatches events from JavaScript, so they are
`isTrusted: false` and invisible to everything the browser decides for itself — `:focus-visible`,
`<dialog>` light-dismiss, `<label>` forwarding, `<select>`'s popup, `hasTouch`. That is most of what a
native-first library is _for_, so a test on the synthetic engine can pass on behaviour the platform
would never produce ([ADR-0002 §6](../../../../apps/docusaurus/docs/adr/0002-ui-library-foundations-decision.md)).
Same method names either way (`click`, `type`, `tab`, `keyboard`, `hover`, `selectOptions`) and the
same `{Enter}` / `{Alt>}{ArrowUp}{/Alt}` key syntax, so there is nothing to relearn.

A Playwright-driven click also runs **actionability checks** — visible, stable, enabled, actually
hit-testable. A test that starts timing out after moving engines is usually telling you it was
clicking something a person could not: read it before you fix it.

## Projects

`pnpm nx test @fmmenchi/ui` runs **four Vitest projects**, configured in `vite.config.mts`:

- `@fmmenchi/ui` — the tests above, the ones you write. 414px. Setup: `src/test-setup.ts`.
- `touch` — `*.touch.test.tsx`, in a browser with `hasTouch` (so `(pointer: coarse)` is on and
  `(hover: hover)` is off) at a phone's viewport.
- `desktop` — `*.desktop.test.tsx`, at 1280×800, above the `tablet` breakpoint the default project
  sits below.
- `storybook` — every `*.stories.tsx` rendered as a smoke test by `@storybook/addon-vitest`, with
  its `play` function if it has one. Setup: `.storybook/vitest.setup.ts`, which applies
  `preview.tsx`'s decorators so a story under test renders the way the Storybook UI renders it.
  The same run backs the test widget inside Storybook.

A story is NOT a substitute for a component test: it proves the story renders, not that the
semantics, the a11y and the interaction hold. Keep writing the `<name>.test.tsx`.

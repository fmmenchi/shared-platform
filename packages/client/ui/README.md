# @fmmenchi/ui

Native-first, accessible, provider-agnostic React components (Tailwind + cva).

- **Scope / type:** `client` / `ui`
- **Workspace:** part of [shared-platform](../../../README.md) — released independently to GitHub Packages.
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).

## Usage

```tsx
import { UiProvider, Button, Dialog } from '@fmmenchi/ui';
import '@fmmenchi/tokens/styles/tailwind.css';

<UiProvider adapters={{ i18n: { locale: 'en' } }} theme="base">
  <Button variant="primary">Save</Button>
</UiProvider>;
```

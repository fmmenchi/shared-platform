# @fmmenchi/ui-router-ports

Implementations of `@fmmenchi/ui`'s routing ports — one subpath per router, so an app installs only
what it uses.

- **Scope / type:** `client` / `ui`
- **Workspace:** part of [shared-platform](../../../README.md) — released independently to GitHub Packages.
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).
- **Documentation:** [docs/](./docs/index.md) — guides, the subpath reference, and the concepts.

## Usage

```tsx
import { reactRouterAdapters } from '@fmmenchi/ui-router-ports/react-router';

<UiProvider adapters={{ i18n, ...reactRouterAdapters }}>
  <NavLink href="/settings">Settings</NavLink>
</UiProvider>;
```

Two subpaths: `./react-router` (Remix included) and `./tanstack`. Each router is an **optional**
peer. Next needs no adapter — `next/link` already takes `href`.

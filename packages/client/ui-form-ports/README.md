# @fmmenchi/ui-form-ports

Implementations of `@fmmenchi/ui`'s form ports — one subpath per form library, so an app installs
only what it uses.

- **Scope / type:** `client` / `ui`
- **Workspace:** part of [shared-platform](../../../README.md) — released independently to GitHub Packages.
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).
- **Documentation:** [docs/](./docs/index.md) — guides, the subpath reference, and the concepts.

## Usage

```tsx
import {
  useRhfField,
  useRhfErrors,
} from '@fmmenchi/ui-form-ports/react-hook-form';

<UiProvider
  adapters={{ i18n, form: { field: useRhfField, errors: useRhfErrors } }}
>
  <FormInput name="email" label="Email" />
</UiProvider>;
```

Five subpaths: `./react-hook-form`, `./formik`, `./tanstack`, `./conform` and `./react-19`. Each
library is an **optional** peer, so installing this package asks nothing of you beyond the one you
chose.

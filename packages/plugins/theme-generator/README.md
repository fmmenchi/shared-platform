# @fmmenchi/theme-generator

Nx plugin for design-system themes: scaffold a complete brand theme from the installed
`@fmmenchi/tokens` contract and gate it in CI.

```bash
pnpm add -D @fmmenchi/theme-generator
pnpm nx g @fmmenchi/theme-generator:theme acme --project=web   # scaffold + wire validation
pnpm nx run web:validate-themes                                # the CI gate
```

- **Scope / type:** `plugins` / `plugin`
- **Workspace:** part of [shared-platform](../../../README.md) — released independently to GitHub Packages.
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).

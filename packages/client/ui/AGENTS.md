# AGENTS.md — @fmmenchi/ui

Native-first, accessible, provider-agnostic React components (CSS Modules + Tailwind + cva). Read
the workspace [../../../AGENTS.md](../../../AGENTS.md) and the UI doctrine
[../../../.agents/doc/ui.md](../../../.agents/doc/ui.md) first. Scope `client`, type `ui`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ui
pnpm nx build @fmmenchi/ui
pnpm nx lint @fmmenchi/ui
pnpm nx test @fmmenchi/ui         # Vitest browser mode (Chromium)
pnpm nx storybook @fmmenchi/ui    # Storybook + MCP at :6006/mcp
```

## Rules — open the `.agents/doc/` spoke for your topic

| Spoke                                             | When                                          |
| ------------------------------------------------- | --------------------------------------------- |
| [styling](./.agents/doc/styling.md)               | CSS Modules, `@apply`, cva, precompiled CSS   |
| [primitives](./.agents/doc/primitives.md)         | `as` polymorphism, mergeRefs, useControlled   |
| [testing](./.agents/doc/testing.md)               | component vs logic tests, axe                 |
| [i18n](./.agents/doc/i18n.md)                     | colocated messages, direction/RTL             |
| [component-docs](./.agents/doc/component-docs.md) | authoring a component's `.mdx`                |
| [build](./.agents/doc/build.md)                   | React Compiler, tree-shaking, subpath exports |

Otherwise: native-first (native elements + light a11y; no headless behavior lib); browser-only
(DOM lib in `tsconfig.lib.json`).

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

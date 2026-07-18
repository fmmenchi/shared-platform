# AGENTS.md — @fmmenchi/ui

Native-first, accessible, provider-agnostic React components (CSS Modules + Tailwind + cva). Read
the workspace [../../../AGENTS.md](../../../AGENTS.md) and the UI doctrine
[../../../.agent/ui.md](../../../.agent/ui.md) first. Scope `client`, type `ui`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ui
pnpm nx build @fmmenchi/ui
pnpm nx lint @fmmenchi/ui
pnpm nx test @fmmenchi/ui         # Vitest browser mode (Chromium)
pnpm nx storybook @fmmenchi/ui    # Storybook + MCP at :6006/mcp
```

## Rules — open the `.agent/` spoke for your topic

| Spoke                                        | When                                        |
| -------------------------------------------- | ------------------------------------------- |
| [styling](./.agent/styling.md)               | CSS Modules, `@apply`, cva, precompiled CSS |
| [primitives](./.agent/primitives.md)         | `as` polymorphism, mergeRefs, useControlled |
| [testing](./.agent/testing.md)               | component vs logic tests, axe               |
| [i18n](./.agent/i18n.md)                     | colocated messages, direction/RTL           |
| [component-docs](./.agent/component-docs.md) | authoring a component's `.mdx`              |

Otherwise: native-first (native elements + light a11y; no headless behavior lib); browser-only
(DOM lib in `tsconfig.lib.json`).

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

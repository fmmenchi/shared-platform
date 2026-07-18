# AGENTS.md — @fmmenchi/ui-ports

Injection-port contracts the app implements to keep the UI provider-agnostic. Part of `shared-platform` — the workspace contract is
[../../../AGENTS.md](../../../AGENTS.md); read it first. Scope `client`, type `util`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ui-ports
pnpm nx build @fmmenchi/ui-ports
pnpm nx lint @fmmenchi/ui-ports
```

## Specifics

- Interfaces only, zero runtime (I18n, LinkComponent, IconRenderer, PortalContainer, UiAdapters).
- `direction` is derived from the locale, never a port field.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.

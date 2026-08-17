---
title: Generators
sidebar_label: Generators
sidebar_position: 2
---

# Generators

`@fmmenchi/nx-trivy` ships **one generator**, `init` — the one command that makes the plugin do
anything in a workspace that has just installed it. Everything else it provides is inferred.

---

## `init`

```bash
pnpm nx add @fmmenchi/nx-trivy   # installs, then runs this generator
pnpm nx g @fmmenchi/nx-trivy:init   # or run it by hand, any time
```

### What it does

1. **Registers the plugin in `nx.json`** (`plugins: ["@fmmenchi/nx-trivy"]`). This is the step that
   matters: target inference only runs for registered plugins, so without it the plugin is installed
   and inert — and registration is what puts the four scan targets on your root project.
2. **Seeds a `.trivyignore.yaml`** at the workspace root — the scan root, where Trivy auto-detects it
   under both runners. It ships with an empty `vulnerabilities: []` and the policy comment that keeps
   it from filling up (fix first, suppress only with a `statement` and an `expired_at`).

### Options

| Option       | Type      | Default | What it does                                   |
| ------------ | --------- | ------- | ---------------------------------------------- |
| `skipFormat` | `boolean` | `false` | Skip formatting the files the generator wrote. |

### Idempotent

Re-running it changes nothing: an existing registration is left alone (in either accepted form — the
bare string or `{ plugin, options }`), and an existing `.trivyignore.yaml` is **never** overwritten,
so your suppressions cannot be lost by re-running `init`.

---

## Why the name `init` is fixed

`nx add <plugin>` invokes `<plugin>:init` by name, and **silently no-ops when no generator by that
name exists** — Nx catches the lookup failure and moves on
(`nx/src/command-line/init/configure-plugins.ts`). A generator called `trivy-init` would therefore
leave `nx add @fmmenchi/nx-trivy` installing the package and doing nothing at all, with no error to
explain it. The plugin name already carries the "trivy".

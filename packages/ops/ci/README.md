# @fmmenchi/ci

CI helper scripts for an Nx release monorepo with **independent, per-package** versioning.

## `affected-releasable`

Prints the comma-separated **releasable** projects (non-private packages under `packages/*/*`) that
Nx marks **affected** between two refs — the set to pass to `nx release --projects=<…>`.

```bash
BASE=<before-sha> HEAD=<sha> node dist/affected-releasable.js
# → @fmmenchi/tokens,@fmmenchi/ui
```

`nx affected` is **input-aware** (root files like `AGENTS.md` or workflows aren't project inputs, so
they don't cascade to every project) and **dependency-aware** (a dependent of a changed project is
affected too). This sidesteps `nx release`'s built-in "root-file change applies to ALL projects"
cascade ([nx #34542](https://github.com/nrwl/nx/issues/34542)), so a docs-only or config-only push
releases nothing.

The **caller** resolves `BASE` (the CI workflow, from the push); with no `BASE` the script falls back
to the full project list.

## Why a package

The reusable logic lives here (tested, importable); the CI-only orchestration — resolving the base
ref, looping the cut tags — stays in `.github/workflows/ci.yml`. Notifications are **not** here: the
release job dogfoods the [`@fmmenchi/nx-notify`](../../plugins/notify) plugin.

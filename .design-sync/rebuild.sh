#!/usr/bin/env bash
# Full converter cycle: build the design-export artifact, convert, validate.
# Kept here (not inlined) so every rebuild in this campaign is the same command.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
echo "== build-design @fmmenchi/ui"
pnpm nx build-design @fmmenchi/ui > .design-sync/ui-build.log 2>&1
echo "== converter"
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules packages/client/ui/node_modules \
  --entry packages/client/ui/dist-design/index.js \
  --out ./ds-bundle > .design-sync/build.log 2>&1
echo "== validate"
node .ds-sync/package-validate.mjs ./ds-bundle > .design-sync/validate.log 2>&1
echo "ALL OK"

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
SKILL="/private/tmp/claude-501/bundled-skills/2.1.238/0f4528dcc52b0a40f258b465bd39dfaf/design-sync"
cd "$ROOT"

# gitignore additions (idempotent)
if ! grep -q "^# design-sync$" .gitignore 2>/dev/null; then
  cat >> .gitignore <<'IGN'

# design-sync
.design-sync/sb-reference/
.design-sync/learnings/
.design-sync/.cache/
.design-sync/node_modules
.ds-sync/
ds-bundle/
IGN
fi

mkdir -p .ds-sync
cp -r "$SKILL"/package-build.mjs "$SKILL"/package-validate.mjs "$SKILL"/resync.mjs \
      "$SKILL"/lib "$SKILL"/storybook "$SKILL"/non-storybook .ds-sync/
echo '{"name":"ds-sync-deps","private":true}' > .ds-sync/package.json
cd .ds-sync
npm i esbuild ts-morph @types/react playwright --no-audit --no-fund 2>&1 | tail -3
npx playwright install chromium 2>&1 | tail -3
echo "STAGED OK"

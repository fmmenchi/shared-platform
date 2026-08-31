#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/packages/client/ui"
npx storybook build -c .storybook -o "$ROOT/.design-sync/sb-reference"

#!/usr/bin/env bash
# Every token, component and prop named in conventions.md must exist in the BUILT artifacts.
# A header that names something absent is worse than no header: the design agent trusts it and
# ships silently unstyled output.
set -u
cd "$(git rev-parse --show-toplevel)"
fail=0

echo "== tokens (vars.css)"
for t in --fm-color-background --fm-color-foreground --fm-color-border --fm-color-card \
         --fm-color-card-foreground --fm-color-accent --fm-color-accent-hover \
         --fm-color-accent-active --fm-color-accent-subtle --fm-color-accent-disabled \
         --fm-color-accent-foreground --fm-color-destructive --fm-color-error \
         --fm-space-inset-s --fm-space-inset-m --fm-space-inset-l \
         --fm-space-stack-s --fm-space-stack-m --fm-space-stack-l \
         --fm-space-inline-s --fm-space-inline-m --fm-space-inline-l \
         --fm-space-internal-xs --fm-space-internal-s --fm-space-internal-m \
         --fm-text-xs --fm-text-base --fm-text-4xl --fm-leading-base \
         --fm-font-sans --fm-font-heading --fm-font-mono --fm-font-weight-medium \
         --fm-radius-sm --fm-radius-md --fm-radius-lg --fm-radius-xl; do
  if ! grep -q -- "$t:" ds-bundle/tokens/vars.css; then echo "  MISSING $t"; fail=1; fi
done
[ $fail -eq 0 ] && echo "  all present"

echo "== components (bundle + component dirs)"
for c in Button Heading; do
  [ -d "ds-bundle/components/"*"/$c" ] || { echo "  MISSING dir $c"; fail=1; }
done
for e in UiProvider Button Heading; do
  grep -q "$e" ds-bundle/_ds_bundle.js || { echo "  MISSING export $e"; fail=1; }
done
[ $fail -eq 0 ] && echo "  all present"

echo "== props named in the header"
grep -q '"primary" | "accent" | "destructive" | "secondary" | "ghost"' ds-bundle/components/buttons/Button/Button.d.ts || { echo "  Button.variant values differ"; fail=1; }
grep -q '"sm" | "md" | "lg"' ds-bundle/components/buttons/Button/Button.d.ts || { echo "  Button.size values differ"; fail=1; }
grep -q "level: 1 | 2 | 3 | 4 | 5 | 6" ds-bundle/components/typography/Heading/Heading.d.ts || { echo "  Heading.level differs"; fail=1; }
[ $fail -eq 0 ] && echo "  all present"

echo "== baseline claims"
grep -q "box-sizing: border-box" ds-bundle/tokens/baseline.css || { echo "  baseline box-sizing missing"; fail=1; }
grep -q "font-family: var(--fm-font-sans)" ds-bundle/tokens/baseline.css || { echo "  baseline body font missing"; fail=1; }
grep -q "data-theme='dark'\|data-theme=\"dark\"" ds-bundle/tokens/presets/dark.css || { echo "  dark selector differs"; fail=1; }
[ $fail -eq 0 ] && echo "  all present"

echo
[ $fail -eq 0 ] && echo "HEADER VERIFIED" || echo "HEADER HAS UNVERIFIED NAMES"
exit $fail

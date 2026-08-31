/**
 * Generates the Storybook MANAGER (chrome) theme from the design-system tokens —
 * so the sidebar/toolbar track @fmmenchi/tokens with NO hand-copied values.
 *
 * Storybook's `create()` runs in the manager app, outside the preview iframe, and
 * cannot read `var(--fm-*)`; it wants literal colours. So instead of duplicating
 * values we DERIVE them here: read the token CSS (`vars.css` light + `presets/dark.css`
 * dark), convert each `oklch(...)` to hex with culori (Storybook/polished can't parse
 * oklch), and emit `manager-theme.generated.ts` (git-ignored, rebuilt every run) plus a
 * `static/favicon.svg`. The generated logo/favicon use the token primary + foreground,
 * so the brand tracks the DS too.
 *
 * Wired as the `codegen` target that `build-storybook`/`storybook` depend on.
 */
import { formatHex } from 'culori';
// The CONTRACT is `@fmmenchi/theme` (private, source-only); the VALUES are
// `@fmmenchi/tokens/styles/*`. This script needs both: the resolver to follow a
// role down to the colour a browser would paint, and the stylesheets to read.
import { resolveCssVar } from '@fmmenchi/theme';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Resolve the token CSS from the installed package (workspace-linked).
const tokenCss = (rel) =>
  fileURLToPath(import.meta.resolve(`@fmmenchi/tokens/styles/${rel}`));

/**
 * Extract `--fm-color-<role>` → the colour a browser would paint.
 *
 * Since ADR-0032 a role points at a palette step and the step is a relative
 * colour, so the raw value is `var(--fm-palette-primary-700)` — which culori
 * cannot turn into a hex, and this script threw on it. It resolves through the
 * tokens package's own resolver rather than a second implementation: the value
 * this chrome shows and the value the gate checks have to be the same value.
 *
 * The declaration map is built from EVERY `--fm-*` in the file, not just the
 * roles, because the primitives are what the roles resolve through.
 */
function readColorRoles(cssPath, inherited = new Map()) {
  const css = readFileSync(cssPath, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
  const declared = new Map(inherited);
  for (const m of css.matchAll(/(--fm-[a-z0-9-]+):\s*([^;]+);/g)) {
    declared.set(m[1], m[2].trim());
  }

  const map = {};
  for (const [name, value] of declared) {
    const role = /^--fm-color-([a-z0-9-]+)$/.exec(name);
    if (role) map[role[1]] = resolveCssVar(value, declared);
  }
  return { roles: map, declared };
}

const hex = (value) => {
  const out = formatHex(value);
  if (!out) throw new Error(`Cannot convert token colour to hex: "${value}"`);
  return out;
};

// The dark preset INHERITS: it re-pitches the bases and remaps the roles, but
// the ramp steps between them are declared once in vars.css. Reading it alone
// dead-ends at a palette step the file does not contain.
const base = readColorRoles(tokenCss('vars.css'));
const light = base.roles;
const dark = readColorRoles(tokenCss('presets/dark.css'), base.declared).roles;

// Storybook ThemeVars fields ← semantic token roles. One place, both themes.
const roleMap = {
  colorPrimary: 'primary',
  colorSecondary: 'primary',
  appBg: 'background',
  appContentBg: 'card',
  appPreviewBg: 'background',
  appBorderColor: 'border',
  textColor: 'foreground',
  textMutedColor: 'muted-foreground',
  barBg: 'card',
  barTextColor: 'muted-foreground',
  barSelectedColor: 'primary',
  barHoverColor: 'primary',
  inputBg: 'card',
  inputBorder: 'border',
  inputTextColor: 'foreground',
};

/** Build one theme's `{field: hex}` + a brand logo data-uri from the token roles. */
function themeFor(base, roles) {
  const need = (role) => {
    if (!roles[role])
      throw new Error(`Token role "${role}" missing in ${base} preset`);
    return hex(roles[role]);
  };
  const vars = { base };
  for (const [field, role] of Object.entries(roleMap)) vars[field] = need(role);

  // Brand logo: primary square + "@fmmenchi/ui" wordmark in the theme's foreground.
  const primary = need('primary');
  const onPrimary = need('primary-foreground');
  const fg = need('foreground');
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 48" width="210" height="48"><rect x="4" y="8" width="32" height="32" rx="8" fill="${primary}"/><text x="20" y="31" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="700" font-size="22" text-anchor="middle" fill="${onPrimary}">F</text><text x="46" y="30" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="600" font-size="17" fill="${fg}">@fmmenchi/ui</text></svg>`;
  vars.brandTitle = '@fmmenchi/ui';
  vars.brandTarget = '_self';
  vars.brandImage = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`;
  return vars;
}

const themes = {
  light: themeFor('light', light),
  dark: themeFor('dark', dark),
};

const banner =
  '// GENERATED by .storybook/generate-manager-theme.mjs from @fmmenchi/tokens — do not edit.\n' +
  '// Rebuilt by the `codegen` target; git-ignored.\n';
writeFileSync(
  join(here, 'manager-theme.generated.ts'),
  `${banner}import type { ThemeVars } from 'storybook/theming';\n\n` +
    `export const light: ThemeVars = ${JSON.stringify(themes.light, null, 2)} as ThemeVars;\n\n` +
    `export const dark: ThemeVars = ${JSON.stringify(themes.dark, null, 2)} as ThemeVars;\n`,
  'utf-8',
);

// Favicon: primary square + white F (a single static asset; brand, not palette).
const staticDir = join(here, 'static');
if (!existsSync(staticDir)) mkdirSync(staticDir, { recursive: true });
const faviconPrimary = hex(light['primary']);
writeFileSync(
  join(staticDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${faviconPrimary}"/><text x="32" y="46" font-family="ui-monospace,monospace" font-weight="700" font-size="42" text-anchor="middle" fill="#fff">F</text></svg>\n`,
  'utf-8',
);

console.log(
  'Generated Storybook manager theme (light+dark) + favicon from @fmmenchi/tokens.',
);

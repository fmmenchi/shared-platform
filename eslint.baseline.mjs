import baselineJs from 'eslint-plugin-baseline-js';
import css from '@eslint/css';

/**
 * Baseline (Widely available) enforcement for browser-facing `client` code.
 *
 * The platform targets Web Platform **Baseline: Widely available** (features
 * supported across the core browser set for 30+ months). These blocks fail the
 * lint when code uses a JS/Web-API or CSS feature that is not yet Widely
 * available — e.g. `Intl.Locale.prototype.getTextInfo`. Imported only by
 * `scope:client` packages (server/shared code targets Node, not browsers).
 *
 * @see ./apps/docusaurus/docs/styling.md#browser-support-baseline
 */
export default [
  // JS syntax, builtins and Web APIs (web-features "javascript" group).
  // NB: the plugin's `recommended` preset only targets `.js/.jsx` — our source
  // is TypeScript, so we apply the rule to `.ts/.tsx` explicitly (with the same
  // options the preset uses) or it silently never runs.
  // Only the SHIPPABLE browser source under `src/` — not Node tooling
  // (eslint/vite configs use top-level await etc.) and not dev-only test/story
  // files, whose runtime never reaches a consumer's browser.
  { plugins: { 'baseline-js': baselineJs } },
  {
    files: ['**/src/**/*.{ts,tsx,js,jsx}'],
    ignores: [
      '**/*.{test,spec,stories}.{ts,tsx,js,jsx}',
      '**/test/**',
      '**/test-setup.*',
    ],
    rules: {
      'baseline-js/use-baseline': [
        'error',
        {
          available: 'widely',
          includeWebApis: { preset: 'auto' },
          includeJsBuiltins: { preset: 'auto' },
        },
      ],
    },
  },

  // CSS baseline on the PLAIN stylesheets we ship (token vars + presets).
  // Tailwind-authored CSS (`*.module.css`, `tokens/styles/tailwind.css`) can't
  // be source-linted — `@eslint/css`'s parser rejects `@apply`/`@reference` —
  // so its Baseline is governed at build time by the browserslist target (the
  // compiler emits CSS for that target), not here.
  {
    files: ['**/*.css'],
    ignores: ['**/*.module.css', '**/styles/tailwind.css'],
    plugins: { css },
    language: 'css/css',
    rules: {
      'css/use-baseline': ['error', { available: 'widely' }],
    },
  },
];

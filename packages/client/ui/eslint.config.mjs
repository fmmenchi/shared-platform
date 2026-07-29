import nx from '@nx/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import baseConfig from '../../../eslint.config.mjs';
import baselineConfig from '../../../eslint.baseline.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  ...baselineConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // React Compiler / Rules-of-React lints (eslint-plugin-react-hooks v7).
    // The `react-hooks` plugin is already registered by nx's flat/react — apply
    // only the rule set so the compiler-powered diagnostics run.
    rules: reactHooks.configs['recommended-latest'].rules,
  },
  {
    // Component-to-component boundary. Nx tags police the boundaries BETWEEN
    // packages, but nothing stops one component folder reaching into another's
    // internals — and once a control imports a sibling's component file, that
    // sibling quietly becomes a dependency hub (MUI's FormControl is the cautionary
    // example). A component family exposes exactly one thing to its siblings: its
    // `*.context.js`, the wiring contract a control reads to become field-aware.
    // Everything else shared lives in `primitives/` (React-aware) or `util/` (pure).
    // Tests and stories are exempt: composing two families is what they are for.
    files: ['src/components/**/*.ts', 'src/components/**/*.tsx'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.stories.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Gitignore semantics, last match wins: `../*/*` also swallows
              // `../../util/x.js` (it matches the `../../util` prefix), so the
              // two-levels-up escape — primitives/, util/, i18n/ — is negated back
              // in, and so is a sibling's context.
              group: ['../*/*', '!../../**', '!../*/*.context.js'],
              message:
                "Another component's internals: import only its `*.context.js`, or move what you need to primitives/ (React) or util/ (pure).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];

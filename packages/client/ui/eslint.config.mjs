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
    ignores: ['**/out-tsc'],
  },
];

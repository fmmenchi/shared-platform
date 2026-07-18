import nx from '@nx/eslint-plugin';
import baseConfig from '../../../eslint.config.mjs';
import baselineConfig from '../../../eslint.baseline.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  ...baselineConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    ignores: ['**/out-tsc'],
  },
];

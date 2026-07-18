import baseConfig from '../../../eslint.config.mjs';
import baselineConfig from '../../../eslint.baseline.mjs';

export default [
  ...baseConfig,
  ...baselineConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.mts',
          ],
          // Test-only tooling — never shipped (culori IS shipped, via ./validate).
          ignoredDependencies: ['vitest'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];

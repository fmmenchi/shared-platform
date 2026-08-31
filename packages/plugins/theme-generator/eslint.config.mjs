import baseConfig from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.mts',
            '{projectRoot}/vite.config.mts',
          ],
          /*
           * THE RULE READS SOURCE IMPORTS; BUNDLING CHANGES WHAT RUNS.
           *
           * `vitest` and `vite` are build- and test-time only. The other three are
           * the interesting case: this plugin inlines `@fmmenchi/theme` (private,
           * never published — see `vite.config.mts`), and that package's own
           * dependencies come with it. So the emitted bundle DOES require `culori`
           * and `apca-w3`, and they are declared in `dependencies` on purpose —
           * while no file in `src/` imports them, which is all this rule can see.
           *
           * `@fmmenchi/theme` is the mirror image: `src/` imports it, so the rule
           * wants it in `dependencies`, and it must NOT be there — a consumer
           * cannot resolve a package that is never published, and the bundle has
           * already inlined it. It stays a devDependency.
           */
          ignoredDependencies: [
            'vitest',
            'vite',
            '@fmmenchi/theme',
            'culori',
            'apca-w3',
            'tslib',
          ],
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
  {
    files: ['**/package.json', '**/generators.json', '**/executors.json'],
    rules: {
      '@nx/nx-plugin-checks': 'error',
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];

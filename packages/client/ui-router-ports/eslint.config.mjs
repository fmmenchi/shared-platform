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
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
          // A FALSE POSITIVE we cannot answer from here, so it is scoped and
          // written down rather than worked around by loosening the range.
          //
          // The workspace contains TWO react-routers: 7.18.2, which this
          // package is built against and declares as a devDependency and an
          // optional peer, and 5.3.4, which `@docusaurus/core` pulls in for the
          // docs site. Nx's project graph keys an external node by package
          // NAME, so `npm:react-router` holds one of the two — and the rule
          // compared 5.3.4 against this package's `^7.0.0` and failed.
          //
          // Nothing here is wrong: the peer range is right, the devDependency
          // is right, and the version this package actually resolves is 7.18.2
          // (verified in its own node_modules). Loosening the range to include
          // v5 would be a lie — the port is written against the v7 API — and
          // forcing v7 workspace-wide with an override would break the docs
          // site, which is a v5 consumer by design.
          //
          // RETIRE THIS when the workspace stops carrying two majors of
          // react-router, i.e. when the docs site no longer depends on v5.
          ignoredDependencies: ['react-router'],
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

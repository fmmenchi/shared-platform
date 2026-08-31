import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      // The design-system EXPORT build (`nx build-design`) — same generated
      // output as `dist`, in its own directory so it can never overwrite the
      // artifact that gets published. Linting it reports thousands of
      // prefer-const violations against a bundler's own output.
      '**/dist-design',
      '**/out-tsc',
      '**/storybook-static',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/build',
      '**/.react-router',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            // A STYLESHEET IS NOT A MODULE DEPENDENCY. `@fmmenchi/tokens` ships
            // CSS and nothing else — no `dist`, no build target — since the
            // contract moved to `@fmmenchi/theme`. That makes it "non-buildable"
            // to `enforceBuildableLibDependency`, which then refuses every
            // `import '@fmmenchi/tokens/styles/*.css'` from a buildable project.
            // The rule guards against a published `dist` requiring a package
            // that resolves to nothing; a CSS asset has no such failure mode —
            // the bundler inlines the file or the import breaks loudly at build
            // time. Scoped to the styles subpath so a CODE import of tokens,
            // which would be the real mistake, still errors.
            '^@fmmenchi/tokens/styles/.*$',
          ],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:client',
              onlyDependOnLibsWithTags: ['scope:client', 'scope:shared'],
            },
            {
              sourceTag: 'scope:server',
              onlyDependOnLibsWithTags: ['scope:server', 'scope:shared'],
            },
            {
              sourceTag: 'scope:plugins',
              onlyDependOnLibsWithTags: ['scope:plugins', 'scope:shared'],
            },
            {
              sourceTag: 'scope:tools',
              onlyDependOnLibsWithTags: ['scope:tools', 'scope:shared'],
            },
            {
              // Ops: CI/CD & release automation (the gh-actions reusable toolkit,
              // the @fmmenchi/ci release helper). Nothing depends on it.
              sourceTag: 'scope:ops',
              onlyDependOnLibsWithTags: ['scope:ops', 'scope:shared'],
            },
            {
              // Apps are the top of the graph (the docs site); nothing depends on
              // them and they may consume any layer they need.
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:app',
                'scope:client',
                'scope:server',
                'scope:shared',
                'scope:plugins',
                'scope:tools',
              ],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  {
    // "No utility strings in JSX" (ui doctrine) made machine-enforced: a
    // Tailwind ARBITRARY utility in a string literal (`bg-[#123]`, `w-[37px]`)
    // bypasses the token contract AND would not survive precompilation.
    // The @apply side is enforced by Stylelint (fmmenchi/no-tailwind-arbitrary).
    files: ['packages/client/ui/src/**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/*.stories.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/[a-zA-Z-]+-\\[[^\\]]*\\]/]',
          message:
            'Arbitrary Tailwind value in className — style through the component module.css with semantic tokens (see .agents/doc/styling.md).',
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    // Override or add rules here
    rules: {},
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];

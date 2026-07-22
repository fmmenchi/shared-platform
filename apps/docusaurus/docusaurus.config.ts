import type { Config } from '@docusaurus/types';

/**
 * Single-instance docs site over the co-located `docs/`. Workspace docs (ADRs,
 * architecture, styling…) are edited here directly; per-package docs live in each
 * package's `docs/` folder and are assembled under `docs/{libraries,plugins}/` by the
 * `@fmmenchi/nx-docusaurus` sync-docs executor (build/serve depend on it).
 */
const config: Config = {
  title: 'shared-platform',
  url: 'https://fmmenchi.github.io',
  baseUrl: '/shared-platform/',
  // Every in-site link must resolve — a broken cross-package link fails the build.
  onBrokenLinks: 'throw',
  markdown: {
    // .md stays CommonMark (docs prose with <placeholders> and {braces} must
    // not be parsed as JSX); .mdx opts into MDX explicitly.
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: 'warn' },
  },
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'shared-platform',
      items: [
        {
          // Deployed alongside the site by the Docs workflow (build/storybook).
          href: 'https://fmmenchi.github.io/shared-platform/storybook/',
          label: 'Storybook',
          position: 'right',
        },
        {
          href: 'https://github.com/fmmenchi/shared-platform',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
  },
};

export default config;

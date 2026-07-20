import type { Config } from '@docusaurus/types';

/**
 * Single-instance docs site reading the repo's human docs DIRECTLY from
 * `doc/` — no copying, no sync, no aggregation: the tree you see is
 * the tree you edit, and the dev server watches the source natively.
 */
const config: Config = {
  title: 'shared-platform',
  url: 'https://fmmenchi.github.io',
  baseUrl: '/shared-platform/',
  // Repo-relative links that point outside the docs tree (AGENTS.md, package
  // sources…) are useful in the repository — warn, don't fail.
  onBrokenLinks: 'warn',
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
          path: '../../../doc',
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

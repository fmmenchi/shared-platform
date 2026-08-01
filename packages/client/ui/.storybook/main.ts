import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import remarkGfm from 'remark-gfm';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // No first-run telemetry prompt: it has no TTY in agent/CI runs.
  core: { disableTelemetry: true },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  // `static/favicon.svg` is generated from the tokens by the `codegen` target.
  staticDirs: ['./static'],
  managerHead: (head) =>
    `${head}\n<link rel="icon" type="image/svg+xml" href="./favicon.svg" />`,
  addons: [
    {
      // MDX 3 does not enable GFM, so every markdown TABLE in the docs — four
      // pages of them — rendered as literal pipes until this was added.
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } },
      },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-mcp',
    // Runs the stories as tests, from Storybook's own UI and from `nx test`.
    // The Vitest side is wired in `vite.config.mts` — see the note there.
    '@storybook/addon-vitest',
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {
      builder: {
        viteConfigPath: 'vite.config.mts',
      },
    },
  },
};

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

export default config;

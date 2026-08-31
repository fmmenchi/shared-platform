/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/theme-builder',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  // `tailwindcss()` is required, not optional: `@fmmenchi/tokens/styles/tailwind.css`
  // opens with `@import 'tailwindcss'`, and without the plugin PostCSS looks for a
  // FILE by that name and fails with an ENOENT that names the app rather than the
  // import. The bridge itself defines no values — it maps token names onto Tailwind's
  // theme — so this is what makes the tokens reachable as utilities.
  plugins: [tailwindcss(), !process.env.VITEST && reactRouter()],
  /*
   * OUR OWN PACKAGES ARE NOT EXTERNAL, and the dev server does not start without
   * this. Vite externalises anything under `node_modules` for SSR — a workspace
   * link is under `node_modules` — and then loads it with a native import. One of
   * ours (or something it pulls) resolves to CJS, so the SSR graph ends up calling
   * `require('react')` in a module scope that has no `require`, and every route
   * answers 500 while `nx build` stays green: the build bundles them, dev does not.
   */
  ssr: {
    noExternal: [/^@fmmenchi\//],
  },
  // React must be ONE copy across the app, the design system and anything the
  // theme package pulls in — two copies of hooks is a class of bug that reports
  // itself as "invalid hook call" from a component that is fine.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: '@fmmenchi/theme-builder',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));

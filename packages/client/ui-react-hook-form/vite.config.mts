/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import dts from 'vite-plugin-dts';
import * as path from 'path';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/packages/client/ui-react-hook-form',
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
    }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  // Configuration for building your library.
  // See: https://vite.dev/guide/build.html#library-mode
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: '@fmmenchi/ui-react-hook-form',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es' as const],
    },
    rolldownOptions: {
      // External packages that should not be bundled into your library.
      external: [],
    },
  },
  // Resolve workspace packages to their SOURCE, as tsconfig.base.json's
  // customConditions does for TypeScript — otherwise the test imports
  // @fmmenchi/ui's built bundle, which externalises react through `require`.
  resolve: { conditions: ['@fmmenchi/source', 'import', 'module', 'default'] },
  test: {
    name: '@fmmenchi/ui-react-hook-form',
    watch: false,
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Real Chromium, like @fmmenchi/ui — these components render DS components,
    // so testing them anywhere else would prove something other than the thing.
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));

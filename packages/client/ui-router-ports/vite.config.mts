/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/packages/client/ui-router-ports',
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: {
        'react-router': 'src/react-router/index.ts',
        tanstack: 'src/tanstack/index.ts',
      },
      name: '@fmmenchi/ui-router-ports',
      // one file per subpath, named after its entry key
      fileName: (_format, name) => `${name}.js`,
      formats: ['es' as const],
    },
    rolldownOptions: {
      // Every router stays EXTERNAL. Bundling one would put it in the graph of
      // an app that installed the other, which is the whole point of the
      // optional peer dependency.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-router',
        '@tanstack/react-router',
        '@fmmenchi/ui',
      ],
    },
  },
}));

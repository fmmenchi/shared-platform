/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import { playwright } from '@vitest/browser-playwright';
import * as path from 'path';
import * as fs from 'fs';

// Emit a combined `style.css` (all component CSS concatenated) next to the
// per-component files, so a consumer can import everything with one stylesheet
// (`@fmmenchi/ui/style.css`) OR granularly (`@fmmenchi/ui/button/style.css`).
function combinedCssPlugin() {
  return {
    name: 'fm-combined-css',
    writeBundle(options: { dir?: string }, bundle: Record<string, unknown>) {
      const outDir = options.dir ?? 'dist';
      const css = Object.values(bundle)
        .filter(
          (c): c is { type: string; fileName: string; source: string } =>
            typeof c === 'object' &&
            c !== null &&
            (c as { type?: string }).type === 'asset' &&
            (c as { fileName?: string }).fileName?.endsWith('.css') === true &&
            (c as { fileName?: string }).fileName !== 'style.css',
        )
        .map((c) => c.source)
        .join('\n');
      if (css) fs.writeFileSync(path.join(outDir, 'style.css'), css);
    },
  };
}

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/packages/client/ui',
  plugins: [
    react(),
    // React Compiler auto-memoizes components/hooks. On rolldown-vite it runs
    // via @rolldown/plugin-babel + reactCompilerPreset (the `react({ babel })`
    // path doesn't apply here). Applied at the library build, so the published
    // output ships already memoized (`react/compiler-runtime`, present in the
    // React 19 peer dep) — every consumer benefits, compiler or not.
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    combinedCssPlugin(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    // Per-entry CSS so each component subpath ships only its own styles.
    cssCodeSplit: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // One entry per public subpath: the barrel (`.`) + each component
      // (`./button`). New components add an entry here.
      entry: {
        index: 'src/index.ts',
        button: 'src/components/button/index.ts',
      },
      formats: ['es' as const],
    },
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  test: {
    name: '@fmmenchi/ui',
    watch: false,
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    include: ['{src,tests}/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
  },
}));

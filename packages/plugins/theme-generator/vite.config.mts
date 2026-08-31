import { cpSync, existsSync } from 'node:fs';
import * as path from 'path';
import { defineConfig } from 'vite';

/**
 * WHY THIS PLUGIN IS BUNDLED RATHER THAN COMPILED.
 *
 * It imports `@fmmenchi/theme`, which is private and never published, so a `tsc`
 * output carrying `require('@fmmenchi/theme')` would resolve inside this
 * workspace and resolve to nothing in a consumer's install — green here, broken
 * there. The contract is INLINED instead, read through the `@fmmenchi/source`
 * export condition.
 *
 * WHAT IS NOT INLINED, and the distinction is the whole design: the CONTRACT is
 * code and travels with this plugin, while the STYLESHEET is a file and is read
 * from the `@fmmenchi/tokens` the consumer installed. So the rules this plugin
 * enforces are the ones it shipped with, and the values it instantiates are the
 * ones the consumer actually paints with.
 *
 * ENTRY POINTS ARE PATHS, NOT A BARREL. Nx loads a generator by the path in
 * `generators.json` (`./dist/generators/theme/theme`), so the output layout is
 * part of the contract with Nx and every entry below must keep its name.
 */

/** Replaces the `assets` globs the previous `@nx/js:tsc` target carried. */
function copyPluginAssets() {
  const from = path.join(import.meta.dirname, 'src');
  const to = path.join(import.meta.dirname, 'dist');
  return {
    name: 'fm-copy-plugin-assets',
    closeBundle() {
      if (!existsSync(from)) return;
      // Schemas and hand-written `.d.ts` files: everything a generator needs
      // beside its factory, and none of it something a bundler would emit.
      cpSync(from, to, {
        recursive: true,
        filter: (src: string) =>
          !src.endsWith('.ts') || src.endsWith('.d.ts') || !src.includes('.'),
      });
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [copyPluginAssets()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    ssr: true,
    lib: {
      entry: {
        index: 'src/index.ts',
        'generators/theme/theme': 'src/generators/theme/theme.ts',
        'generators/validation/validation':
          'src/generators/validation/validation.ts',
        'executors/validate/validate': 'src/executors/validate/validate.ts',
      },
      formats: ['cjs' as const],
    },
    rolldownOptions: {
      // `@fmmenchi/theme` is deliberately absent: it must be inlined.
      external: ['@nx/devkit', 'nx', 'culori', 'apca-w3', 'tslib'],
    },
  },
});

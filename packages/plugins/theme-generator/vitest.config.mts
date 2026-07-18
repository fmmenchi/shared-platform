import { defineConfig } from 'vitest/config';

// Node-environment tests for the generators (Tree-based) and the executor.
export default defineConfig({
  test: {
    name: '@fmmenchi/theme-generator',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
  },
});

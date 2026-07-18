import { defineConfig } from 'vitest/config';

// Node-environment validation of the token contract (CSS parsing + WCAG
// contrast) — no browser needed.
export default defineConfig({
  test: {
    name: '@fmmenchi/tokens',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
  },
});

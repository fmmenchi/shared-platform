import { defineConfig } from 'vitest/config';

// Node-environment: the engine reads stylesheets and measures colours, and
// never touches a DOM. The one thing that would need a browser — whether the
// emitted CSS resolves the way a browser resolves it — is asserted where the
// components are, not here.
export default defineConfig({
  test: {
    name: '@fmmenchi/theme-engine',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
  },
});

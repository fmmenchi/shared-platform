import { defineConfig } from 'vitest/config';

// The contract suite, kept OUT of `test` on purpose: it spawns two full nx runs per scenario
// against a throwaway workspace, so it is measured in seconds where the unit suite is measured in
// milliseconds. Mixing them would make the fast one feel slow and the slow one look flaky.
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/ops/ci-contract',
  test: {
    name: '@fmmenchi/ci:contract',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['contract/**/*.spec.mts'],
    // Two nx runs per scenario, cold, in a temp workspace.
    testTimeout: 300_000,
    hookTimeout: 60_000,
    // Serially: both scenarios drive nx over the same node_modules, and a shared daemon-less nx
    // run is heavy enough that racing them buys nothing.
    fileParallelism: false,
    reporters: ['default'],
  },
}));

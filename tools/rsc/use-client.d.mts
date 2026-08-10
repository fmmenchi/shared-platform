/**
 * Types for `use-client.mjs`, which is plain ESM because three vite configs in
 * three packages import it and `tools/` is not a TypeScript project.
 *
 * The bundle is typed as loosely as the plugin actually reads it — a record of
 * chunks it narrows itself — rather than by importing Rollup's `OutputBundle`.
 * The plugin has to keep working across the rolldown migration, and a type
 * pinned to one bundler's internals is the thing that breaks first.
 */
export interface UseClientPlugin {
  name: 'fm-use-client';
  /** Library builds only — Storybook's preview build reuses this array. */
  apply(
    config: { build?: { lib?: unknown } },
    env: { command: string },
  ): boolean;
  generateBundle(options: unknown, bundle: Record<string, unknown>): void;
  writeBundle(options: { dir?: string }, bundle: Record<string, unknown>): void;
}

export function useClientPlugin(): UseClientPlugin;

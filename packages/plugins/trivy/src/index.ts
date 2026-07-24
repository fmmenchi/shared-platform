export { buildTrivyArgs, buildDockerArgs } from './executors/scan/executor';
export type { ScanExecutorSchema } from './executors/scan/schema';
export { buildSbomArgs, buildSbomDockerArgs } from './executors/sbom/executor';
export type { SbomExecutorSchema } from './executors/sbom/schema';

// Inference: a `sbom` target on every publishable package. nx loads this via the
// `@fmmenchi/source` export condition (TS source, no build needed for the graph).
export { createNodesV2 } from './plugin/create-nodes';

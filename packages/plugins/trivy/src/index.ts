export { buildTrivyArgs, buildDockerArgs } from './executors/scan/executor';
export type { ScanExecutorSchema } from './executors/scan/schema';
export { buildSbomArgs, buildSbomDockerArgs } from './executors/sbom/executor';
export type { SbomExecutorSchema } from './executors/sbom/schema';

// Inference: the scan targets on the workspace root project. nx loads this via the
// `@fmmenchi/source` export condition (TS source, no build needed for the graph).
export { createNodesV2 } from './plugin/create-nodes';

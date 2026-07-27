// Inference: `announce-release` / `announce-error` targets on every publishable
// package. nx loads this via the `@fmmenchi/source` export condition (TS source,
// no build needed for the graph).
export { createNodesV2 } from './plugin/create-nodes';

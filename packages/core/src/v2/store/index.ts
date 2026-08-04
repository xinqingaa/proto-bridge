/**
 * `@proto-bridge/core/v2/store`: the Node-only `LocalFileStore` implementation
 * of `V2Store`, kept out of the isomorphic `@proto-bridge/core/v2` boundary
 * (pb-v2-spec.md "浏览器端 PBWork 不直接访问文件系统、Store 或 Playwright") so
 * bundling the Schema/resolver boundary for browser code never pulls in
 * `node:fs`.
 */
export * from './types.js';
export * from './local-file-store.js';
export * from './snapshot-builder.js';
export * from './deliver-receipt.js';
export * from './acceptance.js';
export * from './workspace-lifecycle.js';
export { generateOperationalId } from './id-generator.js';

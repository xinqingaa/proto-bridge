/**
 * ProtoBridge V2 public boundary.
 *
 * This module is intentionally isolated from the V1 export surface at
 * `@proto-bridge/core` (see `docs/plans/pb-v2-implementation-guide.md`
 * "第一批可直接开工的任务" #1): importing `@proto-bridge/core/v2` must never
 * change V1 behavior, and V1 code must never import from here.
 *
 * PBWork, CLI, MCP and Store implementations must import the Schema and
 * derived types from this boundary instead of maintaining a second copy of
 * the core V2 enums (pb-v2-spec.md "规范与可执行 Schema").
 */
export * from './contracts/index.js';
export * from './resolver/index.js';
export * as fixtures from './fixtures/index.js';

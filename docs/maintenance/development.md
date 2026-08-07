# 仓库开发规范

## 语义所有权

- Contract、状态、风险、引用、Selection、Capture、Store 和 Handoff 语义只进入 Core。
- CLI、MCP、Local Service 和 PBWork 只做入口、进程、传输与展示适配。
- Runtime 负责 authored manifest、状态准备、语义快照和 Scenario。
- Target query/validation 与 Capture 隔离。

入口需要新状态或错误时，先判断是否属于跨入口产品语义；属于则先修改 Core Schema 和测试。

## 代码边界

| 改动 | 主要路径 |
| --- | --- |
| Evidence Contract/Read Model | `packages/core/src/v2/contracts`、`evidence-read-model.ts` |
| Selection/Capture/Handoff | `packages/core/src/v2/capture` |
| Store/引用 | `packages/core/src/v2/store`、`resolver` |
| Runtime/Service Protocol | `packages/core/src/v2/runtime-contract`、`service-contract` |
| Target 公共门面 | `packages/core/src/target`（query/validation/claims/readiness/authority/review） |
| Target Flutter adapter | `packages/core/src/target/flutter-app` |
| Local Service | `packages/local-service` |
| CLI | `packages/cli` |
| MCP | `packages/mcp-server` |
| PBWork | `apps/pbwork` |

## Contract 纪律

- Schema 是机器权威，类型从 Schema 推导。
- 稳定 ID 不依赖时间、数组位置或文件路径。
- 新字段明确 optional/required、默认值和版本兼容行为。
- unknown、conflict、partial、stale 和 unsupported 不得被入口隐藏。
- 不可变对象只能追加。
- 引用必须验证 Workspace、owner 和可达性。
- 安全失败应确定性返回错误码，不能回退猜测路径或 latest。
- 语义标记门禁由 `docs/reference/semantic-authoring.md` 定义；入口不得维护第二套 role、Token slot 或严重性判断。

## 测试

| 范围 | 至少执行 |
| --- | --- |
| TypeScript | `pnpm typecheck` |
| Core | `pnpm --filter @proto-bridge/core test` |
| Local Service | `pnpm --filter @proto-bridge/local-service test` |
| CLI | `pnpm --filter @proto-bridge/cli test` |
| PBWork | `pnpm --filter @proto-bridge/pbwork typecheck`、`pnpm --filter @proto-bridge/pbwork test` |
| Runtime | `pnpm test:e2e:runtime` |
| MCP/Consumer | `pnpm test:e2e:mcp`、`pnpm test:e2e:consumer` |
| 产品闭环 | `pnpm test:e2e:evidence-slice` |
| 全部 | `pnpm verify` |

测试应覆盖成功、失败、取消、重试、不可达引用、Workspace 不匹配、防降级和旧 Snapshot 可读性。

Core Evidence 金标唯一：`packages/core/src/v2/fixtures/reference-case-slice`（`fixtures.referenceCaseSlice`）。新业务原型禁止再新增按原型分叉的 fixture 目录；细则见 [PBWork 开发规范 · 新原型与测试边界](../pbwork/development.md#9-新原型与测试边界)。

## 安全

- Local Service 和 Runtime 必须限制本地 origin。
- token 不进入 URL、日志和 Store。
- 文件操作解析明确 root，不使用宽泛删除。
- Store clean、Bundle archive 等操作使用 Core 安全边界。
- MCP 和 Target 工具保持只读。

## 生成文件

不提交：

- `.proto-bridge/store/`
- `output/`
- Flutter `build/`、`.dart_tool/`
- 本地浏览器与测试临时目录

`dist/` 是否纳入变更遵循各 package 的现有仓库策略；不要只修改 dist 而不修改 source。

## 文档

任何公共 Contract、入口、组件、Token、流程或目录变化都属于文档改动。同步矩阵见 [文档维护规范](./documentation.md)。

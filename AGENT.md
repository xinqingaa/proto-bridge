# ProtoBridge Agent 规范

面向本仓库的 AI coding agent 与开发者。

## 必读

1. 本文；
2. `docs/overview.md`、`docs/artifacts.md`、`docs/usage.md`；
3. 改 Core/CLI/MCP 时读 `skills/proto-bridge/skill.md`；
4. 做 PBWork 原型时读 `skills/pbwork-prototype/skill.md` 与 `apps/pbwork/docs`。

## 架构红线

- Core 是 Selection、Preflight、Capture、Store、Handoff 的唯一产品语义层；
- CLI、PBWork Local Service 和 MCP 只做进程/IO 适配，不复制状态词汇或引用算法；
- Evidence 必须保存 provenance、unknown、conflict、Coverage 与固定引用；
- Runtime 负责声明、准备和验证状态，Core/Playwright 负责导航与固定采集环境；
- Source Adapter 不是闭环前提；不得用源码启发式补造未观测事实；
- Target 查询与 Capture 解耦，Target 事实不得进入 Evidence；
- MCP 只读取固定 Workspace/Snapshot/revision，不猜测路径或回退 latest；
- Coding Agent 自行决定目标文件、组件、路由、状态管理与 Token；
- PBWork 新 Screen 默认执行严格 Evidence 门禁，不得加入 legacy allowlist 绕过。

## 代码地图

| 区域 | 路径 |
| --- | --- |
| Contract/Capture/Store | `packages/core/src/v2` |
| Target query/validation | `packages/core/src/target/flutter-app` |
| Local Service | `packages/local-service` |
| CLI | `packages/cli` |
| MCP | `packages/mcp-server` |
| PBWork Runtime/Capture | `apps/pbwork` |
| 原型合规例外 | `apps/pbwork/src/prototypes/evidence-policy.ts` |

## 验证

| 范围 | 至少执行 |
| --- | --- |
| TypeScript | `pnpm typecheck` |
| Core | `pnpm --filter @proto-bridge/core test` |
| CLI | `pnpm --filter @proto-bridge/cli test` |
| PBWork 原型/Contract | `pnpm --filter @proto-bridge/pbwork test`、`pnpm test:e2e:runtime` |
| MCP/Consumer | `pnpm test:e2e:mcp`、`pnpm test:e2e:consumer` |
| 完整产品 | `pnpm verify` |

不要提交 `output/`、`.proto-bridge/store/`、Flutter `build/` 或 `.dart_tool/`。

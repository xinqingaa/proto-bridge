# ProtoBridge Agent 规范

本文是修改本仓库的任务路由和硬约束。产品知识以 `docs/` 和 PBWork 手册为准，不在本文复制第二套说明。

## 先判断任务

| 任务 | Skill | 必读 |
| --- | --- | --- |
| Core、Store、Capture、CLI、MCP、Local Service、Target | `skills/proto-bridge-repository/SKILL.md` | `docs/architecture/*` 中相关文档 |
| PBWork 业务原型、Screen、Variant、导航 | `skills/pbwork-prototype-authoring/SKILL.md` | Authoring Contract、PBWork 原型手册 |
| PBWork Token、Theme、组件、共享手势 | `skills/pbwork-design-system/SKILL.md` | PBWork 开发、Token/组件手册 |
| PBWork 工作壳、Canvas、Inspector、Capture UI | `skills/pbwork-workbench/SKILL.md` | PBWork 架构与工作壳 Skill |
| 文档体系 | `skills/proto-bridge-repository/SKILL.md` | `docs/maintenance/documentation.md` |

## 架构红线

- Core 是 Contract、Selection、Preflight、Capture、Store、Handoff、状态和引用的唯一语义层。
- CLI、MCP、Local Service 和 PBWork 不复制 Core 枚举、risk、Case identity 或 active-ref 算法。
- Evidence 保留 provenance、unknown、conflict、Coverage、Issue 和固定引用。
- Runtime 声明并准备状态；Core/Playwright 固定 Case 环境并采集。
- Target query/validation 与 Capture 隔离，Target 事实不进入 Evidence。
- MCP 只读取固定 Workspace/Snapshot/revision，不猜 Store 路径，不回退 active/latest。
- Coding Agent 自行决定目标文件、组件、路由、状态管理和 Token。
- PBWork 原型只使用 PBWork Design System；形状匹配时禁止自行重造组件。
- DS 业务实例必须使用业务稳定 `inspectId`；strict required Fragment 禁止依赖默认 `ds.*`。
- 业务局部证据节点必须显式提供 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和实现所需 `data-pb-token-*`；只写 CSS Token 不构成 Evidence。
- default/critical Variant 必须具有 authored completeness boundary；不得通过例外列表绕过新工作。
- required Fragment 缺失、重复、不可见、零 bbox、非法/unknown role 或缺少所需 Token Evidence 必须阻断完整性声明。

## 代码地图

| 区域 | 路径 |
| --- | --- |
| Contract/Capture/Store | `packages/core/src/v2` |
| Target query/validation | `packages/core/src/target/flutter-app` |
| Local Service | `packages/local-service` |
| CLI | `packages/cli` |
| MCP | `packages/mcp-server` |
| PBWork Workbench | `apps/pbwork/src/workbench`、`src/capture` |
| PBWork Design System | `apps/pbwork/src/design-system` |
| PBWork Prototype/Runtime | `apps/pbwork/src/prototypes`、`src/runtime` |

## 改动同步

- 公共 Schema、入口、状态、路径、环境变量变化必须同步文档。
- 修改 PBWork Component/Token/Theme/手势时，必须主动提醒并同步对应手册、Contract、Registry 和测试。
- 修改语义标记、Role、Token Evidence 或门禁时，必须同步 `docs/reference/semantic-authoring.md`、Authoring Contract、相关 Skill、检查单和测试。
- 同一概念只在权威文档详述；其它入口使用链接。
- 主体文档只描述当前行为；历史和设计理由分别进入 `docs/history`、`docs/decisions`。

完整同步矩阵见 `docs/maintenance/documentation.md`。

## 验证

| 范围 | 至少执行 |
| --- | --- |
| 文档 | `pnpm docs:verify` |
| TypeScript | `pnpm typecheck` |
| Core | `pnpm --filter @proto-bridge/core test` |
| CLI | `pnpm --filter @proto-bridge/cli test` |
| PBWork | `pnpm --filter @proto-bridge/pbwork test`、`pnpm test:e2e:runtime` |
| MCP/Consumer | `pnpm test:e2e:mcp`、`pnpm test:e2e:consumer` |
| 完整产品 | `pnpm verify` |

不要提交 `.proto-bridge/store/`、`output/`、Flutter `build/` 或 `.dart_tool/`。

# ProtoBridge Agent 规范

本文只负责路由任务与声明仓库红线。产品知识以 `docs/` 和 PBWork 手册为准，不复制第二套说明。

## 任务路由

| 任务 | Skill | 前置 |
| --- | --- | --- |
| Core、Store、Capture、CLI、MCP、Local Service、Target、仓库文档 | `.agents/skills/proto-bridge/SKILL.md` | 相关架构文档 |
| PBWork 原型设计与制作、Token/Theme/DS、Workbench/Capture UI | `.agents/skills/pbwork/SKILL.md` | Skill 按任务加载对应 reference |
| 通用视觉方向、构图、字体和审美探索 | `.agents/skills/frontend-design/SKILL.md` | 视觉任务的真实业务 brief |
| Target 还原验收：五维对照复查与完成报告 | `.agents/skills/acceptance/SKILL.md` | 实施完成，准备 `summarize_reconstruction_review` 前 |

`frontend-design` 是仓库内 vendored 的通用视觉设计方法。PBWork 视觉任务由 `pbwork` 编排它；普通 Token、组件、Contract、Workbench 和缺陷维护不默认调用。PBWork 之外的通用产品设计不由本仓库 Skill 负责，应在目标项目中定义自己的产品工作流。

## 架构红线

- Core 是 Contract、Selection、Preflight、Capture、Store、Handoff、状态和引用的唯一语义层。
- CLI、MCP、Local Service 和 PBWork 不复制 Core 枚举、risk、Case identity 或 active-ref 算法。
- Evidence 保留 provenance、unknown、conflict、Coverage、Issue 和固定引用。
- Runtime 声明并准备状态；Core/Playwright 固定 Case 环境并采集。
- Target query/validation 与 Capture 隔离，Target 事实不进入 Evidence。
- MCP 只读取固定 Workspace/Snapshot/revision，不猜 Store 路径，不回退 active/latest。
- Coding Agent 自行决定目标文件、组件、路由、状态管理和 Token。
- PBWork 正式原型只使用 PBWork DS；形状匹配时禁止重造组件。
- PBWork DS 与正式业务原型只使用 Flex/常规文档流，禁止 CSS Grid、`grid-*` 和 `place-*`；Workbench 与独立探索不在此样式门禁内。
- 正式 DS/原型的可见设计量不得出现固定 CSS 值，具体值只存在于 Foundation/Theme。
- DS 业务实例使用稳定 `inspectId`；业务局部证据节点显式提供 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和所需 Token Evidence。
- strict Screen 的 default Variant 必须具有 authored completeness boundary；缺失、重复、不可见、零 bbox、非法 role 或缺 Token Evidence 必须阻断完整性声明。

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
| Visual Exploration Draft | `apps/pbwork/src/drafts` |
| PBWork Prototype/Runtime | `apps/pbwork/src/prototypes`、`src/runtime` |

## 同步与验证

- 公共 Schema、入口、状态、路径、环境变量变化同步权威文档。
- Component/Token/Theme/手势变化同步 Contract、Registry、手册、测试和 Target drift 状态。
- 语义标记、Role、Token Evidence 或门禁变化同步 Authoring Contract、Skill、检查单和测试。
- 同一概念只在权威文档详述；主体文档只描述当前行为，历史和设计理由分别进入 `docs/history`、`docs/decisions`。
- 按范围运行测试；文档至少执行 `pnpm docs:verify`，完整产品执行 `pnpm verify`。

不要提交 `.proto-bridge/store/`、`output/`、Flutter `build/` 或 `.dart_tool/`。

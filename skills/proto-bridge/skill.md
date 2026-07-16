---
name: proto-bridge
description: Use when modifying the proto-bridge repository itself — core capabilities, CLI/MCP, profiles, artifact contracts, docs, or regression tests. Do not use for restoring Flutter pages in YouFi; that is skills/youfi-flutter-restore.
---

# ProtoBridge 本仓库 Skill

改 **proto-bridge** 仓库时使用本 skill。  
在 YouFi（或其他真实 Flutter 目标工程）里按产物还原页面，使用 `skills/youfi-flutter-restore`。

## 必读顺序

1. `AGENT.md` — 本仓库硬约束与验证矩阵  
2. 相关产品文档：`docs/overview.md` / `docs/artifacts.md` / `docs/usage.md`  
3. 本 skill — 落点与检查单  

## 代码地图

```text
packages/core/src/
├── capabilities/                # 共享 capability facade
├── workflows/capability-first/  # reconstructPageContext 编排
├── profile/                     # restoration profile（generic / youfi）
├── source/vue3-prototype/       # source adapter
├── snapshot/                    # runtime capture / OCR / enrichers
├── target/flutter-app/          # conventions / planning / validation
├── artifacts/                   # JSON / Markdown 写出
├── config/                      # proto-bridge.config.json 解析
├── shared/                      # 证据合并与路径工具
└── types/                       # 契约类型

packages/cli/                    # 命令与终端适配
packages/mcp-server/             # MCP tools / resources / prompts
docs/                            # 产品文档（overview / artifacts / usage）
skills/proto-bridge/             # 本 skill
skills/youfi-flutter-restore/    # YouFi 消费示例（勿当本仓改法）
```

入口包只做 IO 适配；共享行为进 `packages/core`。

## 架构红线

- Capability-first：新产品逻辑进 capability / workflow，不进 CLI/MCP 深处。
- 证据分层：source 管语义架构，runtime/screenshot 管视觉事实，target 管工程表达。
- `ui-build-plan.json` 是实现蓝图；`ui-build-review.md` 只是投影。
- Restoration profile 只提供候选、别名、词表、token 映射，**不能伪造** target 扫描证据。
- 业务/项目经验进 `packages/core/src/profile/`，不要写回通用 source adapter、planner 或 theme 默认表。
- 高置信组件 / theme / i18n / routing 必须以 target repo 扫描或 `targetConventions` 为证。

## 改动落点检查单

| 改什么 | 主要落点 | 必同步 |
| --- | --- | --- |
| 编排 / 输入组合 | `workflows/capability-first` | `docs/overview.md`、`docs/usage.md` |
| 单能力行为 | `capabilities/*` + 对应 source/snapshot/target | 相关 docs；必要时 e2e |
| Profile / 业务增强 | `profile/*` | overview（边界）；youfi 回归 |
| Plan / review 字段 | `types/planning.ts`、planner、artifact writer、ui.review | **`docs/artifacts.md`** |
| Canonical / debug index | evidence types、page.merge、writers | `docs/artifacts.md` |
| CLI 参数 / 交互 | `packages/cli` | `docs/usage.md`、CLI usage 文案 |
| MCP tools / prompts | `packages/mcp-server` | `docs/usage.md` |
| Config schema | `packages/core/src/config` | `docs/usage.md`、example config |
| 示例 harness | `scripts/example*.mjs`、`examples/` | `docs/usage.md`、example README |
| 本仓工作流规范 | `AGENT.md`、本 skill | README 导航 |

## 改产物契约时

1. 先改 `packages/core/src/types/` 中的类型。  
2. 改 planner / merge / writer，保证写出形状与类型一致。  
3. 更新 `docs/artifacts.md` 字段说明。  
4. 跑 `pnpm run typecheck`；涉及 CLI/MCP 契约时跑对应 e2e。  
5. 若 review 投影依赖新字段，同步 `ui.review` 渲染逻辑。

## 改入口时

1. CLI flag 与 MCP argument 命名、语义对齐。  
2. Screenshot/OCR：**MCP 支持** `screenshotPath` / `ocrText` / `ocrBoxes`；CLI 仅 `--url` + `--capture`。文档勿写反。  
3. 更新 `docs/usage.md`。

## 回归选择

| 范围 | 命令 |
| --- | --- |
| 任意 TS | `pnpm run typecheck`（必要时 `pnpm run build`） |
| config | `pnpm run test:config` |
| CLI / artifact 写出 | `pnpm run test:e2e:cli` |
| MCP / validate | `pnpm run test:e2e:mcp` |
| 示例 | `pnpm run example` / `example:dev` |

不要提交：

```text
output/
examples/*/output/
examples/vue3-to-flutter/target-flutter/lib/main_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/app_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/routes/app_pages_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/modules/**/_proto/
Flutter build/、.dart_tool/
```

## 与 youfi skill 的分工

| 任务 | Skill |
| --- | --- |
| 改 ProtoBridge 代码、契约、文档、测试 | `proto-bridge`（本文件） |
| 在 YouFi 工程按产物还原 Flutter 页 | `youfi-flutter-restore` |

消费侧约定（nodeAudits、typography lock、公共组件优先等）写在 youfi skill 与 `docs/artifacts.md`；本 skill 只约束如何改 bridge。
